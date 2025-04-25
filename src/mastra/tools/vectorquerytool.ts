/**
 * Vector Query Tool for semantic search over vector databases.
 *
 * This module creates and exports tools for semantic search over vector stores,
 * with support for reranking to improve search result relevance.
 */

import { google } from "@ai-sdk/google";
import { z } from "zod";
import { encodingForModel } from "js-tiktoken";
import { createVectorQueryTool } from "@mastra/rag";
import { env } from "process";
import { createLogger } from "@mastra/core/logger";
import {
  MastraEmbeddingAdapter,
  createEmbeddings,
} from "../database/vector-store";
import { AsyncCaller } from "@langchain/core/utils/async_caller";

// Configure logger
const logger = createLogger({ name: "vector-query-tool", level: "info" });

// Environment validation
const envSchema = z.object({
  GOOGLE_AI_API_KEY: z.string().min(1, "Google AI API key is required"),
  PINECONE_INDEX: z.string().default("Default"),
  PINECONE_DIMENSION: z.coerce.number().default(2048),
  VECTOR_STORE_NAME: z.string().default("pinecone"),
});

// Validate environment
const validatedEnv = (() => {
  try {
    return envSchema.parse(env);
  } catch (error) {
    logger.error("Environment validation failed:", { error });
    throw new Error(
      `Vector query tool configuration error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
})();

/**
 * Configuration for Vector Query Tool
 */
export interface VectorQueryConfig {
  vectorStoreName?: string;
  indexName?: string;
  enableFilters?: boolean;
  id?: string;
  description?: string;
  embeddingProvider?: "google" | "tiktoken";
  topK?: number;
  tokenEncoding?: string;
  dimensions?: number;
  apiKey?: string;
}

/**
 * Creates a Vector Query Tool with specified configuration
 */
export function createMastraVectorQueryTool(config: VectorQueryConfig = {}) {
  try {
    // Get configuration values with defaults
    const vectorStoreName =
      config.vectorStoreName || validatedEnv.VECTOR_STORE_NAME;
    const indexName = config.indexName || validatedEnv.PINECONE_INDEX;
    const embeddingProvider = config.embeddingProvider || "google";
    const tokenEncoding = config.tokenEncoding || "o200k_base";
    const dimensions = config.dimensions || validatedEnv.PINECONE_DIMENSION;
    const apiKey = config.apiKey || validatedEnv.GOOGLE_AI_API_KEY;
    const topK = config.topK || 5;

    logger.info(
      `Creating vector query tool for ${vectorStoreName}:${indexName}`
    );

    // Create embedding model
    let embeddingModel: MastraEmbeddingAdapter;

    if (embeddingProvider === "tiktoken") {
      logger.info(`Using tiktoken embeddings with encoding: ${tokenEncoding}`);

      // Create a tiktoken adapter - using type assertion to avoid issues with private properties
      const tiktokenAdapter = {
        specificationVersion: "v1",
        provider: "tiktoken",
        modelId: tokenEncoding,
        dimensions,
        // client property is removed as it's private
        doEmbed: async (options: {
          values: string[];
          abortSignal?: AbortSignal;
          headers?: Record<string, string | undefined>;
        }) => {
          try {
            const text = options.values[0];
            // Get tokenizer
            const tokenizer = encodingForModel(tokenEncoding as any);
            // Convert text to tokens
            const tokens = tokenizer.encode(text);
            // Create embedding from tokens
            let embedding = tokens.slice(
              0,
              Math.min(tokens.length, dimensions)
            );

            // Pad embedding if needed
            if (embedding.length < dimensions) {
              embedding = [
                ...embedding,
                ...Array(dimensions - embedding.length).fill(0),
              ];
            }

            return { embeddings: [{ embedding }] };
          } catch (error: unknown) {
            logger.error("Tiktoken embedding error:", { error });
            throw new Error(
              `Tiktoken embedding failed: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        },
        maxEmbeddingsPerCall: 0,
        maxInputLength: 0,
        supportsParallelCalls: false,
        modelName: "",
        model: "",
        stripNewLines: false,
        maxBatchSize: 0,
        _convertToContent: undefined,
        _embedQueryContent: function (_text: string): Promise<number[]> {
          throw new Error("Function not implemented.");
        },
        _embedDocumentsContent: function (
          _documents: string[]
        ): Promise<number[][]> {
          throw new Error("Function not implemented.");
        },
        embedQuery: function (_document: string): Promise<number[]> {
          throw new Error("Function not implemented.");
        },
        embedDocuments: function (_documents: string[]): Promise<number[][]> {
          throw new Error("Function not implemented.");
        },
        caller: new AsyncCaller({}),
      };

      // Use the adapter with createEmbeddings with type assertion
      embeddingModel = tiktokenAdapter as unknown as MastraEmbeddingAdapter;
    } else {
      // Use Google embeddings
      logger.info("Using Google embeddings");
      embeddingModel = createEmbeddings(
        apiKey,
        "models/gemini-embedding-exp-03-07"
      );
    }

    // Create reranker
    const reranker = {
      model: google("models/gemini-2.0-flash"),
      options: {
        weights: {
          semantic: 0.5,
          vector: 0.3,
          position: 0.2,
        },
        topK,
      },
    };

    // Tool ID and description
    const toolId = config.id || `vector-query-${embeddingProvider}`;
    const description =
      config.description ||
      `Access knowledge base using ${embeddingProvider} embeddings`;

    // Create and return the tool
    const tool = createVectorQueryTool({
      vectorStoreName,
      indexName,
      model: embeddingModel,
      reranker,
      id: toolId,
      description,
      enableFilter: config.enableFilters,
    });

    logger.info(`Vector query tool created: ${toolId}`);
    return tool;
  } catch (error) {
    logger.error("Failed to create vector query tool:", { error });
    throw new Error(
      `Vector query tool creation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Default vector query tool instance with tiktoken
export const vectorQueryTool = createMastraVectorQueryTool({
  embeddingProvider: "tiktoken",
  id: "vector-query",
  description: "Search through knowledge base using token-based embeddings",
});

// Google embeddings variant
export const googleVectorQueryTool = createMastraVectorQueryTool({
  embeddingProvider: "google",
  id: "google-vector-query",
  description:
    "Search through knowledge base using Google's semantic embeddings",
});

// Tool with filters enabled
export const filteredQueryTool = createMastraVectorQueryTool({
  embeddingProvider: "tiktoken",
  enableFilters: true,
  id: "filtered-vector-query",
  description: "Search with metadata filtering through the vector database",
});

export default vectorQueryTool;
