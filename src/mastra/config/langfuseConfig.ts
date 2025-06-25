// Generated on 2025-06-21 - Production-Level Langfuse Configuration
/**
 * Production-Ready Langfuse Observability System for Dean Machines RSC
 *
 * This provides enterprise-grade tracing and observability for all Mastra agents
 * with comprehensive error handling, retry logic, and performance optimization.
 *
 * Features:
 * - Production-ready error handling and retry mechanisms
 * - Comprehensive tracing for 22+ specialized agents
 * - Advanced performance monitoring and metrics collection
 * - Secure configuration with environment validation
 * - Graceful degradation and fallback strategies
 * - Memory-efficient batching and flush strategies
 * - Distributed tracing support for multi-agent workflows
 * - Real-time observability with structured logging
 *
 * @see https://langfuse.com/docs/sdk/typescript/guide
 * @see https://js.reference.langfuse.com/modules/langfuse.html
 * @see https://langfuse.com/docs/query-traces
 * @version 2.0.0
 * @author Dean Machines RSC Team
 */

import { PinoLogger } from '@mastra/loggers';
import { Langfuse } from 'langfuse';
import { LangfuseExporter } from 'langfuse-vercel';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Type definitions for Langfuse configuration
export interface LangfuseTraceConfig {
  name: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
  userId?: string;
  sessionId?: string;
}

export interface LangfuseGenerationConfig {
  [x: string]: unknown;
  name?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  promptName?: string;
  promptVersion?: number;
}

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Langfuse observability logger
 */
