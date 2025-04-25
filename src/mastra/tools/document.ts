/**
 * Document processing tools for Mastra AI.
 *
 * This module provides tools for document chunking, parsing, and embedding
 * to support various document-based operations within Mastra agents.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { Pinecone } from "@pinecone-database/pinecone"; // Import the main Pinecone client
import { PineconeStore } from "@langchain/pinecone"; // Import the LangChain Pinecone vector store
import { createEmbeddings } from "../database/vector-store";
import { createLangSmithRun, trackFeedback } from "../services/langsmith";
import { env } from "process";

/**
 * Options for chunking documents
 */
interface ChunkingOptions {
  /** Maximum size of each chunk in characters */
  chunkSize?: number;
  /** Overlap between chunks to maintain context */
  chunkOverlap?: number;
  /** Minimum chunk size to include */
  minChunkSize?: number;
}

/**
 * Chunks text into smaller segments for processing
 *
 * @param text - The text content to chunk
 * @param options - Chunking configuration options
 * @returns Array of document chunks
 */
async function chunkText(
  text: string,
  options: ChunkingOptions = {}
): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize || 1000,
    chunkOverlap: options.chunkOverlap || 200,
  });

  return await splitter.createDocuments([text]);
}

/**
 * Tool for embedding documents into the vector store
 */
export const embedDocumentTool = createTool({
  id: "embed-document",
  description: "Embeds a document into the vector store for later retrieval",
  inputSchema: z.object({
    content: z.string().describe("Document content to embed"),
    metadata: z
      .record(z.string(), z.any())
      .optional()
      .describe("Additional metadata about the document"),
    chunkSize: z
      .number()
      .optional()
      .default(1000)
      .describe("Size of text chunks for embedding"),
    chunkOverlap: z
      .number()
      .optional()
      .default(200)
      .describe("Overlap between text chunks"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    documentId: z.string().optional(),
    chunkCount: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const runId = await createLangSmithRun("embed-document", [
      "document",
      "embedding",
    ]);

    try {
      // Create embeddings for vector store
      const embeddings = createEmbeddings();

      // Create document chunks
      const chunks = await chunkText(context.content, {
        chunkSize: context.chunkSize,
        chunkOverlap: context.chunkOverlap,
      });

      // Enrich chunks with metadata
      const enrichedChunks = chunks.map((chunk, i) => {
        return {
          ...chunk,
          metadata: {
            ...(context.metadata || {}),
            chunkIndex: i,
            totalChunks: chunks.length,
            timestamp: new Date().toISOString(),
          },
        };
      });

      // Initialize Pinecone client
      const pineconeClient = new Pinecone({
        apiKey: env.PINECONE_API_KEY!,
      });

      const indexName = env.PINECONE_INDEX || "Default";
      const namespace = env.PINECONE_NAMESPACE || "documents";

      const pineconeIndex = pineconeClient.Index(indexName);

      // Store document in vector database
      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
        namespace,
      });

      await vectorStore.addDocuments(enrichedChunks);

      // Track successful embedding in LangSmith
      await trackFeedback(runId, {
        score: 1,
        comment: `Successfully embedded document with ${chunks.length} chunks`,
        key: "embedding_success",
      });

      return {
        success: true,
        documentId: `doc-${Date.now()}`,
        chunkCount: chunks.length,
      };
    } catch (error) {
      console.error("Error embedding document:", error);

      // Track failure in LangSmith
      await trackFeedback(runId, {
        score: 0,
        comment: error instanceof Error ? error.message : "Unknown error",
        key: "embedding_failure",
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during document embedding",
      };
    }
  },
});

/**
 * Tool for retrieving documents from vector storage
 */
export const retrieveDocumentTool = createTool({
  id: "retrieve-document",
  description: "Retrieves relevant documents based on a query",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant documents"),
    maxDocuments: z
      .number()
      .optional()
      .default(3)
      .describe("Maximum number of documents to retrieve"),
    namespace: z
      .string()
      .optional()
      .describe("Namespace in the vector store to search"),
    filterMetadata: z
      .record(z.string(), z.any())
      .optional()
      .describe("Filter results by metadata fields"),
  }),
  outputSchema: z.object({
    documents: z.array(
      z.object({
        content: z.string(),
        metadata: z.record(z.string(), z.any()),
        score: z.number().optional(),
      })
    ),
    count: z.number(),
  }),
  execute: async ({ context }) => {
    const runId = await createLangSmithRun("retrieve-document", [
      "document",
      "retrieval",
    ]);

    try {
      const embeddings = createEmbeddings();

      // Initialize Pinecone client
      const pineconeClient = new Pinecone({
        apiKey: env.PINECONE_API_KEY!,
      });

      const indexName = env.PINECONE_INDEX || "Default";
      const namespace =
        context.namespace || env.PINECONE_NAMESPACE || "documents";

      const pineconeIndex = pineconeClient.Index(indexName);
      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
        namespace,
      });

      // Perform similarity search with metadata filter if provided
      const searchResults = await vectorStore.similaritySearch(
        context.query,
        context.maxDocuments,
        context.filterMetadata || {}
      );

      // Format results
      const documents = searchResults.map((doc) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score: (doc as any).score ?? (doc.metadata as any)?.score, // Attempt to get score if available
      }));

      // Track successful retrieval in LangSmith
      await trackFeedback(runId, {
        score: 1,
        comment: `Successfully retrieved ${documents.length} documents`,
        key: "retrieval_success",
        value: { documentCount: documents.length },
      });

      return {
        documents,
        count: documents.length,
      };
    } catch (error) {
      console.error("Error retrieving documents:", error);

      // Track failure in LangSmith
      await trackFeedback(runId, {
        score: 0,
        comment: error instanceof Error ? error.message : "Unknown error",
        key: "retrieval_failure",
      });

      return {
        documents: [],
        count: 0,
      };
    }
  }, // Added comma here
});
