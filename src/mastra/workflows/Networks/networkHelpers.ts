/**
 * networkHelpers.ts
 * Comprehensive helper functions for AgentNetwork usage: base network creation, hooks, execution and streaming,
 * invocation utilities, resilience patterns, caching, pagination,
 * advanced helpers (RAG, typed invocation), and production-grade utilities.
 */

import { AgentNetwork, AgentNetworkConfig } from '@mastra/core/network';
import { createLogger } from '@mastra/core/logger';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import type { ZodType } from 'zod';
import fs from 'fs';
import EventEmitter from 'events';
// import { storage } from "../../database/supabase";

const tracer = trace.getTracer('mastra-network-helpers');
const logger = createLogger({ name: 'NetworkHelpers', level: 'info' });

const invocationCount = new WeakMap<any, number>();
const errorCount = new WeakMap<any, number>();

const defaultHealthTimeoutMs = 5000;
const networkEvents = new EventEmitter();

/** Base network creation and hooks **/
export function createBaseNetwork(config: AgentNetworkConfig): AgentNetwork {
  return new AgentNetwork(config);
}
export function applySharedHooks(
  network: AgentNetwork,
  hooks: { onError?: (err: Error) => any; onGenerateResponse?: (res: any) => any }
): void {
  if (hooks.onError) (network as any).onError = hooks.onError;
  if (hooks.onGenerateResponse) (network as any).onGenerateResponse = hooks.onGenerateResponse;
}

/** Instrument execution & streaming methods on a network instance */
export function instrumentNetwork(
  net: any,
  config: { wrapExecute?: boolean; wrapStream?: boolean; wrapGenerate?: boolean } = {}
): void {
  if (config.wrapExecute !== false) net.execute = (input: any, options?: any) => executeWithThread(net, input, options);
}

/** Types **/
export type ExecOptions = { threadId?: string; resourceId?: string; signal?: AbortSignal;[k: string]: any };
export type StreamOptions = ExecOptions;
export type StreamChunk = any;

/** Resilience: Circuit Breaker & Bulkhead **/
interface CircuitOptions { failureThreshold: number; recoveryTimeoutMs: number }
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF';
const circuitMap = new WeakMap<any, { state: CircuitState; failureCount: number; lastFailureTime: number; options: CircuitOptions }>();
const bulkheadLimitMap = new WeakMap<any, number>();
const bulkheadCountMap = new WeakMap<any, number>();
export interface NetworkHooks {
  onBeforeInvoke?: (input: any, options: ExecOptions) => any;
  onAfterInvoke?: (result: any, options: ExecOptions) => any;
  onErrorInvoke?: (err: Error, input: any, options: ExecOptions) => any;
}
const hookMap = new WeakMap<any, NetworkHooks>();
export function configureCircuitBreaker(net: any, opts: CircuitOptions) { circuitMap.set(net, { state: 'CLOSED', failureCount: 0, lastFailureTime: 0, options: opts }); }
export function setBulkheadLimit(net: any, lim: number) { bulkheadLimitMap.set(net, lim); }
export function registerNetworkHooks(net: any, hooks: NetworkHooks) { hookMap.set(net, hooks); }

/** Middleware plugin **/
export interface Middleware { before?: any; after?: any; onError?: any }
const globalMiddlewares: Middleware[] = [];
export function useMiddleware(mw: Middleware) { globalMiddlewares.push(mw); }
export function clearMiddleware() { globalMiddlewares.length = 0; }

