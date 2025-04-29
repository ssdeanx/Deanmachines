/**
 * Graph-based Retrieval Augmented Generation (GraphRAG) tools for Mastra AI.
 *
 * This module provides advanced document retrieval that leverages graph relationships
 * between documents to improve context and relevance of retrieved information.
 */

import { createTool } from "@mastra/core/tools";
import { createEmbeddings, createVectorStore } from "../database/vector-store";
import { Document } from "langchain/document";
import { z, ZodTypeAny, any as zodAny, type ZodType } from 'zod';


import { langfuse } from "../services/langfuse";
import { createTracedSpan } from "../services/tracing";

/**
 * Graph node representing a document or chunk with its connections.
 */
export const GraphNodeSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()),
  connections: z.array(z.string()),
  connectionWeights: z.record(z.number().min(0).max(1)),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export function isGraphNode(obj: unknown): obj is GraphNode {
  return GraphNodeSchema.safeParse(obj).success;
}

export const GraphDocumentSchema = z.object({
  pageContent: z.string(),
  metadata: GraphNodeSchema,
});
export type GraphDocument = z.infer<typeof GraphDocumentSchema>;

export function isGraphDocument(obj: unknown): obj is GraphDocument {
  return GraphDocumentSchema.safeParse(obj).success;
}

/**
 * Creates graph relationships between documents based on semantic similarity.
 *
 * @param documents - List of documents to create relationships between.
 * @param embeddings - Embeddings model for calculating similarity.
 * @param threshold - Similarity threshold for creating connections (default 0.7).
 * @returns Documents enriched with graph relationship metadata.
 * @throws {Error} If vector dimensions mismatch.
 */

function assertGraphNode(obj: unknown, msg?: string): asserts obj is GraphNode {
  if (!isGraphNode(obj)) throw new Error(msg || "Invalid GraphNode");
}

function assertGraphDocument(obj: unknown, msg?: string): asserts obj is GraphDocument {
  if (!isGraphDocument(obj)) throw new Error(msg || "Invalid GraphDocument");
}

