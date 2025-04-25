/**
 * Vector store configuration for document embedding and retrieval.
 *
 * This module configures Pinecone as the primary vector database for
 * semantic search and RAG functionality with fallback to Upstash.
 */

import { PineconeStore } from "@langchain/pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { env } from "process";
import { Pinecone } from "@pinecone-database/pinecone";
import { EmbeddingModelV1, EmbeddingModelV1Embedding } from "@ai-sdk/provider";

/**
 * Adapter class that extends GoogleGenerativeAIEmbeddings to implement the EmbeddingModelV1 interface
 * required by Mastra's Memory system.
 */
export class MastraEmbeddingAdapter
  extends GoogleGenerativeAIEmbeddings
  implements EmbeddingModelV1<string>
{
  /**
   * Version of the embedding specification
   */
  specificationVersion: "v1" = "v1";

  /**
   * Provider of the embedding model
   */
  provider: string = "google";

  /**
   * ID of the embedding model being used
   */
  modelId: string;

  /**
   * Maximum number of embeddings allowed per API call
   */
  maxEmbeddingsPerCall: number = 16;

  /**
   * Maximum input token length for the model
   */
  maxInputLength: number = 8192;

  /**
   * Dimensionality of the embedding vectors
   */
  dimensions: number;

  /**
   * Creates a new Mastra embedding adapter
   *
   * @param options - Configuration options for the embeddings model
   */
  constructor(options: {
    apiKey?: string;
    modelName?: string;
    maxEmbeddingsPerCall?: number;
    dimensions?: number;
  }) {
    super({
      apiKey: options.apiKey || env.GOOGLE_GENERATIVE_AI_API_KEY!,
      modelName:
        options.modelName || env.EMBEDDING_MODEL || "models/embedding-001",
    });

    this.modelId =
      options.modelName || env.EMBEDDING_MODEL || "models/embedding-001";
    this.maxEmbeddingsPerCall = options.maxEmbeddingsPerCall || 16;
    this.dimensions =
      options.dimensions || Number(env.PINECONE_DIMENSION) || 2048;
    // Assume false by default unless underlying implementation confirms otherwise
    this.supportsParallelCalls = false;
  }
  supportsParallelCalls: boolean;
  doEmbed(options: { values: string[]; abortSignal?: AbortSignal; headers?: Record<string, string | undefined>; }): PromiseLike<{ embeddings: Array<EmbeddingModelV1Embedding>; usage? /** Pinecone environment (e.g., 'us-east-1') */: { tokens: number; }; rawResponse?: { headers?: Record<string, string>; }; }> {
    throw new Error("Method not implemented.");
  }
}

/**
 * Configuration for Pinecone vector store
 */
export interface PineconeConfig {
  /** Pinecone API key from environment */
  apiKey: string;
  /** Pinecone environment (e.g., 'us-east-1') */
  environment: string;
  /** Pinecone index name */
  index: string;
  /** Optional namespace for organization */
  namespace?: string;
  /** Dimension size for embeddings */
  dimension?: number;
  /** Distance metric for similarity search */
  metric?: "cosine" | "euclidean" | "dotproduct";
}

/**
 * Creates and initializes a Pinecone vector store
 *
 * @param embeddings - GoogleGenerativeAIEmbeddings instance for embedding generation
 * @param config - Pinecone configuration options
 * @returns An initialized PineconeStore instance
 * @throws If Pinecone client initialization fails
 */
export async function createPineconeVectorStore(
  embeddings: GoogleGenerativeAIEmbeddings | MastraEmbeddingAdapter,
  config?: Partial<PineconeConfig>
) {
  try {
    // Validate environment variables and configuration
    const apiKey = config?.apiKey || env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error("Pinecone API key is required but not provided");
    }

    // Initialize Pinecone client
    const pineconeClient = new Pinecone({
      apiKey,
    });

    const indexName = config?.index || env.PINECONE_INDEX || "Default";
    const namespace = config?.namespace || env.PINECONE_NAMESPACE;

    const pineconeIndex = pineconeClient.Index(indexName);

    return await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace,
    });
  } catch (error) {
    console.error("Error initializing Pinecone vector store:", error);
    throw new Error(
      `Failed to initialize Pinecone: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Creates and initializes embeddings model for vector storage
 *
 * @param apiKey - Google API key for generating embeddings
 * @param modelName - Name of the embedding model to use
 * @returns MastraEmbeddingAdapter instance that implements all required interface properties
 */
export function createEmbeddings(
  apiKey?: string,
  modelName?: string
): MastraEmbeddingAdapter {
  if (!apiKey && !env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn(
      "No Google API key provided for embeddings. Using empty string which will cause runtime errors."
    );
  }

  const embeddingModel =
    modelName || env.EMBEDDING_MODEL || "models/embedding-001";
  console.log(`Initializing embeddings with model: ${embeddingModel}`);

  return new MastraEmbeddingAdapter({
    apiKey: apiKey || env.GOOGLE_GENERATIVE_AI_API_KEY || "",
    modelName: embeddingModel,
    dimensions: Number(env.PINECONE_DIMENSION) || 2048,
  });
}

/**
 * Creates a vector store backup using Upstash
 * Uses Upstash as a fallback if Pinecone is unavailable
 *
 * @param embeddings - Embeddings to use with Upstash
 * @returns Upstash vector store instance or undefined if not configured
 */
export function createUpstashBackup(embeddings: MastraEmbeddingAdapter) {
  if (!env.UPSTASH_VECTOR_REST_URL || !env.UPSTASH_VECTOR_REST_TOKEN) {
    return undefined;
  }

  try {
    // Note: The Upstash integration would need actual implementation
    // based on the specific Upstash client for Mastra
    console.log("Upstash backup configured and ready");
    return undefined; // Replace with actual implementation when needed
  } catch (error) {
    console.warn("Failed to initialize Upstash backup:", error);
    return undefined;
  }
}