/** Execution wrappers **/
export async function executeWithThread(net: any, input: any, opts: ExecOptions = {}): Promise<any> {
  invocationCount.set(net, (invocationCount.get(net) || 0) + 1);
  const span = tracer.startSpan('executeWithThread', { attributes: { net: net.name } });
  const cb = circuitMap.get(net);
  if (cb && cb.state === 'OPEN') {
    throw new Error('Circuit open');
  }
  const limit = bulkheadLimitMap.get(net);
  if (limit != null) {
    const cur = bulkheadCountMap.get(net) || 0;
    if (cur >= limit) throw new Error('Bulkhead limit');
    bulkheadCountMap.set(net, cur + 1);
  }
  for (const m of globalMiddlewares) if (m.before) ({ input, options: opts } = await m.before(net, input, opts));
  hookMap.get(net)?.onBeforeInvoke?.(input, opts);
  try {
    const res = await net.execute(input, opts);
    hookMap.get(net)?.onAfterInvoke?.(res, opts);
    for (const m of globalMiddlewares) if (m.after) await m.after(net, res, opts);
    return res;
  } catch (e: any) {
    errorCount.set(net, (errorCount.get(net) || 0) + 1);
    if (cb) { cb.failureCount++; if (cb.failureCount >= cb.options.failureThreshold) { cb.state = 'OPEN'; cb.lastFailureTime = Date.now(); } }
    hookMap.get(net)?.onErrorInvoke?.(e, input, opts);
    for (const m of globalMiddlewares) if (m.onError) await m.onError(net, e, input, opts);
    span.recordException(e); span.setStatus({ code: SpanStatusCode.ERROR, message: e.message });
    throw e;
  } finally {
    if (limit != null) bulkheadCountMap.set(net, (bulkheadCountMap.get(net) || 1) - 1);
    span.end();
  }
}

export async function* streamWithThread(net: any, input: any, opts: ExecOptions = {}): AsyncIterable<StreamChunk> {
  const span = tracer.startSpan('streamWithThread', { attributes: { net: net.name } });
  const iter = net.stream(input, opts);
  try { for await (const c of iter) yield c; }
  catch (e: any) { span.recordException(e); span.setStatus({ code: SpanStatusCode.ERROR, message: e.message }); throw e; }
  finally { span.end(); }
}

/** Invocation & Retry **/
export function invokeNetwork(net: any, inpt: any, opts: ExecOptions & { stream?: boolean } = {}) {
  if (opts.signal) return opts.stream ? abortableStream(net, inpt, opts) : abortableInvoke(net, inpt, opts);
  if (opts.stream) return streamWithThread(net, inpt, opts);
  return executeWithThread(net, inpt, opts);
}
export async function abortableInvoke(net: any, inpt: any, opts: ExecOptions = {}) {
  const { s, ...r } = opts; const p = executeWithThread(net, inpt, r); if (!s) return p; return Promise.race([p, new Promise((_, rej) => s.addEventListener('abort', () => rej(new Error('Aborted')), { once: true }))]);
}
export async function* abortableStream(net: any, inpt: any, opts: ExecOptions = {}) {
  const { s, ...r } = opts; const it = streamWithThread(net, inpt, r); if (!s) { for await (const c of it) yield c; return; } const ap = new Promise((_, rej) => s.addEventListener('abort', () => rej(new Error('Aborted')), { once: true })); const rd = it[Symbol.asyncIterator](); while (true) { const r1 = await Promise.race([rd.next(), ap]); if ((r1 as any).done) break; yield (r1 as any).value; }
}
export async function retryableInvoke(net: any, inpt: any, opts: ExecOptions = {}, mr = 3, bo = 200) { let a = 0; while (a < mr) { try { return await invokeNetwork(net, inpt, opts); } catch (e) { a++; if (a >= mr) throw e; await new Promise(r => setTimeout(r, bo * 2 ** (a - 1))); } } throw new Error('retryableInvoke exit'); }
export async function invokeWithTimeout(net: any, inpt: any, opts: ExecOptions = {}, ms: number) { return Promise.race([invokeNetwork(net, inpt, opts) as Promise<any>, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms))]); }
export async function batchInvoke(net: any, ins: any[], opts: ExecOptions = {}) { return Promise.all(ins.map(i => invokeNetwork(net, i, opts) as Promise<any>)); }
export async function timedInvoke(net: any, inpt: any, opts: ExecOptions = {}) { const s = Date.now(), r = await invokeNetwork(net, inpt, opts); logger.info(`timedInvoke ${Date.now() - s}ms`); return r; }