async function createGraphRelationships(
  documents: Document[],
  embeddingsModel: any, // MastraEmbeddingAdapter or compatible
  threshold: number = 0.7
): Promise<GraphDocument[]> {
  // Validate all input documents as Document (with at least pageContent and metadata)
  documents.forEach((doc, idx) => {
    if (!doc || typeof doc !== 'object' || typeof doc.pageContent !== 'string' || typeof doc.metadata !== 'object') {
      throw new Error(`Invalid Document at index ${idx}`);
    }
  });
  // Map input documents to GraphDocuments ensuring metadata conforms to GraphNode.
  const docsWithIds: GraphDocument[] = documents.map((doc, index) => {
    const id =
      (doc.metadata && typeof doc.metadata === "object" && "id" in doc.metadata
        ? String((doc.metadata as Record<string, unknown>).id)
        : `node-${Date.now()}-${index}`) || `node-${index}`;
    const candidate = {
      ...doc,
      pageContent: doc.pageContent,
      metadata: {
        ...(doc.metadata as Record<string, unknown>),
        id,
        content: doc.pageContent,
        connections: [] as string[],
        connectionWeights: {} as Record<string, number>,
      },
    };
    assertGraphDocument(candidate, `Invalid GraphDocument at index ${index}`);
    return candidate;
  });

  // Create embeddings for all documents using the provided embedding model.
  const contents = docsWithIds.map((doc) => doc.pageContent);
  const embeddingVectors = await embeddingsModel.embedDocuments(contents);

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

  docsWithIds.forEach((doc, idx) => assertGraphDocument(doc, `Output GraphDocument at index ${idx} is invalid`));
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

  execute: async ({ context }) => {
    const span = createTracedSpan("graph-rag-create", { context });
    if (!span) throw new Error("Tracing span is undefined");
    try {
      // Create embeddings model and vector store using project factories.
      const embeddings = createEmbeddings();
      const vectorStore = await createVectorStore(embeddings);

      // Convert input to GraphDocuments.
      const documents = context.documents.map((doc: unknown) => {
        return new Document({
          pageContent: (doc as any).content,
          metadata: (doc as any).metadata || {},
        });
      });

      // Create graph relationships using the embedding model
      const graphDocs = await createGraphRelationships(
        documents,
        embeddings,
        context.similarityThreshold
      );

      // Count total connections (edges).
      let edgeCount = 0;
      graphDocs.forEach((doc) => {
        edgeCount += doc.metadata.connections?.length || 0;
      });
      edgeCount = Math.floor(edgeCount / 2);

      // Store graph in vector store
      if (typeof (vectorStore as any).upsert === "function") {
        await (vectorStore as any).upsert(graphDocs);
      } else if (typeof (vectorStore as any).addDocuments === "function") {
        await (vectorStore as any).addDocuments(graphDocs);
      } else {
        throw new Error("No compatible vector store method for adding documents");
      }
      const graphId = `graph-${Date.now()}`;

      langfuse.logGeneration("graph-rag-create", {
        input: { nodeCount: graphDocs.length, edgeCount },
        output: { graphId },
        traceId: span.spanContext().traceId,
      });
      span.end();
      return {
        success: true,
        graphId,
        nodeCount: graphDocs.length,
        edgeCount,
      };
    } catch (error: unknown) {
      if (!span) throw new Error("Tracing span is undefined");
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) });
      langfuse.logWithTraceContext("Error creating graph RAG", { error });
      if (!span) throw new Error("Tracing span is undefined");
      span.end();
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

  execute: async ({ context }) => {
    const span = createTracedSpan("graph-rag-query", { context });
    if (!span) throw new Error("Tracing span is undefined");
    try {
      // Create embeddings model and vector store using project factories.
      const embeddings = createEmbeddings();
      const vectorStore = await createVectorStore(embeddings);

      // Initial document retrieval using the unified vector store
      let initialResults;
      if (typeof (vectorStore as any).query === "function") {
        initialResults = await (vectorStore as any).query(context.query, {
          topK: context.initialDocumentCount,
          minScore: context.minSimilarity,
        });
      } else if (typeof (vectorStore as any).similaritySearchWithScore === "function") {
        initialResults = await (vectorStore as any).similaritySearchWithScore(
          context.query,
          context.initialDocumentCount,
          { minScore: context.minSimilarity }
        ).then((results: any[]) => results.map(([doc, score]) => ({ doc, score })));
      } else {
        throw new Error("No compatible vector store method for similarity search");
      }

      // Process and normalize results.
      const retrievedNodes: Record<
        string,
        { document: Document; score: number; hopDistance: number }
      > = {};
      initialResults.forEach(({ doc, score }: { doc: Document; score: number }) => {
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
            let filterResults;
            if (typeof (vectorStore as any).query === "function") {
              filterResults = await (vectorStore as any).query("", { filter: { id: connectedId }, topK: 1 });
            } else if (typeof (vectorStore as any).similaritySearch === "function") {
              filterResults = await (vectorStore as any).similaritySearch("", 1, { id: connectedId });
              filterResults = filterResults.map((doc: any) => ({ doc }));
            } else {
              throw new Error("No compatible vector store method for id-based lookup");
            }
            if (filterResults.length > 0) {
              const connectedDoc = filterResults[0].doc;
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
        input: context.query,
        output: { documentCount: results.length },
        traceId: span.spanContext().traceId,
      });
      if (!span) throw new Error("Tracing span is undefined");
      span.end();
      return {
        documents: results,
        count: results.length,
      };
    } catch (error) {
      if (!span) throw new Error("Tracing span is undefined");
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) });
      langfuse.logWithTraceContext("Error querying graph RAG", { error });
      if (!span) throw new Error("Tracing span is undefined");
      span.end();
      return { documents: [], count: 0 };
    }
  },
});
