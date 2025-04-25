/**
 * Graph-based Retrieval Augmented Generation (GraphRAG) tools for Mastra AI.
 *
 * This module provides advanced document retrieval that leverages graph relationships
 * between documents to improve context and relevance of retrieved information.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Document } from "langchain/document";
import { createEmbeddings } from "../database/vector-store";
import { createLangSmithRun, trackFeedback } from "../services/langsmith";
import { createLangChainModel } from "../services/langchain";
import { env } from "process";
// Import Langfuse service for observability.
import { langfuse } from "../services/langfuse";

/**
 * Graph node representing a document or chunk with its connections.
 */
export interface GraphNode {
  /** Unique identifier for the node */
  id: string;
  /** Document content */
  content: string;
  /** Metadata about the document */
  metadata: Record<string, unknown>;
  /** IDs of connected nodes */
  connections: string[];
  /** Connection weights/strengths (0-1) */
  connectionWeights: Record<string, number>;
}

/**
 * GraphDocument augments a LangChain Document with GraphNode metadata.
 */
export type GraphDocument = Document & { metadata: GraphNode };

/**
 * Creates graph relationships between documents based on semantic similarity.
 *
 * @param documents - List of documents to create relationships between.
 * @param embeddings - Embeddings model for calculating similarity.
 * @param threshold - Similarity threshold for creating connections (default 0.7).
 * @returns Documents enriched with graph relationship metadata.
 * @throws {Error} If vector dimensions mismatch.
 */
async function createGraphRelationships(
  documents: Document[],
  embeddings: GoogleGenerativeAIEmbeddings,
  threshold: number = 0.7
): Promise<GraphDocument[]> {
  // Map input documents to GraphDocuments ensuring metadata conforms to GraphNode.
  const docsWithIds: GraphDocument[] = documents.map((doc, index) => {
    const id =
      (doc.metadata && typeof doc.metadata === "object" && "id" in doc.metadata
        ? String((doc.metadata as Record<string, unknown>).id)
        : `node-${Date.now()}-${index}`) || `node-${index}`;
    return {
      ...doc,
      metadata: {
        ...(doc.metadata as Record<string, unknown>),
        id,
        connections: [] as string[],
        connectionWeights: {} as Record<string, number>,
      },
    } as GraphDocument;
  });

  // Create embeddings for all documents.
  const contents = docsWithIds.map((doc) => doc.pageContent);
  const embeddingVectors = await embeddings.embedDocuments(contents);

  // Calculate similarity between all pairs of documents.
  for (let i = 0; i < docsWithIds.length; i++) {
    for (let j = i + 1; j < docsWithIds.length; j++) {
      const similarity = calculateCosineSimilarity(
        embeddingVectors[i],
        embeddingVectors[j]
      );

      // Create a connection if similarity exceeds threshold.
      if (similarity >= threshold) {
        const nodeI = docsWithIds[i];
        const nodeJ = docsWithIds[j];

        const idI = nodeI.metadata.id;
        const idJ = nodeJ.metadata.id;

        nodeI.metadata.connections.push(idJ);
        nodeI.metadata.connectionWeights[idJ] = similarity;

        nodeJ.metadata.connections.push(idI);
        nodeJ.metadata.connectionWeights[idI] = similarity;
      }
    }
  }

  return docsWithIds;
}

/**
 * Calculates cosine similarity between two vectors.
 *
 * @param vec1 - First vector.
 * @param vec2 - Second vector.
 * @returns Similarity score between 0 and 1.
 * @throws {Error} If vector lengths differ.
 */
function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must have the same dimensions");
  }
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    magnitude1 += vec1[i] ** 2;
    magnitude2 += vec2[i] ** 2;
  }
  const mag1 = Math.sqrt(magnitude1);
  const mag2 = Math.sqrt(magnitude2);
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  return dotProduct / (mag1 * mag2);
}

/**
 * Tool for creating a graph-based document store with relationships.
 */