/** Caching & Memoization **/
export interface CacheAdapter { get(k: string): Promise<any>; set(k: string, v: any): Promise<void>; del?(k: string): Promise<void> }
const defaultCache = new Map<string, any>();
let cacheAdapter: CacheAdapter = { get: async k => defaultCache.get(k), set: async (k, v) => { defaultCache.set(k, v); }, del: async k => { defaultCache.delete(k); } };
export function configureCacheAdapter(a: CacheAdapter) { cacheAdapter = a; }
export async function clearCache(key?: string) { if (key && cacheAdapter.del) { await cacheAdapter.del(key); } else defaultCache.clear(); }
export async function memoInvoke(net: any, prompt: string, opts: ExecOptions & { cache?: boolean; cacheKey?: string } = {}) { if (!opts.cache) return invokeNetwork(net, prompt, opts); const key = opts.cacheKey ? opts.cacheKey : `${net.constructor.name}:${prompt}:${JSON.stringify(opts)}`; const c = await cacheAdapter.get(key); if (c !== undefined) return c; const r = await invokeNetwork(net, prompt, opts); await cacheAdapter.set(key, r); return r; }

/** Strongly Typed Invocation **/
export async function invokeTyped<TIn extends string | Record<string, any>, TOut>(net: any, inSch: ZodType<TIn>, outSch: ZodType<TOut>, input: unknown, opts: ExecOptions = {}) { const pi = inSch.parse(input); const r = await invokeNetwork(net, pi, { ...opts, stream: false }); return outSch.parse(r); }
export async function* streamTyped<TIn extends string | Record<string, any>, TOut>(net: any, inSch: ZodType<TIn>, outSch: ZodType<TOut>, input: unknown, opts: ExecOptions = {}) { const pi = inSch.parse(input); const it = await invokeNetwork(net, pi, { ...opts, stream: true }) as AsyncIterable<unknown>; for await (const c of it) yield outSch.parse(c); }

/** Production Helpers **/
export function sanitizePrompt(p: string) { return p.replace(/[^\x20-\x7E\n]/g, '').replace(/\s+/g, ' ').trim(); }
export function watchConfigReload(path: string, cb: (cfg: any) => void) { return fs.watch(path, (e) => e === 'change' && import(path).then(m => cb(m.default || m))); }
export async function rateLimitInvoke(net: any, inpt: any, opts: ExecOptions & { limitPerMinute: number }) { const now = Date.now(), rl = rateLimits.get(net) || { count: 0, reset: now + 60000, limit: opts.limitPerMinute }; if (now > rl.reset) rl.count = 0, rl.reset = now + 60000; rl.limit = opts.limitPerMinute; if (rl.count >= rl.limit) throw new Error('Rate limit'); rl.count++; rateLimits.set(net, rl); return invokeNetwork(net, inpt, opts); } const rateLimits = new Map<any, { count: number; reset: number; limit: number }>();
export async function modelFallbackInvoke(net: any, inpt: any, opts: ExecOptions & { fallbackModel: string }) { try { return await invokeNetwork(net, inpt, opts); } catch { const n = { ...opts, model: opts.fallbackModel }; return invokeNetwork(net, inpt, n); } }
export async function multiModelAggregateInvoke(nets: any[], inpt: any, opts: ExecOptions = {}) { return Promise.all(nets.map(n => invokeNetwork(n, inpt, opts))); }
export function sanitizeOutput(o: string) { return o.trim(); }
export function validateJsonResponse<T>(sch: ZodType<T>, r: unknown) { return sch.parse(r); }
export function detectBias(res: string): string[] {
  const iss: string[] = [];
  if (/\d{3}-\d{2}-\d{4}/.test(res)) {
    iss.push('SSN');
  }
  return iss;
}
export function estimateCost(prompt: string, cpt = 0.0001) { return prompt.split(/\s+/).length * cpt; }
export async function fallbackNetworkInvoke(list: any[], inpt: any, opts: ExecOptions = {}) { for (const n of list) { try { return await invokeNetwork(n, inpt, opts); } catch { } } throw new Error('All fail'); }
export async function auditInvoke(net: any, inpt: any, opts: ExecOptions = {}) { const s = Date.now(), r = await invokeNetwork(net, inpt, opts); logger.info('Audit', { net: net.name, input: inpt, duration: Date.now() - s, success: true }); return r; }

