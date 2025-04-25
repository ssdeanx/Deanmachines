import { z } from "zod";
import { Langfuse } from "langfuse";
import { createLogger } from "@mastra/core/logger";
import type { LangfuseTraceOptions, LangfuseSpanOptions, LangfuseGenerationOptions, LangfuseScoreOptions } from "./types";
import { env } from "process";

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
  LANGFUSE_HOST: z.string().url().optional().default("https://cloud.langfuse.com"),
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
      `Langfuse service configuration error: ${
        error instanceof Error ? error.message : String(error)
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
      `Langfuse client creation failed: ${
        error instanceof Error ? error.message : String(error)
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
  createTrace(name: string, options?: LangfuseTraceOptions) {
    try {
      const { userId, metadata, tags } = options || {};
      const enrichedMetadata = {
        ...metadata,
        'gen_ai.system': 'langfuse',
        ...(userId && { 'gen_ai.request.user_id': userId }),
      };
      logger.debug("Creating Langfuse trace", { name, userId, metadata: enrichedMetadata, tags });
      return this.client.trace({ name, userId, metadata: enrichedMetadata, tags } as any);
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
        ...metadata,
        'gen_ai.system': 'langfuse',
        'gen_ai.operation.name': name,
      };
      logger.debug("Creating Langfuse span", { name, metadata: enrichedMetadata, ...rest });
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
      const { metadata, promptTokens, completionTokens, model, input, output, traceId } = options;
      const enrichedMetadata = {
        ...metadata,
        'gen_ai.system': 'langfuse',
        'gen_ai.operation.name': 'generation',
        ...(model && { 'gen_ai.request.model': model }),
        ...(promptTokens !== undefined && { 'gen_ai.usage.input_tokens': promptTokens }),
        ...(completionTokens !== undefined && { 'gen_ai.usage.output_tokens': completionTokens }),
      };
      logger.debug("Logging Langfuse generation", {
        name,
        traceId,
        input,
        output,
        metadata: enrichedMetadata,
      });
      return this.client.generation({
        name,
        traceId,
        input,
        output,
        metadata: enrichedMetadata,
        promptTokens,
        completionTokens,
        model,
      } as any);
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
  createScore(options: LangfuseScoreOptions) {
    try {
      logger.debug("Creating Langfuse score", options);

      // Ensure at least one of traceId, spanId, or generationId is provided
      if (!options.traceId && !options.spanId && !options.generationId) {
        throw new Error("At least one of traceId, spanId, or generationId must be provided");
      }

      // TypeScript type assertion to satisfy the compiler
      return this.client.score(options as any);
    } catch (error) {
      logger.error("Error creating score:", { error, name: options.name });
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
}

// Export a singleton instance for use throughout the application
export const langfuse = new LangfuseService();
