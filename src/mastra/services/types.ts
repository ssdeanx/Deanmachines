/**
 * OpenTelemetry Types for Mastra Services
 * 
 * This file contains specialized type definitions for OpenTelemetry integration
 * used by the DeanMachines service implementations.
 */
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Import types and values from OpenTelemetry packages
import * as api from '@opentelemetry/api';
import { Resource as OTResource, resourceFromAttributes, detectResources } from '@opentelemetry/resources';
import type { 
  SimpleSpanProcessor,
  BatchSpanProcessor,
  SpanProcessor
} from '@opentelemetry/sdk-trace-base';
import type { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import type { 
  OTLPTraceExporter 
} from '@opentelemetry/exporter-trace-otlp-http';
import type { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

// Import LangSmith types
import type { Client as LangSmithClient } from 'langsmith';

// Export core OpenTelemetry types for use in the application
export type { 
  SimpleSpanProcessor, 
  BatchSpanProcessor,
  SpanProcessor,
  NodeTracerProvider,
  OTLPTraceExporter,
  LangSmithClient,
  OTResource as ResourceType
};

// Export resource creation functions and the Resource class
export { resourceFromAttributes, detectResources };

// Export SpanStatusCode directly from the API
export const { SpanStatusCode } = api;

// Export individual semantic attribute constants for minification
export const SEM_RES_ATTR_SERVICE_NAME = SemanticResourceAttributes.SERVICE_NAME;
export const SEM_RES_ATTR_SERVICE_VERSION = SemanticResourceAttributes.SERVICE_VERSION;
export const SEM_RES_ATTR_DEPLOYMENT_ENV = SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT;
export const SEM_RES_ATTR_SERVICE_INSTANCE_ID = SemanticResourceAttributes.SERVICE_INSTANCE_ID;
export const SEM_RES_ATTR_SERVICE_NAMESPACE = SemanticResourceAttributes.SERVICE_NAMESPACE;

// Exporting PeriodicExportingMetricReader as IMetricReader for compatibility with tracing.ts
export type IMetricReader = PeriodicExportingMetricReader;

/**
 * LangSmith configuration options
 */
export interface LangSmithConfig {
  /** API key for LangSmith access */
  apiKey?: string;
  /** LangSmith API endpoint URL */
  endpoint?: string;
  /** Project name for organizing traces */
  projectName?: string;
  /** Whether to enable tracing */
  enabled?: boolean;
}

/**
 * Mastra-compatible telemetry configuration
 * Based on https://mastra.ai/reference/client-js/telemetry
 */
export interface OtelConfig {
  /** Name to identify your service in traces */
  serviceName?: string;
 
  /** Enable/disable telemetry (defaults to true) */
  enabled?: boolean;
 
  /** Control how many traces are sampled */
  sampling?: {
    type: "ratio" | "always_on" | "always_off" | "parent_based";
    probability?: number; // For ratio sampling
    root?: {
      probability: number; // For parent_based sampling
    };
  };
 
  /** Where to send telemetry data */
  export?: {
    type: "otlp" | "console";
    endpoint?: string;
    headers?: Record<string, string>;
    metricsInterval?: number;
  } | Array<{
    type: "otlp" | "console";
    endpoint?: string;
    headers?: Record<string, string>;
    metricsInterval?: number;
  }>;
  /** Alias for multiple exporter configurations */
  exporters?: Array<{
    type: "otlp" | "console";
    endpoint?: string;
    headers?: Record<string, string>;
    metricsInterval?: number;
  }>;
}

/** Valid types for telemetry attribute values */
export type AttributeValue = 
  | string 
  | number 
  | boolean 
  | Array<string | number | boolean> 
  | null;

/**
 * OpenTelemetry initialization options for configuring tracing
 */
export interface OTelInitOptions {
  /** Service name for traces (e.g., 'deanmachines-ai') */
  serviceName: string;
  /** Service version (e.g., '1.0.0') */
  serviceVersion?: string;
  /** Deployment environment (e.g., 'production', 'development') */
  environment?: string;
  /** Whether to enable tracing (default: true) */
  enabled?: boolean;
  /** OTLP exporter endpoint (defaults to env.OTEL_EXPORTER_OTLP_ENDPOINT) */
  endpoint?: string;
  /** Headers for OTLP exporter (defaults to env.OTEL_EXPORTER_OTLP_HEADERS) */
  headers?: Record<string, string>;
  /** Whether to also send traces to console (default: false) */
  enableConsole?: boolean;
  /** Sampling rate (0-1) for traces (default: 1) */
  samplingRatio?: number;
  /** Whether to batch spans before sending (improves performance, default: true) */
  batchSpans?: boolean;
}

/**
 * OpenTelemetry resource attributes interface
 * Compatible with SDK 2.0's ResourceAttributes type
 */
export interface ResourceAttributes {
  /** Service name attribute */
  [SEM_RES_ATTR_SERVICE_NAME]?: string;
  /** Service version attribute */
  [SEM_RES_ATTR_SERVICE_VERSION]?: string;
  /** Service instance ID attribute */
  [SEM_RES_ATTR_SERVICE_INSTANCE_ID]?: string;
  /** Service namespace attribute */
  [SEM_RES_ATTR_SERVICE_NAMESPACE]?: string;
  /** Deployment environment attribute */
  [SEM_RES_ATTR_DEPLOYMENT_ENV]?: string;
  /** Other custom attributes */
  [key: string]: AttributeValue | undefined;
}

/**
 * Extended NodeTracerProvider configuration options
 * Compatible with SDK 2.0's constructor parameters
 */
export interface ExtendedNodeTracerProviderConfig extends NodeTracerProvider {
  /** Array of span processors for SDK 2.0 */
  spanProcessors?: SpanProcessor[];
}

/**
 * OpenTelemetry semantic attribute names
 */
export const OTelAttributeNames = {
  // General
  COMPONENT: 'component',
  SERVICE_NAME: 'service.name',
  SERVICE_VERSION: 'service.version',
  ENVIRONMENT: 'deployment.environment',
  USER_ID: 'user.id',
  SESSION_ID: 'session.id',
  TRACE_ID: 'trace.id',
  
  // AI specific
  MODEL_NAME: 'ai.model.name',
  MODEL_PROVIDER: 'ai.model.provider',
  PROMPT_TOKENS: 'ai.prompt.tokens',
  COMPLETION_TOKENS: 'ai.completion.tokens',
  TOTAL_TOKENS: 'ai.tokens.total',
  LATENCY_MS: 'ai.latency.ms',
  
  // Mastra specific
  AGENT_ID: 'mastra.agent.id',
  AGENT_TYPE: 'mastra.agent.type',
  TOOL_ID: 'mastra.tool.id',
  WORKFLOW_ID: 'mastra.workflow.id',
  MEMORY_ID: 'mastra.memory.id',
  THREAD_ID: 'mastra.thread.id',
  
  // Error
  ERROR: 'error',
  ERROR_MESSAGE: 'error.message',
  ERROR_STACK: 'error.stack',

  // GenAI semantic attributes
  GEN_AI_SYSTEM: 'gen_ai.system',
  GEN_AI_OPERATION_NAME: 'gen_ai.operation.name',
  GEN_AI_REQUEST_MODEL: 'gen_ai.request.model',
  GEN_AI_RESPONSE_TOKEN_COUNT: 'gen_ai.response.token_count',
  GEN_AI_USAGE_INPUT_TOKENS: 'gen_ai.usage.input_tokens',
  GEN_AI_USAGE_OUTPUT_TOKENS: 'gen_ai.usage.output_tokens',
  GEN_AI_USAGE_LATENCY_MS: 'gen_ai.usage.latency_ms',
} as const;

/**
 * Registry for semantic conventions and attribute keys
 */
export type OTelAttribute = keyof typeof OTelAttributeNames;

/**
 * Type for mapping semantic attribute names to their values
 */
export type OTelAttributes = {
  [K in OTelAttribute]?: AttributeValue;
} & Record<string, AttributeValue>;

/**
 * Token usage information for LLM calls
 */
export interface TokenInfo {
  /** Number of tokens in the prompt */
  promptTokens?: number;
  /** Number of tokens in the completion */
  completionTokens?: number;
  /** Total token count */
  totalTokens?: number;
}

/**
 * Trace collector interface for Mastra's telemetry system
 */
export interface TraceCollector {
  /** Name of the collector */
  name: string;
  
  /** Called when a trace starts */
  onStart?: (trace: {
    name: string;
    metadata?: Record<string, any>;
  }) => Promise<any>;
  
  /** Called when a trace ends */
  onEnd?: (trace: {
    name: string;
    metadata?: Record<string, any>;
  }, context: any) => Promise<void>;
  
  /** Called when an event occurs within a trace */
  onEvent?: (event: {
    type: string;
    name?: string;
    data?: any;
    metadata?: Record<string, any>;
  }, trace: {
    name: string;
    metadata?: Record<string, any>;
  }, context: any) => Promise<void>;
}

/**
 * OpenTelemetry service interface
 * Provides methods for interacting with the OpenTelemetry API
 */
export interface OTelService {
  /** Initialize OpenTelemetry from Mastra config */
  initFromConfig(config: OtelConfig): api.Tracer | null;
  
  /** Initialize OpenTelemetry with custom options */
  init(options: OTelInitOptions): api.Tracer | null;
  
  /** Get the current tracer instance */
  getTracer(): api.Tracer;
  
  /** Create a new span */
  createSpan(name: string, options?: api.SpanOptions, parentContext?: api.Context): api.Span;
  
  /** Run a function within a span */
  withSpan<T>(name: string, fn: (span: api.Span) => Promise<T>, attributes?: Record<string, AttributeValue>): Promise<T>;
  
  /** Create a specialized span for LLM operations */
  createLlmSpan(name: string, modelName: string, provider: string, input?: string | object): api.Span;
  
  /** Record LLM response data on a span */
  recordLlmResponse(span: api.Span, output: string | object, tokenInfo?: TokenInfo, latencyMs?: number): void;
  
  /** Set user context on the active span */
  setUserContext(userId: string, sessionId?: string): void;
  
  /** Get the active span from the current context */
  getActiveSpan(): api.Span | null;
  
  /** Get the trace ID of the current context */
  getCurrentTraceId(): string | null;
  
  /** Gracefully shut down OpenTelemetry */
  shutdown(): Promise<void>;
}

/**
 * Langfuse trace creation options
 */
export interface LangfuseTraceOptions {
  userId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Langfuse span creation options
 */
export interface LangfuseSpanOptions {
  traceId: string;
  parentSpanId?: string;
  input?: unknown;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Langfuse generation event options
 */
export interface LangfuseGenerationOptions {
  traceId: string;
  input: unknown;
  output?: unknown;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Langfuse score options
 */
export interface LangfuseScoreOptions {
  name: string;
  value: number;
  traceId?: string;
  spanId?: string;
  generationId?: string;
  comment?: string;
}