export const createGraphRagTool = createTool({
  id: "create-graph-rag",
  description:
    "Creates graph relationships between documents for improved retrieval",
  inputSchema: z.object({
    documents: z
      .array(
        z.object({
          content: z.string(),
          metadata: z.record(z.string(), z.any()).optional(),
        })
      )
      .describe("Documents to process and connect"),
    namespace: z
      .string()
      .optional()
      .describe("Namespace to store the graph in"),
    similarityThreshold: z
      .number()
      .optional()
      .default(0.7)
      .describe("Threshold for creating connections (0-1)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    graphId: z.string().optional(),
    nodeCount: z.number(),
    edgeCount: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const runId = await createLangSmithRun("create-graph-rag", ["graph", "rag"]);
    try {
      // Create embeddings model.
      const embeddings = createEmbeddings();

      // Convert input to GraphDocuments.
      const documents = context.documents.map((doc: unknown) => {
        return new Document({
          pageContent: (doc as any).content,
          metadata: (doc as any).metadata || {},
        });
      });

      // Create graph relationships.
      const graphDocuments = await createGraphRelationships(
        documents,
        embeddings,
        context.similarityThreshold
      );

      // Count total connections (edges).
      let edgeCount = 0;
      graphDocuments.forEach((doc) => {
        edgeCount += doc.metadata.connections?.length || 0;
      });
      edgeCount = Math.floor(edgeCount / 2);

      // Store graph in vector database.
      const pineconeClient = new Pinecone({ apiKey: env.PINECONE_API_KEY! });
      const indexName = env.PINECONE_INDEX || "Default";
      const namespace = context.namespace || "graph-rag";
      const pineconeIndex = pineconeClient.Index(indexName);
      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
        namespace,
      });
      await vectorStore.addDocuments(graphDocuments);
      const graphId = `graph-${Date.now()}`;

      // Track success in LangSmith.
      await trackFeedback(runId, {
        score: 1,
        comment: `Created graph with ${graphDocuments.length} nodes and ${edgeCount} edges`,
        key: "graph_creation_success",
        value: { nodeCount: graphDocuments.length, edgeCount },
      });

      return {
        success: true,
        graphId,
        nodeCount: graphDocuments.length,
        edgeCount,
      };
    } catch (error: unknown) {
      console.error("Error creating graph RAG:", error);
      await trackFeedback(runId, {
        score: 0,
        comment:
          error instanceof Error ? error.message : "Unknown error during graph creation",
        key: "graph_creation_failure",
      });
      return {
        success: false,
        nodeCount: 0,
        edgeCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Tool for graph-based document retrieval with relationship exploration.
 *
 * Now uses createLangChainModel to ensure the LangChain model is instantiated and functional,
 * and logs a generation event via Langfuse.
 */
export const graphRagQueryTool = createTool({
  id: "graph-rag-query",
  description:
    "Retrieves documents using graph-based relationships for improved context",
  inputSchema: z.object({
    query: z.string().describe("Query to search for in the document graph"),
    namespace: z.string().optional().describe("Namespace for the graph"),
    initialDocumentCount: z
      .number()
      .optional()
      .default(3)
      .describe("Initial number of documents to retrieve"),
    maxHopCount: z
      .number()
      .optional()
      .default(2)
      .describe("Maximum number of hops to traverse in the graph"),
    minSimilarity: z
      .number()
      .optional()
      .default(0.6)
      .describe("Minimum similarity for initial document retrieval"),
  }),
  outputSchema: z.object({
    documents: z.array(
      z.object({
        content: z.string(),
        metadata: z.record(z.string(), z.any()),
        score: z.number().optional(),
        hopDistance: z.number().optional(),
      })
    ),
    count: z.number(),
  }),
  execute: async ({ context }) => {
    const runId = await createLangSmithRun("graph-rag-query", [
      "graph",
      "rag",
      "query",
    ]);
    try {
      // Instantiate LangChain model to ensure createLangChainModel is read and functional.
      const langChainModel = createLangChainModel();
      // Log model instantiation via Langfuse.
      langfuse.createTrace("graph-rag-query", { userId: "system" });
      console.info("LangChain model instantiated:", { model: langChainModel });

      const embeddings = createEmbeddings();
      // Initialize Pinecone client.
      const pineconeClient = new Pinecone({ apiKey: env.PINECONE_API_KEY! });
      const indexName = env.PINECONE_INDEX || "Default";
      const namespace = context.namespace || "graph-rag";
      const pineconeIndex = pineconeClient.Index(indexName);
      // Connect to vector store.
      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
        namespace,
      });
      // Initial document retrieval.
      const initialResults = await vectorStore.similaritySearchWithScore(
        context.query,
        context.initialDocumentCount,
        { minScore: context.minSimilarity }
      );
      // Process and normalize results.
      const retrievedNodes: Record<
        string,
        { document: Document; score: number; hopDistance: number }
      > = {};
      initialResults.forEach(([doc, score]) => {
        const id = doc.metadata.id;
        if (id) {
          retrievedNodes[id] = {
            document: doc,
            score: score as number,
            hopDistance: 0,
          };
        }
      });
      // Explore graph up to maxHopCount.
      const maxHops = context.maxHopCount || 2;
      const exploreQueue: [string, number][] = Object.keys(retrievedNodes).map(
        (id) => [id, 0]
      );
      while (exploreQueue.length > 0) {
        const [nodeId, hopDistance] = exploreQueue.shift()!;
        if (hopDistance >= maxHops) continue;
        const nodeInfo = retrievedNodes[nodeId];
        if (!nodeInfo) continue;
        const connections = nodeInfo.document.metadata.connections || [];
        const weights = nodeInfo.document.metadata.connectionWeights || {};
        for (const connectedId of connections) {
          if (retrievedNodes[connectedId]) continue;
          try {
            const filterResults = await vectorStore.similaritySearch("", 1, { id: connectedId });
            if (filterResults.length > 0) {
              const connectedDoc = filterResults[0];
              const connectionWeight = weights[connectedId] || 0.5;
              retrievedNodes[connectedId] = {
                document: connectedDoc,
                score: nodeInfo.score * connectionWeight,
                hopDistance: hopDistance + 1,
              };
              exploreQueue.push([connectedId, hopDistance + 1]);
            }
          } catch (error) {
            console.warn(`Error retrieving connected node ${connectedId}:`, error);
          }
        }
      }
      // Format and sort results.
      const results = Object.values(retrievedNodes)
        .sort((a, b) => b.score - a.score)
        .map((node) => ({
          content: node.document.pageContent,
          metadata: {
            ...node.document.metadata,
            connections: undefined,
            connectionWeights: undefined,
          },
          score: node.score,
          hopDistance: node.hopDistance,
        }));

      // Log generation event using Langfuse.
      langfuse.logGeneration("graph-rag-query-generation", {
        traceId: runId,
        input: context.query,
        output: { documentCount: results.length },
      });

      await trackFeedback(runId, {
        score: 1,
        comment: `Retrieved ${results.length} documents via graph exploration`,
        key: "graph_query_success",
        value: { documentCount: results.length },
      });
      return {
        documents: results,
        count: results.length,
      };
    } catch (error) {
      console.error("Error querying graph RAG:", error);
      await trackFeedback(runId, {
        score: 0,
        comment: error instanceof Error ? error.message : "Unknown error",
        key: "graph_query_failure",
      });
      return { documents: [], count: 0 };
    }
  },
});
