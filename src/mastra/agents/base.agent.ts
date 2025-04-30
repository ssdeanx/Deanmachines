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
import { langfuse } from "../services/langfuse.js"; // Use the singleton Langfuse instance for agent observability
import { configureLangSmithTracing } from "../services/langsmith.js";
import { allToolsMap } from '../tools/index.js';
import * as evalTools from '../tools/evals.js'; // Import all eval tools
import * as MastraTypes from '../types.js'; // Import all types
import { AgentConfigError } from '../types.js'; // Import the custom error class
import { threadManager } from '../utils/thread-manager.js'; // Import thread manager
import { createVoice } from '../voice/index.js'; // Import voice factory function 
import { initThreadManager } from '../database/index.js'; // Import thread manager initialization
import {
  BaseAgentConfig,
  createModelInstance,
} from './config/config.types.js';
import { z, ZodTypeAny, any as zodAny, type ZodType } from 'zod';
import { getTracer } from "../services/tracing.js";
import type { LogLevel } from "@mastra/core/logger";
const level = (process.env.LOG_LEVEL as LogLevel) || "debug";
const logger = typeof createLogger === "function"
  ? createLogger({ name: "agent-initialization", level })
  : console;

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
  try {
    // Attach OpenTelemetry traceId if available
    let traceId: string = '';
    try {
      const currentSpan = (globalThis as any).trace?.getSpan?.((globalThis as any).context?.active?.());
      const detected = currentSpan?.spanContext().traceId;
      traceId = detected ?? '';
    } catch { }
    langfuse.createTrace('agent.create', {
      metadata: {
        agentId: config.id,
        toolCount: config.toolIds.length,
        traceId,
        ...(config.usage_details && { usage_details: config.usage_details }),
        ...(config.cost_details && { cost_details: config.cost_details })
      }
    });
  } catch (err) {
    logger.warn("Langfuse agent.create trace failed", { agentId: config.id, error: err });
  }

  // Validate configuration
  if (!config.id || !config.name || !config.instructions) {
    throw new AgentConfigError(
      `Invalid agent configuration for ${config.id || "unknown agent"}`
    );
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
    throw new AgentConfigError(errorMsg);
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
    // Optionally record an agent‐creation run
    // import createLangSmithRun above if you want to track runs
    // await createLangSmithRun(`agent-create:${config.id}`, ["agent-init"]);
    // Create model instance
    const model = createModelInstance(config.modelConfig);

    // --- Create Voice Instance (if configured) ---
    let voiceInstance: MastraVoice | undefined = undefined;
    if (config.voiceConfig) {
      try {
        // Use the factory from voice/index.ts
        voiceInstance = createVoice(config.voiceConfig);
        logger.info(` -> Voice provider '${config.voiceConfig.provider}' created successfully for agent ${config.id}.`);
        // Note: The createGoogleVoice (and potentially others) function already
        // adds tools and instructions to the voice instance itself.
      } catch (voiceError) {
        const errorMsg = `Failed to create voice provider for agent ${config.id}: ${voiceError instanceof Error ? voiceError.message : String(voiceError)}`;
        logger.error(errorMsg);
        // Decide whether to throw or continue without voice. Throwing is safer.
        throw new AgentConfigError(errorMsg);
      }
    }
    // --- End Voice Instance Creation ---

    // Create the Agent instance
    agent = new Agent({
      model,
      memory,
      name: config.name,
      instructions: config.instructions,
      tools,
      ...(voiceInstance ? { voice: voiceInstance } : {}), // Conditionally add voice instance
      ...(config.stream !== undefined ? { stream: config.stream } : {}),
      ...(config.onStream ? { onStream: config.onStream } : {}),
      ...(responseHook ? { onResponse: responseHook } : {}),
      ...(onError ? { onError } : {}),
    });
  } catch (error) {
    // Catch errors during Agent instantiation as well
    const errorMsg = `Failed to create agent ${config.id}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    // Ensure the original error type is preserved if possible, or wrap if needed
    if (error instanceof AgentConfigError) throw error;
    throw new AgentConfigError(errorMsg);
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
    const span = createTracedSpan('agent.run', { attributes: { agentId } });
    try {
      const result = await originalRun(input, options);
      agentLatencyHistogram.record(Date.now() - start, { agentId });
      langfuse.logWithTraceContext('agent.run.success', { output: result });
      return result;
    } catch (err) {
      agentErrorCounter.add(1, { agentId });
      langfuse.logWithTraceContext('agent.run.error', { error: String(err) });
      throw err;
    } finally {
      if (span) span.end();
    }
  };

  // Extend agent with evals and liveEvals methods
  agent.evals = async (inputs: EvalInputs = {}) => {
    // TODO: Zod guard: validate inputs with EvalInputsSchema.parse(inputs);
    const evalToolList = Object.values(agent.tools).filter(isExecutableTool).filter(tool => tool.id.endsWith('-eval'));
    const results: Record<string, any> = {};
    for (const tool of evalToolList) {
      const fn = tool.execute;
      if (typeof fn !== "function") continue;
      try {
        const out = await fn({ context: inputs } as any);
        results[tool.id] = out;
      } catch (err: any) {
        results[tool.id] = { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
    return results;
  };
  agent.liveEvals = async function* (inputs: EvalInputs = {}) {
    // TODO: Zod guard: validate inputs with EvalInputsSchema.parse(inputs);
    const evalToolList = Object.values(agent.tools).filter(isExecutableTool).filter(tool => tool.id.endsWith('-eval'));
    for (const tool of evalToolList) {
      const fn = tool.execute;
      if (typeof fn !== "function") continue;
      try {
        const out = await fn({ context: inputs } as any);
        yield { toolId: tool.id, ...(out as object) };
      } catch (err: any) {
        yield { toolId: tool.id, success: false, error: err instanceof Error ? err.message : String(err) };
      }
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
  try {
    let traceId: string = '';
    try {
      const currentSpan = (globalThis as any).trace?.getSpan?.((globalThis as any).context?.active?.());
      const detected = currentSpan?.spanContext().traceId;
      traceId = detected ?? '';
    } catch { }
    langfuse.createTrace('agent.getOrCreateThread', {
      metadata: {
        resourceId,
        traceId,
        ...(metadata?.usage_details ? { usage_details: metadata.usage_details } : {}),
        ...(metadata?.cost_details ? { cost_details: metadata.cost_details } : {})
      }
    });
  } catch (err) {
    logger.warn("Langfuse agent.getOrCreateThread trace failed", { resourceId, error: err });
  }

  try {
    const thread = await threadManager.getOrCreateThread(resourceId, metadata);
    await threadManager.getOrCreateThread('mastra_memory');
    logger.info(`Thread assigned to resource ${resourceId}: ${thread.id}`);
    return thread;
  } catch (error) {
    logger.error(`Failed to get or create thread for resource ${resourceId}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
