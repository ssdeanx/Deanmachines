/**
 * Base Agent Implementation
 *
 * This module provides utility functions to create agents from configurations,
 * ensuring consistent agent creation patterns across the application,
 * including optional voice capabilities.
 */
import { Agent } from '@mastra/core/agent';
import { createLogger } from '@mastra/core/logger';

import { Tool } from '@mastra/core/tools';
import { MastraVoice } from '@mastra/core/voice';
import { sharedMemory } from '../database/index.js';
import { createResponseHook } from '../hooks/index.js';
// import { langfuse } from "../services/langfuse.js"; // Use the singleton Langfuse instance for agent observability - REMOVED for lazy loading
import { configureLangSmithTracing } from "../services/langsmith.js";
import { allToolsMap } from '../tools/index.js';
import * as evalTools from '../tools/evals.js'; // Import all eval tools
import * as MastraTypes from '../types.js'; // Import all types
import { AgentConfigError } from '../types.js'; // Import the custom error class
import { threadManager } from '../utils/thread-manager.js'; // Import thread manager
import { createVoice } from '../voice/index.js'; // Import voice factory function
import { initThreadManager } from '../database/index.js'; // Import thread manager initialization
import { BaseAgentConfig } from './config/config.types.js';
import { createModelInstance } from './config/model.utils.js';
import { z, ZodTypeAny, any as zodAny, type ZodType } from 'zod';

import type { LogLevel } from "@mastra/core/logger";
import type { Span } from '@opentelemetry/api';
const level = (process.env.LOG_LEVEL as LogLevel) || "debug";
const logger = typeof createLogger === "function"
  ? createLogger({ name: "agent-initialization", level })
  : console;

// Lazy load Langfuse instance
let langfuseInstance: typeof import("../services/langfuse.js").langfuse | null = null;

async function getLangfuse() {
  if (langfuseInstance === null) {
    try {
      // Dynamic import for lazy loading
      const { langfuse } = await import("../services/langfuse.js");
      langfuseInstance = langfuse;
    } catch (error) {
      console.error("Failed to load Langfuse:", error);
      // Depending on requirements, you might want to throw,
      // return a mock object, or just return null.
      // Returning null allows the application to continue without Langfuse.
      return null;
    }
  }
  return langfuseInstance;
}


// Type guard for tools (global scope)
interface ExecutableTool {
  id: string;
  execute: (...args: any[]) => any;
}

function isExecutableTool(tool: any): tool is ExecutableTool {
  return tool && typeof tool.execute === 'function' && typeof tool.id === 'string';
}



import {
  createCounter,
  createHistogram,
  createTracedSpan,
  flushTracing,
} from '../services/tracing';

// Metrics (module scope, but only incremented at runtime)
const agentRunCounter = createCounter('agent.run.count', 'Agent runs');
const agentErrorCounter = createCounter('agent.error.count', 'Agent errors');
const toolExecCounter = createCounter('tool.execute.count', 'Tool executions');
const memoryOpCounter = createCounter('memory.op.count', 'Memory operations');
const agentLatencyHistogram = createHistogram('agent.run.latency', 'Agent run latency (ms)');

process.on('SIGTERM', async () => {
  await flushTracing();
  process.exit(0);
});

// Configure LangSmith tracing once at startup
const langsmithClient = configureLangSmithTracing();
if (langsmithClient) {
  logger.info("LangSmith tracing enabled for Mastra agents");
}


// Extend Agent with evaluation methods
type EvalInputs = Record<string, any>;
type EvalOutputs = Record<string, any>;
type EvalsMethod = (inputs?: EvalInputs) => Promise<EvalOutputs>;
type LiveEvalsMethod = (inputs?: EvalInputs) => AsyncGenerator<{ toolId: string;[k: string]: any }>;
type ExtendedAgent = Agent & { evals: EvalsMethod; liveEvals: LiveEvalsMethod };

// Zod schema for EvalInputs
const EvalInputsSchema = z.record(z.any()).describe("Schema for evaluation inputs");


/**
 * Creates an agent instance from a configuration object and options
 *
 * @param params - Object containing configuration and agent options
 * @param params.config - The agent configuration object, potentially including voiceConfig
 * @param params.memory - The memory instance to be injected into the agent
 * @param params.onError - Optional error handler callback function
 * @returns A configured Agent instance
 * @throws AgentConfigError if config is invalid, required tools are missing, or voice init fails
 */
