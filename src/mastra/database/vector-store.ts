/**
 * Vector store configuration for document embedding and retrieval.
 *
 * Primary: LibSQLVector (@mastra/libsql)
 * Fallback: PineconeStore (@langchain/pinecone)
 */

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { env } from "process";
import { Pinecone } from "@pinecone-database/pinecone";
import { EmbeddingModelV1, EmbeddingModelV1Embedding } from "@ai-sdk/provider";
import { LibSQLVector } from "@mastra/libsql";

/**
 * Adapter class that extends GoogleGenerativeAIEmbeddings to implement
 * the EmbeddingModelV1 interface required by Mastra's Memory system.
 */
export class MastraEmbeddingAdapter
  extends GoogleGenerativeAIEmbeddings
  implements EmbeddingModelV1<string>
{
  specificationVersion: "v1" = "v1";
  provider: string = "google";
  modelId: string;
  maxEmbeddingsPerCall: number = 16;
  maxInputLength: number = 8192;
  dimensions: number;
  supportsParallelCalls: boolean = false;

  constructor(options: {
    apiKey?: string;
    modelName?: string;
    maxEmbeddingsPerCall?: number;
    dimensions?: number;
  }) {
    super({
      apiKey: options.apiKey || env.GOOGLE_GENERATIVE_AI_API_KEY!,
      modelName: options.modelName || env.EMBEDDING_MODEL || "models/embedding-001",
    });
    this.modelId = options.modelName || env.EMBEDDING_MODEL || "models/embedding-001";
    this.maxEmbeddingsPerCall = options.maxEmbeddingsPerCall ?? 16;
    this.dimensions = options.dimensions ?? Number(env.PINECONE_DIMENSION) ?? 2048;
  }

  /**
   * Implements the V1 embedding interface by delegating to `embedDocuments`.
   */
  async doEmbed(options: {
    values: string[];
    abortSignal?: AbortSignal;
    headers?: Record<string, string | undefined>;
  }): Promise<{
    embeddings: EmbeddingModelV1Embedding[];
    usage?: { tokens: number };
    rawResponse?: { headers?: Record<string, string> };
  }> {
    const vectors = await this.embedDocuments(options.values);

    const embeddings: EmbeddingModelV1Embedding[] = vectors.map((vector) => vector);

    return { embeddings };
  }}
/**
 * Factory to create an instance of our adapter.
 */
export function createEmbeddings(
  apiKey?: string,
  modelName?: string
): MastraEmbeddingAdapter {
  if (!apiKey && !env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn(
      "No Google API key provided for embeddings. Runtime calls will fail."
    );
  }
  const embeddingModel = modelName || env.EMBEDDING_MODEL || "models/embedding-001";
  console.info(`Initializing embeddings with model: ${embeddingModel}`);
  return new MastraEmbeddingAdapter({
    apiKey: apiKey || env.GOOGLE_GENERATIVE_AI_API_KEY || "",
    modelName: embeddingModel,
    dimensions: Number(env.PINECONE_DIMENSION) || 2048,
  });
}

/**
 * Creates and initializes a vector store:
 *   1) Try LibSQLVector
 *   2) If that fails, fall back to PineconeStore
 */
export async function createVectorStore(
  embeddings: GoogleGenerativeAIEmbeddings | MastraEmbeddingAdapter,
  config?: {
    libsql?: { connectionUrl?: string; authToken?: string };
    pinecone?: {
      apiKey?: string;
      index?: string;
      namespace?: string;
    };
  }
) {
  // 1) Primary: LibSQLVector
  try {
    const connectionUrl =
      config?.libsql?.connectionUrl ||
      env.DATABASE_URL ||
      "file:.mastra/mastra.db";
    const authToken = config?.libsql?.authToken || env.DATABASE_KEY;

    const libsqlVector = new LibSQLVector({
      connectionUrl,
      authToken,
    });
    console.info("✅ Initialized LibSQL vector store");
    return libsqlVector;
  } catch (err) {
    console.warn(
      "⚠️  Failed to initialize LibSQLVector, falling back to Pinecone:",
      err
    );
  }

  // 2) Fallback: PineconeStore
  try {
    const apiKey = config?.pinecone?.apiKey || env.PINECONE_API_KEY!;
    const indexName = config?.pinecone?.index || env.PINECONE_INDEX!;
    const namespace = config?.pinecone?.namespace || env.PINECONE_NAMESPACE;

    if (!apiKey || !indexName) {
      throw new Error("Missing Pinecone API key or index name");
    }

    const pineconeClient = new Pinecone({ apiKey });
    const pineconeIndex = pineconeClient.Index(indexName);

    const pineconeStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { pineconeIndex, namespace }
    );
    console.info("✅ Initialized Pinecone vector store");
    return pineconeStore;
  } catch (err) {
    console.error("❌ Failed to initialize Pinecone vector store:", err);
    throw new Error(
      `Could not initialize any vector store: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
