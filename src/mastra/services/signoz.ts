/**
 * SigNoz Integration Service for Mastra
 *
 * This module provides OpenTelemetry instrumentation for the DeanMachines AI platform
 * specifically configured to work with SigNoz as the observability backend.
 *
 * IMPORTANT: Call initSigNoz() as early as possible in your application entry point,
 * BEFORE requiring/importing other modules like http, express, etc.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { SemanticResourceAttributes, SemanticAttributes } from '@opentelemetry/semantic-conventions';
import * as api from '@opentelemetry/api';
import { env } from 'process';
import { createLogger } from '@mastra/core/logger';
import { SpanKind } from '@opentelemetry/api';

// import the *type* and factory *value* from types.ts
import type { ResourceType } from './types';
import { resourceFromAttributes } from './types';
import type { OtelConfig, TokenInfo } from './types';
import { SpanStatusCode, OTelAttributeNames } from './types';

const logger = createLogger({ name: 'signoz-service', level: 'info' });
let sdk: NodeSDK | null = null;
let tracer: api.Tracer | null = null;
let meterProvider: api.MeterProvider | null = null;

/**
 * Initialize OpenTelemetry tracing and metrics for SigNoz using NodeSDK.
 * Call this function ONCE, as early as possible in your application's startup sequence.
 *
 * @param config - Mastra telemetry configuration (optional, reads from env vars)
 * @returns The configured tracer and meter provider for creating spans and metrics, or null if disabled/failed
 */
export function initSigNoz(config: OtelConfig = {}): { tracer: api.Tracer | null; meterProvider: api.MeterProvider | null } {
  const isEnabled = env.MASTRA_TELEMETRY_ENABLED?.toLowerCase() === 'false'
    ? false
    : (config.enabled !== false);

  if (!isEnabled) {
    logger.info('SigNoz tracing is disabled via config or MASTRA_TELEMETRY_ENABLED=false.');
    return { tracer: null, meterProvider: null };
  }

  if (sdk) {
    logger.warn('SigNoz tracing already initialized.');
    return { tracer: getTracer(), meterProvider: getMeterProvider() };
  }

  try {
    const serviceName = env.MASTRA_SERVICE_NAME || config.serviceName || 'deanmachines-ai-mastra';

    // Normalize export config: handle single or array export
    const singleExport = Array.isArray(config.export) ? config.export[0] : config.export;
    const exporter = config.exporters?.[0] ?? singleExport;
    const tracesEndpoint = exporter?.endpoint || env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/';
    const metricsEndpoint = env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || tracesEndpoint.replace('/v1/traces', '/v1/metrics');
    const headers = exporter?.headers || {};

    logger.info(`Initializing SigNoz telemetry for service: ${serviceName}`, {
      tracesEndpoint,
      metricsEndpoint,
      env: env.NODE_ENV || 'development'
    });

    const resource: ResourceType = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.NODE_ENV || 'development',
      [SemanticResourceAttributes.SERVICE_VERSION]: env.npm_package_version,
      [SemanticResourceAttributes.HOST_NAME]: env.HOSTNAME || env.COMPUTERNAME,
      [SemanticResourceAttributes.OS_TYPE]: process.platform,
    });

    logger.info(`Initializing SigNoz: traces→${tracesEndpoint}, metrics→${metricsEndpoint}`);
    sdk = new NodeSDK({
      resource,
      traceExporter: new OTLPTraceExporter({ url: tracesEndpoint, headers }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: metricsEndpoint, headers }),
        exportIntervalMillis: exporter?.metricsInterval ?? 60000
      }),
      instrumentations: [getNodeAutoInstrumentations()],
      ...(env.NODE_ENV !== 'production' && {
        spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter())
      })
    });

    sdk.start();
    logger.info('SigNoz NodeSDK started');
    tracer = api.trace.getTracer(`${serviceName}-tracer`);
    meterProvider = api.metrics.getMeterProvider();

    process.on('SIGTERM', () => {
      shutdownSigNoz()
        .then(() => logger.info('SigNoz shutdown complete on SIGTERM.'))
        .catch((err) => logger.error('Error shutting down SigNoz on SIGTERM:', err))
        .finally(() => process.exit(0));
    });
    process.on('SIGINT', () => {
      shutdownSigNoz()
        .then(() => logger.info('SigNoz shutdown complete on SIGINT.'))
        .catch((err) => logger.error('Error shutting down SigNoz on SIGINT:', err))
        .finally(() => process.exit(0));
    });

    return { tracer, meterProvider };

  } catch (error) {
    logger.error('Failed to initialize SigNoz NodeSDK', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    sdk = null;
    return { tracer: null, meterProvider: null };
  }
}

/**
 * Get the current tracer instance. Throws error if not initialized.
 */
export function getTracer(): api.Tracer {
  if (!tracer) {
    throw new Error('SigNoz tracing has not been initialized successfully. Call initSigNoz first.');
  }
  return tracer;
}

/**
 * Get the current meter provider instance. Throws error if not initialized.
 */
export function getMeterProvider(): api.MeterProvider {
  if (!meterProvider) {
    throw new Error('SigNoz metrics has not been initialized successfully. Call initSigNoz first.');
  }
  return meterProvider;
}

/**
 * Create a new span for monitoring AI operations
 *
 * @param name - Name of the operation
 * @param attributes - Additional attributes to include
 * @param options - Optional span options (kind, links, etc.)
 * @returns The created span
 */
