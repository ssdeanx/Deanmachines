// Generated on 2025-06-01
/**
 * Enhanced LangSmith Observability for Mastra with AI SDK Integration
 * 
 * This module provides comprehensive tracing using LangSmith's traceable decorator,
 * AI SDK telemetry integration, and enhanced prompt management.
 * 
 * @module observability
 */

import { traceable } from "langsmith/traceable";

// Re-export existing functionality
export * from './googleProvider';
import { wrapAISDKModel } from "langsmith/wrappers/vercel";
import { AISDKExporter } from "langsmith/vercel";
import { Client } from "langsmith";
import { PinoLogger } from '@mastra/loggers';
import { createMastraGoogleProvider } from './googleProvider';
import { formatISO } from 'date-fns';

/**
 * Observability logger for tracing and monitoring
 */
export const observabilityLogger = new PinoLogger({
  name: 'MastraObservability',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

/**
 * LangSmith configuration using environment variables
 */
export const langsmithConfig = {
  apiKey: process.env.LANGSMITH_API_KEY,
  project: process.env.LANGSMITH_PROJECT || 'pr-warmhearted-jewellery-74',
  endpoint: process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
  tracingEnabled: process.env.LANGSMITH_TRACING === 'true',
};

/**
 * Langfuse configuration using environment variables
 * Provides comprehensive observability and tracing for Mastra agents
 */
export const langfuseConfig = {
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
  tracingEnabled: process.env.LANGFUSE_TRACING !== 'false', // Default to true
  flushAt: parseInt(process.env.LANGFUSE_FLUSH_AT || '1'),
  flushInterval: parseInt(process.env.LANGFUSE_FLUSH_INTERVAL || '1000'),
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Telemetry configuration for Mastra
 * Automatically initializes observability when called
 */
export const createTelemetryConfig = (overrides?: Record<string, unknown>) => {
  return {
    serviceName: "mastra-ai",
    enabled: langsmithConfig.tracingEnabled,
    sampling: {
      type: 'ratio' as const,
      probability: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
    },
    export: {
      type: "custom" as const,
      exporter: new EnhancedAISDKExporter(),
    },
    ...overrides
  };
};
/**
 * Creates a traceable agent wrapper for LangSmith monitoring
 * 
 * @param agentName - Name of the agent for tracing
 * @param agentFunction - The agent function to wrap
 * @returns Traceable agent function
 */
export const createTraceableAgent = <T extends (...args: unknown[]) => unknown>(
  agentName: string,
  agentFunction: T
): T => {
  return traceable(agentFunction, {
    name: `agent:${agentName}`,
    tags: ['agent', 'mastra'],
    metadata: {
      agentType: 'mastra-agent',
      project: langsmithConfig.project,
      timestamp: formatISO(new Date())
    }
  }) as T;
};

/**
 * Creates a traceable workflow step for LangSmith monitoring
 * 
 * @param stepName - Name of the workflow step
 * @param workflowName - Name of the parent workflow
 * @param stepFunction - The step function to wrap
 * @returns Traceable step function
 */
export const createTraceableWorkflowStep = <T extends (...args: unknown[]) => unknown>(
  stepName: string,
  workflowName: string,
  stepFunction: T
): T => {
  return traceable(stepFunction, {
    name: `workflow:${workflowName}:${stepName}`,
    tags: ['workflow', 'step', 'mastra'],
    metadata: {
      workflowName,
      stepName,
      stepType: 'mastra-workflow-step',
      project: langsmithConfig.project,
      timestamp: formatISO(new Date())
    }
  }) as T;
};

/**
 * Creates a traceable thread operation wrapper for LangSmith monitoring
 * 
 * @param operationName - Name of the thread operation
 * @param threadFunction - The thread function to wrap
 * @returns Traceable thread function with enhanced metadata
 */
export const createTraceableThreadOperation = <T extends (...args: unknown[]) => unknown>(
  operationName: string,
  threadFunction: T
): T => {
  return traceable(threadFunction, {
    name: `thread:${operationName}`,
    tags: ['thread', 'conversation', 'memory', 'mastra'],
    metadata: {
      operationType: 'thread-operation',
      operationName,
      project: langsmithConfig.project,
      timestamp: formatISO(new Date())
    }
  }) as T;
};

/**
 * Performance measurement utility
 * 
 * @param operation - Name of the operation to measure
 * @param fn - Function to measure
 * @returns Result of the function with timing logged
 */
export const measureTime = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    observabilityLogger.info(`Operation completed: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      status: 'success'
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    observabilityLogger.error(`Operation failed: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
};

/**
 * Error tracking utility
 */
export class ErrorTracker {
  private static errors: Array<{
    timestamp: string;
    operation: string;
    error: string;
    metadata?: Record<string, unknown>;
  }> = [];

  /**
   * Records an error for tracking
   * 
   * @param operation - Operation where error occurred
   * @param error - The error that occurred
   * @param metadata - Additional metadata
   */
  static recordError(operation: string, error: Error | string, metadata?: Record<string, unknown>): void {
    const errorRecord = {
      timestamp: formatISO(new Date()),
      operation,
      error: error instanceof Error ? error.message : error,
      metadata
    };

    this.errors.push(errorRecord);

    // Keep only last 100 errors to prevent memory issues
    if (this.errors.length > 100) {
      this.errors.shift();
    }

    observabilityLogger.error(`Error in ${operation}`, errorRecord);
  }

  /**
   * Gets recent errors
   * 
   * @param limit - Number of recent errors to return
   * @returns Recent error records
   */
  static getRecentErrors(limit: number = 10): typeof ErrorTracker.errors {
    return this.errors.slice(-limit);
  }

  /**
   * Clears all recorded errors
   */
  static clearErrors(): void {
    this.errors = [];
  }
}

/**
 * Enhanced AI SDK Integration
 */

const logger = new PinoLogger({ name: 'enhanced-observability', level: 'info' });

// Export everything needed for LangSmith integration
export {
  traceable,
  wrapAISDKModel,
  AISDKExporter
};

// Re-export formatISO for timestamp formatting
export { formatISO } from 'date-fns';

/**
 * Enhanced AI SDK Exporter with custom configuration
 */
export class EnhancedAISDKExporter extends AISDKExporter {
  constructor(config?: {
    client?: Client;
    debug?: boolean;
    projectName?: string;
  }) {
    super(config);
    if (config?.debug) {
      logger.info('AI SDK Exporter initialized in debug mode');
    }
    // Observability/tracing system initialization logic placed here as requested
  }
  /**
   * Get enhanced settings with metadata
   */
  static getEnhancedSettings(options?: {
    runName?: string;
    runId?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }) {
    // Convert metadata to AttributeValue format for compatibility
    const convertedOptions = options ? {
      ...options,
      metadata: options.metadata ? Object.fromEntries(
        Object.entries(options.metadata).map(([key, value]) => [
          key,
          typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' 
            ? value 
            : String(value)
        ])
      ) : undefined
    } : undefined;

    const baseSettings = this.getSettings(convertedOptions);

    return {
      ...baseSettings,
      metadata: {
        ...baseSettings.metadata,
        ...convertedOptions?.metadata,
        timestamp: new Date().toISOString(),
        service: 'mastra-ai',
        langsmithConfig
      }
    };
  }
}

/**
 * Create a traced Google model with LangSmith integration
 * Works with any Google provider configuration from googleProvider.ts
 * 
 * @param modelId - Google AI model ID (e.g., 'gemini-2.0-flash-exp')
 * @param options - Comprehensive options including all Google provider options
 * @returns Wrapped Google AI model with automatic LangSmith tracing
 */
export function createTracedGoogleModel(
  modelId: string,
  options?: {
    // LangSmith tracing options
    name?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    runName?: string;

    // Google AI provider options (passed through to createMastraGoogleProvider)
    temperature?: number;
    maxContext?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    seed?: number;
    thinkingConfig?: {
      thinkingBudget?: number;
      includeThoughts?: boolean;
    };
    responseModalities?: ["TEXT", "IMAGE"];

    // Additional Google provider options
    safetySettings?: Array<{
      category: string;
      threshold: string;
    }>;
    generationConfig?: Record<string, unknown>;
    tools?: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
    toolConfig?: Record<string, unknown>;
    systemInstruction?: string;

    // Any other Google provider options
    [key: string]: unknown;
  }
) {
  // Extract LangSmith-specific options
  const { name, tags, metadata, runName, ...googleProviderOptions } = options || {};

  // Use existing provider creation with all Google options
  const baseModel = createMastraGoogleProvider(modelId, googleProviderOptions);

  if (!langsmithConfig.tracingEnabled) {
    observabilityLogger.debug('LangSmith tracing disabled, returning unwrapped model');
    return baseModel;
  }

  // Wrap with LangSmith tracing using AI SDK wrapper
  const tracedModel = wrapAISDKModel(baseModel, {
    name: name || `google-${modelId}`,
    tags: tags || ['google', 'ai-sdk', 'mastra'],
    metadata: {
      modelId,
      provider: 'google',
      framework: 'ai-sdk',
      runName,
      thinkingBudget: googleProviderOptions.thinkingConfig?.thinkingBudget,
      includeThoughts: googleProviderOptions.thinkingConfig?.includeThoughts,
      responseModalities: googleProviderOptions.responseModalities,
      ...metadata,
    }
  });

  logger.info(`Created traced Google model: ${modelId}`, {
    name: name || `google-${modelId}`,
    tags: tags || ['google', 'ai-sdk', 'mastra'],
    temperature: googleProviderOptions.temperature,
    thinkingBudget: googleProviderOptions.thinkingConfig?.thinkingBudget
  });

  return tracedModel;

}

/**
 * Create a traceable function with LangSmith integration
 */export function createTraceableFunction<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: {
    name: string;
    runType?: 'llm' | 'chain' | 'tool' | 'retriever' | 'embedding' | 'parser';
    tags?: string[];
    metadata?: Record<string, unknown>;
  }
): T {
  return traceable(fn, {
    name: options.name,
    run_type: options.runType || 'chain',
    tags: options.tags,
    metadata: {
      framework: 'mastra',
      ...options.metadata
    }
  }) as T;
}
/**
 * 
 * Trace agent operations with enhanced context
 */
export function traceAgentOperation<T extends (...args: unknown[]) => unknown>(
  operation: T,
  agentName: string,
  operationType: 'generate' | 'callTool' | 'processMessage' | 'search' | 'analyze'
): T {
  return createTraceableFunction(operation, {
    name: `${agentName}-${operationType}`,
    runType: operationType === 'generate' ? 'llm' : 'chain',
    tags: ['agent', agentName, operationType],
    metadata: {
      agentName,
      operationType,
      component: 'agent'
    }
  });
}

/**
 * Trace network operations
 */
export function traceNetworkOperation<T extends (...args: unknown[]) => unknown>(
  operation: T,
  networkName: string,
  operationType: 'route' | 'coordinate' | 'execute' | 'analyze'
): T {
  // Create the traceable function ONCE, preserving the original context
  const traced = createTraceableFunction(operation, {
    name: `${networkName}-${operationType}`,
    runType: 'chain',
    tags: ['network', networkName, operationType],
    metadata: {
      networkName,
      operationType,
      component: 'network'
    }
  });
  // Return a wrapper that preserves 'this'
  return function (this: unknown, ...args: unknown[]) {
    return traced.apply(this, args);
  } as T;
}

/**
 * Trace RAG operations with detailed context
 */
export function traceRAGOperation<T extends (...args: unknown[]) => unknown>(
  operation: T,
  operationType: 'vectorSearch' | 'graphSearch' | 'synthesis' | 'analysis'
): T {
  return createTraceableFunction(operation, {
    name: `rag-${operationType}`,
    runType: operationType.includes('Search') ? 'retriever' : 'chain',
    tags: ['rag', operationType, 'knowledge'],
    metadata: {
      operationType,
      component: 'rag'
    }
  });
}

/**
 * Enhanced observability utilities
 */
export const ObservabilityUtils = {
  /**
   * Get AI SDK telemetry settings with project context
   */
  getAISDKSettings(options?: {
    runName?: string;
    agentName?: string;
    operationType?: string;
    metadata?: Record<string, unknown>;
  }) {
    return EnhancedAISDKExporter.getEnhancedSettings({
      runName: options?.runName ||
        (options?.agentName && options?.operationType) ?
        `${options.agentName}-${options.operationType}` :
        undefined,
      metadata: {
        ...options?.metadata,
        agentName: options?.agentName,
        operationType: options?.operationType
      },
      tags: [
        ...(options?.agentName ? [options.agentName] : []),
        ...(options?.operationType ? [options.operationType] : [])
      ]
    });
  },

  /**
   * Create instrumentation for agent methods
   */
  instrumentAgent<T extends {
    generate?: (...args: unknown[]) => unknown;
    callTool?: (...args: unknown[]) => unknown;
  }>(agent: T, agentName: string): T {
    if (agent.generate) {
      agent.generate = traceAgentOperation(agent.generate.bind(agent), agentName, 'generate');
    }
    if (agent.callTool) {
      agent.callTool = traceAgentOperation(agent.callTool.bind(agent), agentName, 'callTool');
    }
    return agent;
  },

  /**
   * Create instrumentation for network methods
   */
  instrumentNetwork(network: { generate?: (...args: unknown[]) => unknown; route?: (...args: unknown[]) => unknown }, networkName: string) {
    if (network.generate) {
      network.generate = traceNetworkOperation(network.generate.bind(network), networkName, 'execute');
    }
    if (network.route) {
      network.route = traceNetworkOperation(network.route.bind(network), networkName, 'route');
    }
    return network;
  }};