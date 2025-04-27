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
import { sharedMemory } from '../database/index';
import { createResponseHook } from '../hooks';
import { langfuse } from "../services/langfuse"; // Use the singleton Langfuse instance for agent observability
import { configureLangSmithTracing } from "../services/langsmith";
import { allToolsMap } from '../tools';
import * as evalTools from '../tools/evals';
import * as MastraTypes from '../types';
import { AgentConfigError } from '../types';
import { threadManager } from '../utils/thread-manager';
import { createVoice } from '../voice';
import {
  BaseAgentConfig,
  createModelInstance,
} from './config';


const logger = createLogger({ name: "agent-initialization", level: "debug" });// Configure logger for agent initialization


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
    let traceId: string | undefined;
    try {
      const currentSpan = (globalThis as any).trace?.getSpan?.((globalThis as any).context?.active?.());
      traceId = currentSpan?.spanContext().traceId;
    } catch { }
    langfuse.createTrace('agent.create', {
      metadata: {
        agentId: config.id,
        toolCount: config.toolIds.length,
        ...(traceId && { traceId }),
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
    const agent: any = new Agent({
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

    // Attach evaluation methods
    const evalToolList = Object.values(evalTools) as any[];
    agent.evals = async (inputs: EvalInputs = {}) => {
      const results: EvalOutputs = {};
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
  } catch (error) {
    // Catch errors during Agent instantiation as well
    const errorMsg = `Failed to create agent ${config.id}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    // Ensure the original error type is preserved if possible, or wrap if needed
    if (error instanceof AgentConfigError) throw error;
    throw new AgentConfigError(errorMsg);
  }
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
    let traceId: string | undefined;
    try {
      const currentSpan = (globalThis as any).trace?.getSpan?.((globalThis as any).context?.active?.());
      traceId = currentSpan?.spanContext().traceId;
    } catch { }
    langfuse.createTrace('agent.getOrCreateThread', {
      metadata: {
        resourceId,
        ...(traceId ? { traceId } : {}),
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
