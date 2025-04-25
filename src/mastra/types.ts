/**
 * DeanMachines AI Platform - Type Definitions
 * 
 * This file contains shared type definitions for the DeanMachines AI Platform.
 * These types are used throughout the codebase to ensure consistent typing
 * and facilitate strong typing for the Mastra AI framework integrations.
 */
import { Message } from 'ai';
import { z } from 'zod';
import { JsonSchema7Type } from 'zod-to-json-schema';

import { AttributeValue, TraceCollector } from './services/types';

import type * as api from '@opentelemetry/api';
// Import types from specialized services
/**
 * StreamResult interface models the return value of Mastra's agent.stream() method
 * Based on Mastra's stream() documentation specifications
 */
export interface StreamResult<T = unknown> {
  /** Stream of text chunks. Present when output is 'text' or when using experimental_output */
  textStream: AsyncIterable<string>;
  
  /** Stream of structured data. Present only when using output option with a schema */
  objectStream?: AsyncIterable<object>;
  
  /** Stream of structured data. Present only when using experimental_output option */
  partialObjectStream?: AsyncIterable<object>;
  
  /** Promise that resolves to the final structured output when using output or experimental_output */
  object?: Promise<T>;
}

/**
 * StreamOptions interface for configuring streaming behavior
 */
export interface StreamOptions {
  /** Signal object that allows you to abort the agent's execution */
  abortSignal?: AbortSignal;
  
  /** Additional context messages to provide to the agent */
  context?: Message[];
  
  /** 
   * Enables structured output generation alongside text generation and tool calls 
   * The model will generate responses that conform to the provided schema
   */
  experimental_output?: z.ZodType<any> | JsonSchema7Type;
  
  /** Custom instructions that override the agent's default instructions */
  instructions?: string;
  
  /** Maximum number of steps allowed during streaming */
  maxSteps?: number;
  
  /** Configuration options for memory management */
  memoryOptions?: MemoryOptions;
  
  /** Callback function called when streaming is complete */
  onFinish?: StreamTextOnFinishCallback | StreamObjectOnFinishCallback;
  
  /** Callback function called after each step during streaming */
  onStepFinish?: GenerateTextOnStepFinishCallback<any>;
  
  /** Defines the expected structure of the output */
  output?: z.ZodType<any> | JsonSchema7Type;
  
  /** Identifier for the user or resource interacting with the agent */
  resourceId?: string;
  
  /** Settings for telemetry collection during streaming */
  telemetry?: TelemetrySettings;
  
  /** Controls randomness in the model's output */
  temperature?: number;
  
  /** Identifier for the conversation thread */
  threadId?: string;
  
  /** Controls how the agent uses tools during streaming */
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string };
  
  /** Additional toolsets to make available to the agent during this stream */
  toolsets?: Record<string, unknown>;
}

/** Memory configuration options for streaming */
export interface MemoryOptions {
  /** Number of most recent messages to include in context, false to disable */
  lastMessages?: number | false;
  
  /** Configuration for semantic memory recall */
  semanticRecall?: boolean | {
    /** Number of most semantically similar messages to retrieve */
    topK?: number;
    /** Range of messages to consider for semantic search */
    messageRange?: number | { before: number; after: number };
  };
  
  /** Configuration for working memory */
  workingMemory?: {
    /** Whether to enable working memory */
    enabled?: boolean;
    /** Template to use for working memory */
    template?: string;
    /** Type of content to use for working memory */
    type?: 'text-stream' | 'tool-call';
  };
  
  /** Thread-specific memory configuration */
  threads?: {
    /** Whether to automatically generate titles for new threads */
    generateTitle?: boolean;
  };
}