/** Extra **/
export const defaultRedactPatterns = [/\d{3}-\d{2}-\d{4}/g, /[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g];
export function redactSecrets(txt: string, patterns = defaultRedactPatterns) { let o = txt; for (const p of patterns) o = o.replace(p, '[REDACTED]'); return o; }

/** Simple template renderer replacing {{var}} tokens */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
  }
  return result;
}

/** Health-Check & Instrumentation Helpers **/
export async function healthCheckNetwork(
  network: any,
  timeoutMs: number = defaultHealthTimeoutMs
): Promise<{ healthy: boolean; latencyMs: number; error?: Error }> {
  const start = Date.now();
  try {
    await invokeWithTimeout(network, '', {}, timeoutMs);
    const latency = Date.now() - start;
    networkEvents.emit('health', { network, timestamp: Date.now(), healthy: true, latencyMs: latency });
    return { healthy: true, latencyMs: latency };
  } catch (error) {
    const latency = Date.now() - start;
    networkEvents.emit('health', { network, timestamp: Date.now(), healthy: false, latencyMs: latency, error: error as Error });
    return { healthy: false, latencyMs: latency, error: error as Error };
  }
}
export function scheduleHealthChecks(
  nets: any[],
  intervalMs: number = 60000,
  timeoutMs: number = defaultHealthTimeoutMs
): NodeJS.Timer {
  return setInterval(() => { for (const net of nets) healthCheckNetwork(net, timeoutMs); }, intervalMs);
}
export function onNetworkHealthChange(
  listener: (e: { network: any; timestamp: number; healthy: boolean; latencyMs: number; error?: Error }) => void
): void {
  networkEvents.on('health', listener);
}
export async function* concatStreams(
  streams: AsyncIterable<StreamChunk>[]
): AsyncIterable<StreamChunk> {
  for (const st of streams) for await (const c of st) yield c;
}
export async function streamToString(
  stream: AsyncIterable<StreamChunk>
): Promise<string> {
  let out = '';
  for await (const c of stream) out += (c as any).text ?? c;
  return out;
}

/** Introspection & Management Helpers **/
export function getCircuitState(network: any): CircuitState | undefined {
  return circuitMap.get(network)?.state;
}
export function getCircuitOptions(network: any): CircuitOptions | undefined {
  return circuitMap.get(network)?.options;
}
export function resetCircuitBreaker(network: any): void {
  circuitMap.delete(network);
}
export function getBulkheadLimit(network: any): number | undefined {
  return bulkheadLimitMap.get(network);
}
export function getBulkheadCount(network: any): number | undefined {
  return bulkheadCountMap.get(network);
}
export function listMiddlewares(): Middleware[] {
  return [...globalMiddlewares];
}
export function clearAllMiddlewares(): void {
  globalMiddlewares.length = 0;
}
export function getNetworkHooks(network: any): NetworkHooks | undefined {
  return hookMap.get(network);
}
export function clearNetworkHooks(network: any): void {
  hookMap.delete(network);
}
export function getCacheAdapter(): CacheAdapter {
  return cacheAdapter;
}
export function clearAllCache(): Promise<void> {
  return clearCache();
}
export function getNetworkInvocationCount(network: any): number {
  return invocationCount.get(network) || 0;
}
export function getNetworkErrorCount(network: any): number {
  return errorCount.get(network) || 0;
}
export function resetNetworkStats(network: any): void {
  invocationCount.delete(network);
  errorCount.delete(network);
}
export function chainNetworks(nets: any[]): (input: any) => Promise<any> {
  return async (input: any) => {
    let res = input;
    for (const net of nets) {
      res = await invokeNetwork(net, res);
    }
    return res;
  };
}
export const networkAliases = {
  exec: executeWithThread,
  stream: streamWithThread,
  invoke: invokeNetwork,
  retry: retryableInvoke,
  batch: batchInvoke,
  timed: timedInvoke,
};