export function createAISpan(
  name: string,
  attributes: api.Attributes = {},
  options: api.SpanOptions = {}
): api.Span {
  try {
    const currentTracer = getTracer();
    // GenAI semantic instrumentation
    return currentTracer.startSpan(name, {
      kind: SpanKind.CLIENT,
      attributes: {
        'gen_ai.system': 'signoz',
        'gen_ai.operation.name': name,
        ...attributes
      },
      ...options
    });
  } catch (error) {
    logger.warn(`Failed to create span '${name}' - tracing likely not initialized.`, { error: (error as Error).message });
    return api.trace.wrapSpanContext(api.INVALID_SPAN_CONTEXT);
  }
}

/**
 * Record LLM usage information on a span
 *
 * @param span - The span to record metrics on
 * @param tokenInfo - Token usage information
 * @param latencyMs - Latency in milliseconds
 */
export function recordLlmMetrics(
  span: api.Span,
  tokenInfo?: TokenInfo,
  latencyMs?: number
): void {
  if (!span || !span.isRecording()) return;

  try {
    // GenAI semantic metrics
    if (tokenInfo?.promptTokens !== undefined) {
      span.setAttribute('gen_ai.usage.input_tokens', tokenInfo.promptTokens);
    }
    if (tokenInfo?.completionTokens !== undefined) {
      span.setAttribute('gen_ai.usage.output_tokens', tokenInfo.completionTokens);
    }
    if (latencyMs !== undefined) {
      span.setAttribute('gen_ai.usage.latency_ms', latencyMs);
    }
  } catch (error) {
    logger.warn('Failed to record LLM metrics on span', { error: (error as Error).message });
  }
}

/**
 * Record completion of an AI operation with metrics and status
 *
 * @param span - The active span
 * @param metrics - Performance metrics and status to record
 */
export function recordMetrics(
  span: api.Span,
  metrics: {
    tokens?: number;
    latencyMs?: number;
    status?: 'success' | 'error';
    errorMessage?: string;
    [key: string]: string | number | boolean | undefined;
  }
): void {
  if (!span || !span.isRecording()) return;
  // GenAI semantic metrics annotation
  span.setAttribute('gen_ai.system', 'signoz');
  if (metrics.tokens !== undefined) {
    span.setAttribute('gen_ai.usage.output_tokens', metrics.tokens as number);
  }
  try {
    const { status, errorMessage, latencyMs, tokens, ...extraAttributes } = metrics;

    if (tokens !== undefined) {
      span.setAttribute(OTelAttributeNames.TOTAL_TOKENS, tokens);
    }
    if (latencyMs !== undefined) {
      span.setAttribute(OTelAttributeNames.LATENCY_MS, latencyMs);
    }

    for (const [key, value] of Object.entries(extraAttributes)) {
      if (value !== undefined) {
        span.setAttribute(key, value);
      }
    }

    if (status === 'error') {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage || 'Operation failed'
      });
      if (errorMessage) {
        span.recordException({ name: 'OperationError', message: errorMessage });
      }
    } else {
      span.setStatus({
        code: SpanStatusCode.OK
      });
    }
  } catch (error) {
    logger.warn('Failed to record metrics on span', { error: (error as Error).message });
  }
}

/**
 * Create a span for tracing an HTTP request, conforming more closely to semantic conventions.
 *
 * @param method - HTTP method (e.g., 'GET', 'POST')
 * @param url - Request URL string
 * @param options - Optional span options and attributes
 * @returns The created span
 */
export function createHttpSpan(
  method: string,
  url: string,
  options: api.SpanOptions & { attributes?: api.Attributes } = {}
): api.Span {
  try {
    const currentTracer = getTracer();
    const { attributes = {}, ...spanOptions } = options;
    const parsedUrl = new URL(url);

    return currentTracer.startSpan(`GenAI HTTP ${method.toUpperCase()}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'gen_ai.system': 'signoz',
        'gen_ai.operation.name': 'http_request',
        [SemanticAttributes.HTTP_METHOD]: method.toUpperCase(),
        [SemanticAttributes.HTTP_URL]: url,
        [SemanticAttributes.NET_PEER_NAME]: parsedUrl.hostname,
        [SemanticAttributes.NET_PEER_PORT]: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        ...attributes
      },
      ...spanOptions
    });
  } catch (error) {
    logger.warn(`Failed to create HTTP span for ${method} ${url}`, { error: (error as Error).message });
    return api.trace.wrapSpanContext(api.INVALID_SPAN_CONTEXT);
  }
}

/**
 * Gracefully shut down the SigNoz NodeSDK.
 * Call this before your application exits.
 */
export async function shutdownSigNoz(): Promise<void> {
  if (sdk) {
    try {
      logger.info('Shutting down SigNoz NodeSDK...');
      await sdk.shutdown();
      logger.info('SigNoz NodeSDK shutdown complete.');
      sdk = null;
      tracer = null;
      meterProvider = null;
    } catch (error) {
      logger.error('Error shutting down SigNoz NodeSDK', { error });
    }
  } else {
    logger.info('SigNoz NodeSDK not initialized or already shut down.');
  }
}

export type { OtelConfig, TokenInfo } from './types';
export { SpanStatusCode, OTelAttributeNames } from './types';
export type Counter = api.Counter;
export type Histogram = api.Histogram;
export default {
  init: initSigNoz,
  getTracer,
  getMeterProvider,
  createSpan: createAISpan,
  createHttpSpan,
  recordLlmMetrics,
  recordMetrics,
  shutdown: shutdownSigNoz
};