/** Settings for telemetry collection during streaming */
export interface TelemetrySettings {
  /** Enable or disable telemetry */
  isEnabled?: boolean;
  /** Enable or disable input recording */
  recordInputs?: boolean;
  /** Enable or disable output recording */
  recordOutputs?: boolean;
  /** Identifier for this function */
  functionId?: string;
  /** Additional information to include in the telemetry data */
  metadata?: Record<string, AttributeValue>;
  /** A custom OpenTelemetry tracer instance */
  tracer?: api.Tracer;
  /** Custom telemetry collectors */
  collectors?: TraceCollector[];
  /** Logging level for telemetry */
  level?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

/** Callback when text streaming is finished */
export type StreamTextOnFinishCallback = (text: string) => void | Promise<void>;

/** Callback when object streaming is finished */
export type StreamObjectOnFinishCallback = (object: unknown) => void | Promise<void>;

/** Callback after each step during text generation */
export type GenerateTextOnStepFinishCallback<T> = (
  step: number, 
  maxSteps: number, 
  details?: T
) => void | Promise<void>;

/**
 * AgentResponse interface representing the structure of agent responses
 * Used for hooks and response handling
 */
export interface AgentResponse {
  /** Text content of the response */
  text?: string;
  /** Structured data in the response */
  object?: unknown;
  /** Error information if the response contains an error */
  error?: string;
  /** Optional metadata about the response */
  metadata?: Record<string, unknown>;
}

/**
 * ResponseHookConfig interface for configuring response hooks
 */
export interface ResponseHookConfig {
  /** Minimum acceptable length of text responses */
  minResponseLength?: number;
  /** Maximum number of retry attempts for failed responses */
  maxAttempts?: number;
  /** Custom validation function for responses */
  validateResponse?: (response: AgentResponse) => boolean;
}

/**
 * Tracing-related types for Langfuse and LangSmith integration
 */

/** Metadata for a trace */
export interface TraceMetadata {
  /** User identifier for the trace */
  userId?: string;
  /** Tags for categorizing the trace */
  tags?: string[] | unknown;
  /** Additional metadata properties */
  [key: string]: any;
}

/** Trace structure for telemetry collection */
export interface Trace {
  /** Name of the trace */
  name: string;
  /** Metadata associated with the trace */
  metadata?: TraceMetadata;
}

/** Context object for trace collectors */
export interface CollectorContext {
  /** External ID for the trace (e.g., Langfuse trace ID) */
  externalId?: string;
  /** OpenTelemetry trace ID */
  traceId?: string;
  /** OpenTelemetry span */
  span?: api.Span;
  /** Additional context data */
  [key: string]: any;
}

/** LLM event data structure */
export interface LlmEventData {
  /** Input provided to the LLM */
  input?: any;
  /** Output generated by the LLM */
  output?: any;
  /** Model used for generation */
  model?: string;
  /** Number of tokens in the prompt */
  promptTokens?: number;
  /** Number of tokens in the completion */
  completionTokens?: number;
}

/** Event metadata structure */
export interface EventMetadata {
  /** Tags for categorizing the event */
  tags?: string[] | unknown;
  /** Additional metadata properties */
  [key: string]: any;
}

/** Event structure for telemetry collection */
export interface Event {
  /** Type of event (e.g., 'llm', 'tool', etc.) */
  type: string;
  /** Name of the event */
  name?: string;
  /** Data associated with the event */
  data?: LlmEventData;
  /** Metadata for the event */
  metadata?: EventMetadata;
}

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
 * Thread information with creation metadata
 */
export interface ThreadInfo {
  /** Unique thread identifier */
  id: string;
  /** User or entity associated with the thread */
  resourceId: string;
  /** When the thread was created */
  createdAt: Date;
  /** Optional metadata for thread categorization */
  metadata?: Record<string, unknown>;
  /** When the thread was last read */
  lastReadAt?: Date;
}

/**
 * Thread creation options
 */
export interface CreateThreadOptions {
  /** Optional predefined thread ID (generates UUID if not provided) */
  threadId?: string;
  /** User or entity associated with the thread */
  resourceId: string;
  /** Optional metadata for thread categorization */
  metadata?: Record<string, unknown>;
}

/**
 * Custom error for thread management failures
 */
export class ThreadManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThreadManagerError";
  }
}

/**
 * Custom error for agent configuration failures
 */
export class AgentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentConfigError";
  }
}

/**
 * Zod schema for ThreadInfo
 */
export const ThreadInfoSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  createdAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
  lastReadAt: z.date().optional(),
});

/**
 * Zod schema for CreateThreadOptions
 */
export const CreateThreadOptionsSchema = z.object({
  threadId: z.string().optional(),
  resourceId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

// Re-export types from services for backward compatibility
export * from './services/types';



declare module "@mastra/memory" {
  interface Memory {
    /** Retrieve persisted memory for a thread */
    getMemory(threadId: string): Promise<any>;
    /** Save memory data for a thread */
    saveMemory(threadId: string, data: any): Promise<void>;
  }
}