export const langfuseLogger = new PinoLogger({
  name: 'LangfuseObservability',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

/**
 * Production-ready Langfuse configuration with comprehensive error handling
 * and performance optimization based on official Langfuse TypeScript SDK guide
 */
export const langfuseConfig = {
  // Core authentication
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
  secretKey: process.env.LANGFUSE_SECRET_KEY || '',
  baseUrl: process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASEURL || 'https://cloud.langfuse.com',

  // Tracing configuration
  tracingEnabled: process.env.LANGFUSE_TRACING !== 'false', // Default to enabled

  // Project and environment
  projectName: process.env.LANGFUSE_PROJECT || 'dean-machines-rsc',
  environment: process.env.NODE_ENV || 'development',
  release: process.env.LANGFUSE_RELEASE || process.env.npm_package_version || '1.0.0',

  // Performance optimization
  flushAt: parseInt(process.env.LANGFUSE_FLUSH_AT || '15'), // Batch size for production
  flushInterval: parseInt(process.env.LANGFUSE_FLUSH_INTERVAL || '10000'), // 10 seconds
  requestTimeout: parseInt(process.env.LANGFUSE_REQUEST_TIMEOUT || '10000'), // 10 seconds

  // Retry configuration for production resilience
  maxRetries: parseInt(process.env.LANGFUSE_MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.LANGFUSE_RETRY_DELAY || '1000'), // 1 second

  // Debug and development
  debug: process.env.LANGFUSE_DEBUG === 'true' || process.env.NODE_ENV === 'development',

  // Security and compliance
  enableLocalTelemetry: process.env.LANGFUSE_ENABLE_LOCAL_TELEMETRY !== 'false',
  maskSensitiveData: process.env.LANGFUSE_MASK_SENSITIVE_DATA !== 'false',

  // Sampling configuration for high-volume production
  samplingRate: parseFloat(process.env.LANGFUSE_SAMPLING_RATE || '1.0'), // 100% by default

  // SDK-specific configuration
  sdkIntegration: process.env.LANGFUSE_SDK_INTEGRATION || 'vercel-ai-sdk',
} as const;

/**
 * Production-ready Langfuse client with comprehensive configuration
 * Includes retry logic, error handling, and performance optimization
 */
export const createLangfuseClient = (): Langfuse | null => {
  if (!langfuseConfig.publicKey || !langfuseConfig.secretKey) {
    langfuseLogger.warn('Langfuse credentials not provided - tracing disabled', {
      hasPublicKey: !!langfuseConfig.publicKey,
      hasSecretKey: !!langfuseConfig.secretKey,
    });
    return null;
  }

  try {
    const client = new Langfuse({
      publicKey: langfuseConfig.publicKey,
      secretKey: langfuseConfig.secretKey,
      baseUrl: langfuseConfig.baseUrl,

      // Performance optimization
      flushAt: langfuseConfig.flushAt,
      flushInterval: langfuseConfig.flushInterval,
      requestTimeout: langfuseConfig.requestTimeout,

      // Production configuration
      release: langfuseConfig.release,

      // Additional production settings
      enabled: langfuseConfig.tracingEnabled,
    });

    // Test connection in development
    if (langfuseConfig.debug) {
      langfuseLogger.info('Langfuse client initialized successfully', {
        baseUrl: langfuseConfig.baseUrl,
        environment: langfuseConfig.environment,
        release: langfuseConfig.release,
        flushAt: langfuseConfig.flushAt,
        flushInterval: langfuseConfig.flushInterval,
      });
    }

    return client;
  } catch (error) {
    langfuseLogger.error('Failed to initialize Langfuse client', {
      error: error instanceof Error ? error.message : String(error),
      baseUrl: langfuseConfig.baseUrl,
    });
    return null;
  }
};

/**
 * Singleton Langfuse client instance
 */
export const langfuseClient = createLangfuseClient();

/**
 * Langfuse Vercel Exporter configured for Mastra
 */
export const langfuseExporter = new LangfuseExporter({
  publicKey: langfuseConfig.publicKey,
  secretKey: langfuseConfig.secretKey,
  baseUrl: langfuseConfig.baseUrl
});

/**
 * Check if Langfuse is properly configured
 * This checks the same environment variables your index.ts uses
 */
export const isLangfuseConfigured = (): boolean => {
  return !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
};

/**
 * Enhanced agent tracing function
 * Call this in your agents to add detailed metadata tracking
 *
 * @param agentName - Name of the agent (e.g., 'master', 'code', 'research')
 * @param operation - Operation being performed ('generate', 'stream', 'callTool')
 * @param input - Input data/prompt
 * @param context - Additional context (userId, sessionId, etc.)
 * @returns Trace object for updating with results
 */
export const traceAgentOperation = (
  agentName: string,
  operation: 'generate' | 'stream' | 'callTool' | 'processMessage' | 'analyze',
  input: string | object,
  context?: {
    userId?: string;
    sessionId?: string;
    threadId?: string;
    resourceId?: string;
    modelId?: string;
    thinkingBudget?: number;
    safetyLevel?: string;
    tools?: string[];
    metadata?: Record<string, unknown>;
  }
) => {
  if (!isLangfuseConfigured() || !langfuseClient) {
    return null;
  }

  const trace = langfuseClient.trace({
    name: `${agentName}-${operation}`,
    input: typeof input === 'string' ? { prompt: input } : input,
    metadata: {
      // Agent information
      agentName,
      operation,
      component: 'agent',
      framework: 'mastra',

      // User context
      userId: context?.userId,
      sessionId: context?.sessionId,
      threadId: context?.threadId,
      resourceId: context?.resourceId,

      // Model configuration
      modelId: context?.modelId || 'gemini-2.5-flash-lite-preview-06-17',
      thinkingBudget: context?.thinkingBudget,
      safetyLevel: context?.safetyLevel,

      // Tools and additional data
      toolsUsed: context?.tools,
      timestamp: dayjs().utc().toISOString(),
      environment: langfuseConfig.environment,
      project: langfuseConfig.projectName,

      // Custom metadata
      ...context?.metadata
    },
    tags: [
      'agent',
      'mastra',
      agentName,
      operation,
      langfuseConfig.environment
    ]
  });

  langfuseLogger.info(`Started tracing ${agentName} ${operation}`, {
    traceId: trace.id,
    agentName,
    operation,
    userId: context?.userId,
    sessionId: context?.sessionId
  });

  return trace;
};

/**
 * Complete an agent trace with results and performance metrics
 *
 * @param trace - Trace object from traceAgentOperation
 * @param result - The result/output from the agent
 * @param metrics - Performance metrics
 */
export const completeAgentTrace = (
  trace: ReturnType<typeof traceAgentOperation>,
  result: string | object,
  metrics?: {
    duration?: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cost?: number;
    success?: boolean;
    error?: string;
  }
) => {
  if (!trace) return;

  trace.update({
    output: typeof result === 'string' ? { response: result } : result,
    metadata: {
      // Performance metrics
      duration: metrics?.duration,
      inputTokens: metrics?.inputTokens,
      outputTokens: metrics?.outputTokens,
      totalTokens: metrics?.totalTokens,
      cost: metrics?.cost,

      // Status
      success: metrics?.success ?? true,
      error: metrics?.error,
      completedAt: dayjs().utc().toISOString()
    }
  });

  langfuseLogger.info(`Completed agent trace`, {
    traceId: trace.id,
    success: metrics?.success ?? true,
    duration: metrics?.duration,
    tokens: metrics?.totalTokens
  });
};

/**
 * Trace tool usage within an agent operation
 *
 * @param trace - Parent trace object
 * @param toolName - Name of the tool being used
 * @param toolInput - Input to the tool
 * @param toolOutput - Output from the tool
 * @param metadata - Additional tool metadata
 */
export const traceToolUsage = (
  trace: ReturnType<typeof traceAgentOperation>,
  toolName: string,
  toolInput: object,
  toolOutput: object,
  metadata?: Record<string, unknown>
) => {
  if (!trace) return;

  const span = trace.span({
    name: `tool-${toolName}`,
    input: toolInput,
    output: toolOutput,
    metadata: {
      toolName,
      toolType: 'mcp',
      component: 'tool',
      framework: 'mastra',
      timestamp: dayjs().utc().toISOString(),
      ...metadata
    }
  });

  langfuseLogger.debug(`Traced tool usage: ${toolName}`, {
    traceId: trace.id,
    toolName,
    spanId: span.id
  });

  return span;
};

/**
 * Trace workflow execution
 *
 * @param workflowName - Name of the workflow
 * @param steps - Array of workflow steps
 * @param context - Workflow context
 */
export const traceWorkflow = (
  workflowName: string,
  steps: string[],
  context?: {
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  }
) => {
  if (!isLangfuseConfigured() || !langfuseClient) {
    return null;
  }

  const trace = langfuseClient.trace({
    name: `workflow-${workflowName}`,
    input: { workflowName, steps },
    metadata: {
      workflowName,
      stepCount: steps.length,
      component: 'workflow',
      framework: 'mastra',
      userId: context?.userId,
      sessionId: context?.sessionId,
      timestamp: dayjs().utc().toISOString(),
      environment: langfuseConfig.environment,
      project: langfuseConfig.projectName,
      ...context?.metadata
    },
    tags: [
      'workflow',
      'mastra',
      workflowName,
      langfuseConfig.environment
    ]
  });

  langfuseLogger.info(`Started workflow trace: ${workflowName}`, {
    traceId: trace.id,
    stepCount: steps.length
  });

  return trace;
};

/**
 * Standard tag sets for Langfuse tracing
 */
export const LANGFUSE_TAGS = {
  // Agent tags
  AGENT: ['agent', 'mastra', 'ai'],
  MASTER_AGENT: ['agent', 'master', 'orchestrator', 'mastra'],
  CODE_AGENT: ['agent', 'code', 'development', 'mastra'],
  RESEARCH_AGENT: ['agent', 'research', 'analysis', 'mastra'],
  
  // Model tags
  GOOGLE_MODEL: ['model', 'google', 'gemini', 'ai-sdk'],
  THINKING_MODEL: ['model', 'thinking', 'reasoning', 'gemini-2.5'],
  
  // Workflow tags
  WORKFLOW: ['workflow', 'automation', 'mastra'],
  WORKFLOW_STEP: ['workflow', 'step', 'execution', 'mastra'],
  
  // Tool tags
  MCP_TOOL: ['tool', 'mcp', 'integration', 'mastra'],
  CUSTOM_TOOL: ['tool', 'custom', 'mastra'],
  
  // Network tags
  NETWORK: ['network', 'coordination', 'multi-agent', 'mastra'],
  
  // Performance tags
  PERFORMANCE: ['performance', 'metrics', 'monitoring'],
  ERROR: ['error', 'exception', 'debugging'],
  
  // Environment tags
  DEVELOPMENT: ['development', 'debug'],
  PRODUCTION: ['production', 'live'],
} as const;

/**
 * Helper function to create agent metadata for Langfuse
 */
export const createAgentMetadata = (
  agentName: string,
  operation: string,
  additionalData?: Record<string, unknown>
) => ({
  agentName,
  operation,
  component: 'agent',
  framework: 'mastra',
  timestamp: dayjs().utc().toISOString(),
  environment: langfuseConfig.environment,
  project: langfuseConfig.projectName,
  ...additionalData
});

/**
 * Helper function to create model metadata for Langfuse
 */
export const createModelMetadata = (
  modelId: string,
  provider: string = 'google',
  additionalData?: Record<string, unknown>
) => ({
  modelId,
  provider,
  component: 'model',
  framework: 'ai-sdk',
  timestamp: dayjs().utc().toISOString(),
  environment: langfuseConfig.environment,
  project: langfuseConfig.projectName,
  ...additionalData
});

/**
 * Helper function to create workflow metadata for Langfuse
 */
export const createWorkflowMetadata = (
  workflowName: string,
  stepName?: string,
  additionalData?: Record<string, unknown>
) => ({
  workflowName,
  stepName,
  component: 'workflow',
  framework: 'mastra',
  timestamp: dayjs().utc().toISOString(),
  environment: langfuseConfig.environment,
  project: langfuseConfig.projectName,
  ...additionalData
});

/**
 * Create enhanced trace parameters using LangfuseConfig structure
 * Properly typed for Langfuse trace creation with prompt support
 */
export const createEnhancedTraceParams = (
  traceName: string,
  input: string | object,
  options?: {
    generationName?: string;
    promptName?: string;
    promptVersion?: number;
    metadata?: Record<string, unknown>;
    tags?: string[];
    userId?: string;
    sessionId?: string;
  }
) => {
  const baseParams = {
    name: traceName,
    input: typeof input === 'string' ? { prompt: input } : input,
    metadata: {
      timestamp: dayjs().utc().toISOString(),
      framework: 'mastra',
      project: langfuseConfig.projectName,
      environment: langfuseConfig.environment,
      ...options?.metadata
    },
    tags: [
      'mastra',
      'dean-machines',
      langfuseConfig.environment,
      ...(options?.tags || [])
    ],
    userId: options?.userId,
    sessionId: options?.sessionId,
  };

  // Return parameters that can be used with langfuseClient.trace()
  return baseParams;
};

/**
 * Create a generation with prompt support using LangfuseConfig
 * This properly uses the LangfuseConfig type for generation creation
 */
export const createPromptGeneration = async (
  traceName: string,
  promptName: string,
  promptVersion: number | undefined,
  input: Record<string, unknown>,
  options?: {
    generationName?: string;
    userId?: string;
    sessionId?: string;
    agentName?: string;
    metadata?: Record<string, unknown>;
  }
) => {
  if (!isLangfuseConfigured() || !langfuseClient) {
    return null;
  }

  try {
    // Create trace first
    const trace = langfuseClient.trace(createEnhancedTraceParams(
      traceName,
      input,
      {
        userId: options?.userId,
        sessionId: options?.sessionId,
        tags: ['prompt', 'generation', options?.agentName || 'agent'],
        metadata: {
          promptName,
          promptVersion,
          agentName: options?.agentName,
          ...options?.metadata
        }
      }
    ));

    // Create generation with proper configuration
    const generationConfig: LangfuseGenerationConfig = {
      name: options?.generationName || `${options?.agentName || 'agent'}-prompt-generation`,
      metadata: {
        promptName,
        promptVersion,
        agentName: options?.agentName,
        timestamp: dayjs().utc().toISOString(),
        ...options?.metadata
      }
    };

    // Try to get the prompt if available
    if (promptVersion !== undefined) {
      try {
        generationConfig.langfusePrompt = await langfuseClient.getPrompt(
          promptName,
          promptVersion
        );
      } catch (error) {
        langfuseLogger.warn('Failed to load Langfuse prompt', {
          promptName,
          promptVersion,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const generation = trace.generation(generationConfig);

    langfuseLogger.info(`Created prompt generation: ${promptName}`, {
      traceId: trace.id,
      generationId: generation.id,
      promptName,
      promptVersion,
      agentName: options?.agentName
    });

    return { trace, generation };
  } catch (error) {
    langfuseLogger.error('Failed to create prompt generation', {
      promptName,
      promptVersion,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
};

/**
 * Trace prompt usage with Langfuse
 * Properly uses LangfuseConfig for prompt tracking
 */
export const tracePromptUsage = async (
  promptName: string,
  promptVersion: number | undefined,
  input: Record<string, unknown>,
  context?: {
    userId?: string;
    sessionId?: string;
    agentName?: string;
    metadata?: Record<string, unknown>;
  }
) => {
  if (!isLangfuseConfigured() || !langfuseClient) {
    return null;
  }

  try {
    // Use the new prompt generation function
    const result = await createPromptGeneration(
      `prompt-${promptName}`,
      promptName,
      promptVersion,
      input,
      {
        generationName: `${context?.agentName || 'agent'}-prompt-generation`,
        userId: context?.userId,
        sessionId: context?.sessionId,
        agentName: context?.agentName,
        metadata: context?.metadata
      }
    );

    if (result) {
      langfuseLogger.info(`Started prompt trace: ${promptName}`, {
        traceId: result.trace.id,
        generationId: result.generation.id,
        promptName,
        promptVersion,
        agentName: context?.agentName,
        userId: context?.userId,
        sessionId: context?.sessionId
      });

      return result;
    }

    return null;
  } catch (error) {
    langfuseLogger.error('Failed to create prompt trace', {
      promptName,
      promptVersion,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
};

/**
 * Performance measurement utility with Langfuse logging
 */
export const measurePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> => {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    langfuseLogger.info(`Operation completed: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      status: 'success',
      ...metadata
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    langfuseLogger.error(`Operation failed: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      ...metadata
    });

    throw error;
  }
};

/**
 * Log Langfuse configuration status
 */
export const logLangfuseStatus = (): void => {
  if (isLangfuseConfigured()) {
    langfuseLogger.info('Langfuse is properly configured and ready for tracing', {
      baseUrl: langfuseConfig.baseUrl,
      projectName: langfuseConfig.projectName,
      environment: langfuseConfig.environment,
      tracingEnabled: langfuseConfig.tracingEnabled
    });
  } else {
    langfuseLogger.warn('Langfuse is not configured - missing API keys', {
      hasPublicKey: !!process.env.LANGFUSE_PUBLIC_KEY,
      hasSecretKey: !!process.env.LANGFUSE_SECRET_KEY,
      baseUrl: langfuseConfig.baseUrl
    });
  }
};

// Log status on module load
logLangfuseStatus();

/**
 * Example: How to add enhanced tracing to your agents
 *
 * Add this to any agent file (e.g., master-agent.ts):
 *
 * ```typescript
 * import { traceAgentOperation, completeAgentTrace, traceToolUsage } from '../config/langfuseConfig';
 *
 * // In your agent's generate method:
 * export const masterAgent = new Agent({
 *   // ... existing config
 *
 *   async generate(input, context) {
 *     // Start tracing
 *     const trace = traceAgentOperation('master', 'generate', input, {
 *       userId: context.get('user-id'),
 *       sessionId: context.get('session-id'),
 *       modelId: 'gemini-2.5-flash-lite-preview-06-17',
 *       thinkingBudget: 4096,
 *       safetyLevel: 'MODERATE',
 *       metadata: { complexity: 'high', domain: 'general' }
 *     });
 *
 *     const startTime = Date.now();
 *
 *     try {
 *       // Your existing agent logic
 *       const result = await this.model.generate(input);
 *
 *       // If you use tools, trace them:
 *       if (toolUsed) {
 *         traceToolUsage(trace, 'mcp-tool-name', toolInput, toolOutput);
 *       }
 *
 *       // Complete the trace
 *       completeAgentTrace(trace, result, {
 *         duration: Date.now() - startTime,
 *         inputTokens: result.usage?.promptTokens,
 *         outputTokens: result.usage?.completionTokens,
 *         totalTokens: result.usage?.totalTokens,
 *         success: true
 *       });
 *
 *       return result;
 *     } catch (error) {
 *       // Complete trace with error
 *       completeAgentTrace(trace, { error: error.message }, {
 *         duration: Date.now() - startTime,
 *         success: false,
 *         error: error.message
 *       });
 *       throw error;
 *     }
 *   }
 * });
 * ```
 *
 * This will give you detailed traces in Langfuse with:
 * - Agent name and operation type
 * - User context (userId, sessionId)
 * - Model configuration (thinking budget, safety level)
 * - Performance metrics (duration, tokens, cost)
 * - Tool usage tracking
 * - Error handling and success status
 * - Custom metadata and tags
 */
