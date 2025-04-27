import { z } from "zod";
import { Langfuse } from "langfuse";
import { createLogger } from "@mastra/core/logger";
import type { LangfuseTraceOptions, LangfuseSpanOptions, LangfuseGenerationOptions } from "./types";
import { env } from "process";
import { trace as otelTrace, context as otelContext } from "@opentelemetry/api";
import { OTelAttributeNames } from "./types";

/**
 * Langfuse Integration Service
 *
 * This module provides integration with Langfuse for observability and analytics
 * in Mastra agents. It enables tracing, scoring, and monitoring of LLM operations
 * to improve reliability and performance tracking.
 */


// Configure logger for Langfuse service
const logger = createLogger({ name: "langfuse-service", level: "info" });

/**
 * Environment validation schema for Langfuse
 */
const envSchema = z.object({
  LANGFUSE_PUBLIC_KEY: z.string().min(1, "Langfuse public key is required"),
  LANGFUSE_SECRET_KEY: z.string().min(1, "Langfuse secret key is required"),
  LANGFUSE_HOST: z.string().url().optional().default("http://localhost:3000"),
});

/**
 * Validate environment configuration for Langfuse
 *
 * @returns Validated environment configuration
 * @throws {Error} If validation fails (missing API keys)
 */
function validateEnv() {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingKeys = error.errors
        .filter((e) => e.code === "invalid_type" && e.received === "undefined")
        .map((e) => e.path.join("."));

      if (missingKeys.length > 0) {
        logger.error(
          `Missing required environment variables: ${missingKeys.join(", ")}`
        );
      }
    }
    logger.error("Langfuse environment validation failed:", { error });
    throw new Error(
      `Langfuse service configuration error: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Validate environment at module load time
const validatedEnv = validateEnv();

/**
 * Create a Langfuse client instance
 *
 * @throws {Error} If creation fails due to invalid configuration
 */
function createLangfuseClient() {
  try {
    return new Langfuse({
      publicKey: validatedEnv.LANGFUSE_PUBLIC_KEY,
      secretKey: validatedEnv.LANGFUSE_SECRET_KEY,
      baseUrl: validatedEnv.LANGFUSE_HOST,
    });
  } catch (error) {
    logger.error("Failed to create Langfuse client:", { error });
    throw new Error(
      `Langfuse client creation failed: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Initialize Langfuse client once
const langfuseClient = createLangfuseClient();

/**
 * Langfuse service for observability and analytics
 */
export class LangfuseService {
  private client: Langfuse;

  constructor() {
    this.client = langfuseClient;
  }

  /**
   * Create a new trace to track a user session or request
   *
   * @param name - Name of the trace
   * @param options - Additional options for the trace
   * @returns Trace object
   */
  /**
 * Create a new trace to track a user session or request
 *
 * @param name - Name of the trace
 * @param options - Additional options for the trace. You may include custom metrics in options.metadata or as usage_details/cost_details fields:
 *   {
 *     usage_details?: {
 *       input?: number;
 *       output?: number;
 *       cache_read_input_tokens?: number;
 *       total?: number;
 *     };
 *     cost_details?: {
 *       input?: number;
 *       output?: number;
 *       cache_read_input_tokens?: number;
 *       total?: number;
 *     };
 *     latencyMs?: number;
 *     score?: number;
 *     ...any other custom metrics
 *   }
 * @returns Trace object
 */
  createTrace(name: string, options?: LangfuseTraceOptions) {
    try {
      const {
        userId, sessionId, tags, metadata = {},
        usage_details, cost_details, latencyMs, score, evalScore, evalComment,
        promptTemplate, promptVersion, temperature, topP
      } = options || {};
      const enrichedMetadata = {
        ...metadata,
        'gen_ai.system': 'langfuse',
        ...(userId && { 'gen_ai.request.user_id': userId }),
        ...(sessionId && { 'gen_ai.request.session_id': sessionId }),
        ...(evalScore !== undefined && { evalScore }),
        ...(evalComment && { evalComment }),
        ...(promptTemplate && { promptTemplate }),
        ...(promptVersion && { promptVersion }),
        ...(temperature !== undefined && { temperature }),
        ...(topP !== undefined && { topP }),
        timestamp: new Date().toISOString(),
      };
      const currentOtelSpan = otelTrace.getSpan(otelContext.active());
      if (currentOtelSpan) {
        enrichedMetadata[OTelAttributeNames.TRACE_ID] = currentOtelSpan.spanContext().traceId;
        enrichedMetadata[OTelAttributeNames.SPAN_ID] = currentOtelSpan.spanContext().spanId;
        enrichedMetadata['otel.trace_flags'] = currentOtelSpan.spanContext().traceFlags;
      }
      logger.debug("Creating Langfuse trace", { name, userId, metadata: enrichedMetadata, tags });
      // Optionally, record a metric for trace creation
      try {
        const { createCounter } = require('./tracing');
        createCounter('langfuse.trace.created', 'Langfuse traces created').add(1, { name });
      } catch { }
      return this.client.trace({
        name,
        userId,
        sessionId,
        tags,
        metadata: {
          ...enrichedMetadata,
          ...(usage_details && { usage_details }),
          ...(latencyMs !== undefined && { latencyMs }),
          ...(score !== undefined && { score }),
          ...(evalScore !== undefined && { evalScore }),
          ...(evalComment && { evalComment }),
          ...(promptTemplate && { promptTemplate }),
          ...(promptVersion && { promptVersion }),
          ...(temperature !== undefined && { temperature }),
          ...(topP !== undefined && { topP }),
          ...(cost_details && { cost_details }),
        },
      });
    } catch (error) {
      logger.error("Error creating trace:", { error, name });
      throw new Error(`Failed to create Langfuse trace: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Log a span within a trace to measure a specific operation
   *
   * @param name - Name of the span
   * @param options - Configuration options for the span
   * @returns Span object
   */
  createSpan(name: string, options: LangfuseSpanOptions) {
    try {
      const { metadata, ...rest } = options;
      const enrichedMetadata = {
        'gen_ai.system': 'langfuse',
        'gen_ai.operation.name': name,
        timestamp: new Date().toISOString(),
      };
      const currentOtelSpan = otelTrace.getSpan(otelContext.active());
      if (currentOtelSpan) {
        enrichedMetadata[OTelAttributeNames.TRACE_ID] = currentOtelSpan.spanContext().traceId;
        enrichedMetadata[OTelAttributeNames.SPAN_ID] = currentOtelSpan.spanContext().spanId;
        enrichedMetadata['otel.trace_flags'] = currentOtelSpan.spanContext().traceFlags;
      }
      logger.debug("Creating Langfuse span", { name, metadata: enrichedMetadata, ...rest });
      try {
        const { createCounter } = require('./tracing');
        createCounter('langfuse.span.created', 'Langfuse spans created').add(1, { name });
      } catch { }
      return this.client.span({ name, metadata: enrichedMetadata, ...rest } as any);
    } catch (error) {
      logger.error("Error creating span:", { error, name });
      throw new Error(`Failed to create Langfuse span: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Log a generation event (e.g., LLM call)
   *
   * @param name - Name of the generation
   * @param options - Configuration options for the generation
   * @returns Generation object
   */
  logGeneration(name: string, options: LangfuseGenerationOptions) {
    try {
      const { traceId, input, output, promptTokens, completionTokens, model, usage_details, cost_details, latencyMs, score, evalScore, evalComment, promptTemplate, promptVersion, temperature, topP, userId, sessionId, tags } = options;
      const enrichedMetadata = {
        'gen_ai.system': 'langfuse',
        'gen_ai.operation.name': 'generation',
        ...(model && { 'gen_ai.request.model': model }),
        ...(promptTokens !== undefined && { 'gen_ai.usage.input_tokens': promptTokens }),
        ...(completionTokens !== undefined && { 'gen_ai.usage.output_tokens': completionTokens }),
        timestamp: new Date().toISOString(),
      };
      const currentOtelSpan = otelTrace.getSpan(otelContext.active());
      if (currentOtelSpan && !traceId) enrichedMetadata[OTelAttributeNames.TRACE_ID] = currentOtelSpan.spanContext().traceId;
      logger.debug("Logging Langfuse generation", {
        name,
        traceId,
        input,
        output,
        metadata: enrichedMetadata,
      });
      try {
        const { createCounter } = require('./tracing');
        createCounter('langfuse.generation.logged', 'Langfuse generations logged').add(1, { name });
      } catch { }
      return this.client.generation({
        name,
        traceId,
        input,
        output,
        model,
        metadata: {
          ...enrichedMetadata,
          ...(options?.provider && { provider: options.provider }),
          ...(userId && { userId }),
          ...(sessionId && { sessionId }),
          ...(tags && { tags }),
          ...(promptTokens !== undefined && { promptTokens }),
          ...(completionTokens !== undefined && { completionTokens }),
          ...(usage_details && { usage_details }),
          ...(cost_details && { cost_details }),
          ...(latencyMs !== undefined && { latencyMs }),
          ...(score !== undefined && { score }),
          ...(evalScore !== undefined && { evalScore }),
          ...(evalComment && { evalComment }),
          ...(promptTemplate && { promptTemplate }),
          ...(promptVersion && { promptVersion }),
          ...(temperature !== undefined && { temperature }),
          ...(topP !== undefined && { topP }),
        },
      });
    } catch (error) {
      logger.error("Error logging generation:", { error, name });
      throw new Error(`Failed to log Langfuse generation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Score a trace, span, or generation for quality evaluation
   *
   * @param options - Configuration options for the score
   * @returns Score object
   * @throws {Error} If no target ID (traceId, spanId, or generationId) is provided
   */
  createScore(options: LangfuseTraceOptions & { name?: string; comment?: string; tags?: string[] }) {
    try {
      logger.debug("Creating Langfuse score", options);

      if (!options.traceId && !options.spanId && !options.generationId) {
        throw new Error("At least one of traceId, spanId, or generationId must be provided");
      }

      const finalOptions = { ...options };
      const currentOtelSpan = otelTrace.getSpan(otelContext.active());
      if (!finalOptions.traceId && currentOtelSpan) finalOptions.traceId = currentOtelSpan.spanContext().traceId;
      if (finalOptions.metadata && finalOptions.traceId) {
        finalOptions.metadata = { ...finalOptions.metadata, [OTelAttributeNames.TRACE_ID]: finalOptions.traceId };
      }
      if (options.name) finalOptions.name = options.name;
      if (options.comment) finalOptions.comment = options.comment;
      if (options.tags) finalOptions.tags = options.tags;
      try {
        const { createCounter } = require('./tracing');
        createCounter('langfuse.score.created', 'Langfuse scores created').add(1, { type: typeof options.score, name: options.name });
      } catch { }
      return this.client.score(finalOptions as any);
    } catch (error) {
      logger.error("Error creating Langfuse score", { error, options });
      throw new Error(`Failed to create Langfuse score: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Flush all pending Langfuse events
   *
   * @returns Promise that resolves when all events have been flushed
   */
  async flush(): Promise<void> {
    try {
      await this.client.flush();
      logger.debug("Flushed Langfuse events");
    } catch (error) {
      logger.error("Error flushing Langfuse events:", { error });
      throw new Error(`Failed to flush Langfuse events: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Utility: Attach trace/span IDs to logs for correlation.
   * @param message - Log message
   * @param data - Additional data
   */
  logWithTraceContext(message: string, data?: Record<string, any>) {
    const currentOtelSpan = otelTrace.getSpan(otelContext.active());
    const traceFields = currentOtelSpan
      ? {
        trace_id: currentOtelSpan.spanContext().traceId,
        span_id: currentOtelSpan.spanContext().spanId,
      }
      : {};
    logger.info(message, { ...data, ...traceFields });
  }
}

// Export a singleton instance for use throughout the application
export const langfuse = new LangfuseService();