export function createAgentFromConfig({
  config,
  memory,
  onError,
}: {
  config: BaseAgentConfig;

  memory: typeof sharedMemory;
  onError?: (error: Error) => Promise<{ text: string }>;
}): ExtendedAgent {

  // Trace agent creation start, robust and context-enriched
  let createSpan: Span | undefined; // Explicitly type the variable
  try {
    createSpan = createTracedSpan('agent.createAgentFromConfig'); // Initialize span inside try block
    // Attach OpenTelemetry traceId if available
    let traceId: string = '';
    try {
      const currentSpan = (globalThis as any).trace?.getSpan?.((globalThis as any).context?.active?.());
      const detected = currentSpan?.spanContext().traceId;
      traceId = detected ?? '';
    } catch { }
    // Use lazy loaded langfuse for tracing creation log
    getLangfuse().then(lf => {
      if (lf) {
        lf.createTrace('agent.create', {
          metadata: {
            agentId: config.id,
            toolCount: config.toolIds.length,
            traceId,
            ...(config.usage_details && { usage_details: config.usage_details }),
            ...(config.cost_details && { cost_details: config.cost_details })
          }
        });
      }
    }).catch(err => logger.warn("Failed to log agent.create trace to Langfuse", { agentId: config.id, error: err }));
  } catch (err) {
    logger.warn("Langfuse agent.create trace failed (sync part)", { agentId: config.id, error: err });
  }

  // Validate configuration
  if (!config.id || !config.name || !(typeof config.getInstructions === 'function')) {
    const error = new AgentConfigError(
      `Invalid agent configuration for ${config.id || "unknown agent"}`
    );
    if (createSpan) createSpan.recordException(error); // Check if span is defined
    throw error;
  }

  // Resolve tools from toolIds
  const tools: Record<string, Tool<any, any>> = {};
  const missingTools: string[] = [];

  for (const toolId of config.toolIds) {
    const tool = allToolsMap.get(toolId);
    if (tool) {
      // use the toolId directly as the lookup key
      tools[toolId] = tool;
    } else {
      missingTools.push(toolId);
    }
  }

  if (missingTools.length > 0) {
    const errorMsg = `Missing required tools for agent ${config.id}: ${missingTools.join(", ")}`;
    logger.error(errorMsg);
    const error = new AgentConfigError(errorMsg);
    if (createSpan) createSpan.recordException(error); // Check if span is defined
    throw error;
  }

  // Create response hook if validation options are provided
  const responseHook = config.responseValidation
    ? createResponseHook(config.responseValidation)
    : undefined;

  // Log agent creation details
  logger.info(
    `Creating agent: ${config.id} ('${config.name}') with ${Object.keys(tools).length} tools.`
  );
  if (config.voiceConfig) {
    logger.info(` -> Including voice configuration: ${config.voiceConfig.provider}`);
  }

  let agent: any;
  try {
    // Replace direct access to `llm` with `getLLM()`
    const model = createModelInstance(config.modelConfig);

    // --- Create Voice Instance (if configured) ---
    let voiceInstance: MastraVoice | undefined = undefined;
    if (config.voiceConfig) {
      try {
        voiceInstance = createVoice(config.voiceConfig);
        logger.info(` -> Voice provider '${config.voiceConfig.provider}' created successfully for agent ${config.id}.`);
      } catch (voiceError) {
        const errorMsg = `Failed to create voice provider for agent ${config.id}: ${voiceError instanceof Error ? voiceError.message : String(voiceError)}`;
        logger.error(errorMsg);
        const error = new AgentConfigError(errorMsg);
        if (createSpan) createSpan.recordException(error); // Check if span is defined
        throw error;
      }
    }
    // --- End Voice Instance Creation ---

    // Create the Agent instance
    agent = new Agent({
      model,
      memory,
      name: config.name,
      instructions: typeof config.getInstructions === 'function' ? (config.getInstructions() as string) : '',  // Force synchronous string return
      tools,
      ...(voiceInstance ? { voice: voiceInstance } : {}),
      ...(config.stream !== undefined ? { stream: config.stream } : {}),
      ...(config.onStream ? { onStream: config.onStream } : {}),
      ...(responseHook ? { onResponse: responseHook } : {}),
      ...(onError ? { onError } : {}),
    });
  } catch (error) {
    // Catch errors during Agent instantiation as well
    const errorMsg = `Failed to create agent ${config.id}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    const wrappedError = (error instanceof AgentConfigError) ? error : new AgentConfigError(errorMsg);
    if (createSpan) createSpan.recordException(wrappedError); // Check if span is defined
    throw wrappedError;
  } finally {
    if (createSpan) createSpan.end(); // Check if span is defined before ending
  }


  // --- Agent.run override (wrap generate) ---
  // Use run if implemented, otherwise fallback to generate
  const originalRun = typeof agent.run === 'function'
    ? agent.run.bind(agent)
    : agent.generate.bind(agent);

  agent.run = async (input: any, options: Record<string, any> = {}) => {
    await initThreadManager; // ensure memory/threadManager is ready
    const agentId = agent.id ?? config.id;
    // Metrics
    agentRunCounter.add(1, { agentId });
    const start = Date.now();
    // Start traced span
    let span; // Declare variable outside try block
    try {
      span = createTracedSpan('agent.run', { attributes: { agentId } }); // Initialize span inside try block
      const result = await originalRun(input, options);
      agentLatencyHistogram.record(Date.now() - start, { agentId });
      // Use lazy loaded langfuse for success log
      getLangfuse().then(lf => {
        if (lf) {
          lf.logWithTraceContext('agent.run.success', { output: result });
        }
      }).catch(err => logger.warn("Failed to log agent.run.success to Langfuse", { agentId, error: err }));
      return result;
    } catch (err) {
      agentErrorCounter.add(1, { agentId });
      // Use lazy loaded langfuse for error log
      getLangfuse().then(lf => {
        if (lf) {
          lf.logWithTraceContext('agent.run.error', { error: String(err), agentId });
        }
      }).catch(logErr => logger.warn("Failed to log agent.run.error to Langfuse", { agentId, error: logErr }));
      if (span) span.recordException(err instanceof Error ? err : new Error(String(err))); // Check if span is defined
      throw err;
    } finally {
      if (span) span.end(); // Check if span is defined before ending
    }
  };

  // Extend agent with evals and liveEvals methods
  agent.evals = async (inputs: EvalInputs = {}) => {
    const span = createTracedSpan('agent.evals'); // Span for evals method
    try {
      const validatedInputs = EvalInputsSchema.parse(inputs); // Zod guard: validate inputs
      const evalToolList = Object.values(agent.getTools()).filter(isExecutableTool).filter(tool => tool.id.endsWith('-eval'));
      const results: Record<string, any> = {};
      for (const tool of evalToolList) {
        let toolSpan; // Declare variable outside try block
        try {
          toolSpan = createTracedSpan(`tool.execute.eval.${tool.id}`); // Initialize span inside try block
          const fn = tool.execute;
          if (typeof fn !== "function") continue; // This check is still useful
          const out = await fn({ context: validatedInputs } as any); // Use validatedInputs
          results[tool.id] = out;
          if (toolSpan) toolSpan.end(); // Check if span is defined before ending
        } catch (err: any) {
          results[tool.id] = { success: false, error: err instanceof Error ? err.message : String(err) };
          // Log tool execution error to Langfuse
          getLangfuse().then(lf => {
            if (lf) {
              lf.logWithTraceContext('tool.execute.eval.error', { toolId: tool.id, error: String(err) });
            }
          }).catch(logErr => logger.warn("Failed to log tool eval error to Langfuse", { toolId: tool.id, error: logErr }));
          if (toolSpan) toolSpan.recordException(err instanceof Error ? err : new Error(String(err))); // Record exception on tool span
          if (toolSpan) toolSpan.end(); // Check if span is defined before ending
        }
      }
      return results;
    } catch (error) {
      // Catch errors during validation or main evals logic
      getLangfuse().then(lf => {
        if (lf) {
          lf.logWithTraceContext('agent.evals.error', { error: String(error) });
        }
      }).catch(logErr => logger.warn("Failed to log agent evals error to Langfuse", { error: logErr }));
      if (span) span.recordException(error instanceof Error ? error : new Error(String(error))); // Record exception on evals span
      throw error; // Re-throw the error
    } finally {
      if (span) span.end(); // Ensure evals span is always ended
    }
  };

  agent.liveEvals = async function* (inputs: EvalInputs = {}) {
    const span = createTracedSpan('agent.liveEvals'); // Span for liveEvals method
    try {
      const validatedInputs = EvalInputsSchema.parse(inputs); // Zod guard: validate inputs
      const evalToolList = Object.values(agent.getTools()).filter(isExecutableTool).filter(tool => tool.id.endsWith('-eval'));
      for (const tool of evalToolList) {
        let toolSpan; // Declare variable outside try block
        try {
          toolSpan = createTracedSpan(`tool.execute.liveEval.${tool.id}`); // Initialize span inside try block
          const fn = tool.execute;
          if (typeof fn !== "function") continue; // This check is still useful
          const out = await fn({ context: validatedInputs } as any); // Use validatedInputs
          yield { toolId: tool.id, ...(out as object) };
          if (toolSpan) toolSpan.end(); // Check if span is defined before ending
        } catch (err: any) {
          // Yield error result for this tool
          yield { toolId: tool.id, success: false, error: err instanceof Error ? err.message : String(err) };
          // Log tool execution error to Langfuse
          getLangfuse().then(lf => {
            if (lf) {
              lf.logWithTraceContext('tool.execute.liveEval.error', { toolId: tool.id, error: String(err) });
            }
          }).catch(logErr => logger.warn("Failed to log tool liveEval error to Langfuse", { toolId: tool.id, error: logErr }));
          if (toolSpan) toolSpan.recordException(err instanceof Error ? err : new Error(String(err))); // Record exception on tool span
          if (toolSpan) toolSpan.end(); // Check if span is defined before ending
        }
      }
    } catch (error) {
      // Catch errors during validation or main liveEvals logic
      getLangfuse().then(lf => {
        if (lf) {
          lf.logWithTraceContext('agent.liveEvals.error', { error: String(error) });
        }
      }).catch(logErr => logger.warn("Failed to log agent liveEvals error to Langfuse", { error: logErr }));
      if (span) span.recordException(error instanceof Error ? error : new Error(String(error))); // Record exception on liveEvals span
      throw error; // Re-throw the error
    } finally {
      if (span) span.end(); // Ensure liveEvals span is always ended
    }
  };

  return agent as ExtendedAgent;
}

/**
 * Example: Assign or retrieve a thread for an agent's resource
 * @param resourceId - The resource ID (e.g., user ID) to associate with the thread
 * @param metadata - Optional metadata for the thread
 * @returns Promise resolving to ThreadInfo
 *
 * @example
 * const thread = await getOrCreateAgentThread("user-123", { foo: "bar" });
 */
export async function getOrCreateAgentThread(
  resourceId: string,
  metadata?: MastraTypes.CreateThreadOptions["metadata"]
): Promise<MastraTypes.ThreadInfo> {
  // Trace agent thread retrieval/creation, robust and context-enriched
  let span; // Declare variable outside try block
  try {
    span = createTracedSpan('agent.getOrCreateAgentThread'); // Initialize span inside try block
    let traceId: string = '';
    try {
      const currentSpan = (globalThis as any).trace?.getSpan?.((globalThis as any).context?.active?.());
      const detected = currentSpan?.spanContext().traceId;
      traceId = detected ?? '';
    } catch { }
    // Use lazy loaded langfuse for trace creation log
    getLangfuse().then(lf => {
      if (lf) {
        lf.createTrace('agent.getOrCreateThread', {
          metadata: {
            resourceId,
            traceId,
            ...(metadata?.usage_details ? { usage_details: metadata.usage_details } : {}),
            ...(metadata?.cost_details ? { cost_details: metadata.cost_details } : {})
          }
        });
      }
    }).catch(err => logger.warn("Failed to log agent.getOrCreateThread trace to Langfuse", { resourceId, error: err }));
  } catch (err) {
    logger.warn("Langfuse agent.getOrCreateThread trace failed (sync part)", { resourceId, error: err });
  }

  try {
    const thread = await threadManager.getOrCreateThread(resourceId, metadata);
    await threadManager.getOrCreateThread('mastra_memory');
    logger.info(`Thread assigned to resource ${resourceId}: ${thread.id}`);
    return thread;
  } catch (error) {
    logger.error(`Failed to get or create thread for resource ${resourceId}: ${error instanceof Error ? error.message : String(error)}`);
    // Use lazy loaded langfuse for error log
    getLangfuse().then(lf => {
      if (lf) {
        lf.logWithTraceContext('agent.getOrCreateThread.error', { resourceId, error: String(error) });
      }
    }).catch(logErr => logger.warn("Failed to log agent getOrCreateThread error to Langfuse", { resourceId, error: logErr }));
    if (span) span.recordException(error instanceof Error ? error : new Error(String(error))); // Check if span is defined
    throw error;
  } finally {
    if (span) span.end(); // Ensure span is always ended and check if span is defined
  }
}
