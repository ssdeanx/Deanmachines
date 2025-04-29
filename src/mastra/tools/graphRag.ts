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
import { createLogger } from "@mastra/core/logger";
import { getTracer } from "../services/tracing";
const logger = createLogger({ name: "graphRagLoaders", level: "info" });
const tracer = getTracer();
// LAZY LANGFUSE: see below for dynamic import in each function that uses langfuse
import { createTracedSpan } from "../services/tracing";

/**
 * In-memory graph store keyed by namespace.
 * This is for demo/prototype only; replace with persistent storage for production.
 */
type GraphStoreNode = {
  id: string;
  content?: string;
  metadata?: Record<string, unknown>;
  connections: string[];
  connectionWeights: Record<string, number>;
};
type GraphStoreEdge = {
  from: string;
  to: string;
  weight: number;
};
type GraphStore = {
  nodes: Record<string, GraphStoreNode>;
  edges: Record<string, GraphStoreEdge>;
};
const graphStore: Record<string, GraphStore> = {};


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
    // Enforce type safety: ensure metadata is a valid GraphNode
    assertGraphNode(doc.metadata, `Document at index ${idx} has invalid GraphNode metadata`);
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

      (await import("../services/langfuse")).langfuse.logGeneration("graph-rag-create", {
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
      (await import("../services/langfuse")).langfuse.logWithTraceContext("Error creating graph RAG", { error });
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
    // Start tracing for observability
    const span = createTracedSpan("graph-rag-query", { context });
    if (!span) throw new Error("Tracing span is undefined");
    try {
      // Create embeddings model and vector store using project factories
      const embeddings = createEmbeddings();
      const vectorStore = await createVectorStore(embeddings);

      // Initial document retrieval using the unified vector store
      let initialResults;
      if (typeof (vectorStore as any).query === "function") {
        initialResults = await (vectorStore as any).query(context.query, {
          topK: context.initialDocumentCount,
          minScore: context.minSimilarity,
          namespace: context.namespace || "default"
        });
      } else {
        throw new Error("Vector store does not support querying");
      }

      // Build in-memory graph for traversal
      const ns = context.namespace || "default";
      const graph = graphStore[ns];
      if (!graph) {
        span.setStatus({ code: 2, message: "Graph not found for namespace" });
        (await import("../services/langfuse")).langfuse.logWithTraceContext("Graph not found for namespace", { ns });
        span.end();
        return { documents: [], count: 0 };
      }

      // Traverse graph from initial results, up to maxHopCount
      const retrievedNodes: Record<string, any> = {};
      const exploreQueue: Array<[string, number]> = [];
      for (const doc of initialResults) {
        if (!doc.metadata?.id) continue;
        retrievedNodes[doc.metadata.id] = {
          document: doc,
          score: doc.score || 1,
          hopDistance: 0,
        };
        exploreQueue.push([doc.metadata.id, 0]);
      }
      while (exploreQueue.length > 0) {
        const [nodeId, hopDistance] = exploreQueue.shift()!;
        if (hopDistance >= (context.maxHopCount ?? 2)) continue;
        const node = graph.nodes[nodeId];
        if (!node) continue;
        for (const connectedId of node.connections) {
          if (retrievedNodes[connectedId]) continue;
          try {
            const connectedDoc = initialResults.find((d: any) => d.metadata?.id === connectedId) || {
              pageContent: node.content || "",
              metadata: node.metadata || {},
            };
            const connectionWeight = node.connectionWeights[connectedId] || 0.5;
            retrievedNodes[connectedId] = {
              document: connectedDoc,
              score: (retrievedNodes[nodeId].score || 1) * connectionWeight,
              hopDistance: hopDistance + 1,
            };
            exploreQueue.push([connectedId, hopDistance + 1]);
          } catch (error) {
            // Log but do not throw
            (await import("../services/langfuse")).langfuse.logWithTraceContext("Error retrieving connected node", { connectedId, error });
          }
        }
      }

      // Format and sort results
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

      // Log generation event using Langfuse
      await (await import("../services/langfuse")).langfuse.logGeneration("graph-rag-query-generation", {
        input: context.query,
        output: { documentCount: results.length },
        traceId: span.spanContext().traceId,
      });
      span.end();
      return {
        documents: results,
        count: results.length,
      };
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) });
      (await import("../services/langfuse")).langfuse.logWithTraceContext("Error querying graph RAG", { error });
      span.end();
      return { documents: [], count: 0 };
    }
  },
});

/**
 * Tool for graph visualization (exporting nodes/edges/weights for D3, etc)
 */
export const graphRagVisualizationTool = createTool({
  id: "graph-rag-visualization",
  description: "Exports the current graph structure for visualization (nodes, edges, weights)",
  inputSchema: z.object({
    namespace: z.string().optional().describe("Namespace for the graph"),
    format: z.enum(["json", "dot", "gexf"]).optional().default("json"),
  }),
  execute: async ({ context }) => {
    // Visualization/export: return nodes/edges/weights for D3 etc.
    const ns = context.namespace || "default";
    const graph = graphStore[ns];
    if (!graph) return { nodes: [], edges: [], format: context.format || "json" };
    const nodes = Object.values(graph.nodes).map((n: GraphStoreNode) => ({ ...n }));
    const edges = Object.values(graph.edges).map((e: GraphStoreEdge) => ({ from: e.from, to: e.to, weight: e.weight }));
    // Optionally support multiple formats (json/dot/gexf)
    return { nodes, edges, format: context.format || "json" };
  },
});

/**
 * Tool for graph node/edge inspection
 */
export const graphRagInspectorTool = createTool({
  id: "graph-rag-inspector",
  description: "Inspects metadata, content, and connections for specific node(s)",
  inputSchema: z.object({
    nodeIds: z.array(z.string()),
    namespace: z.string().optional(),
  }),
  execute: async ({ context }) => {
    // Node/edge inspection
    const ns = context.namespace || "default";
    const graph = graphStore[ns];
    if (!graph) return { nodes: [] };
    const result = context.nodeIds.map(id => graph.nodes[id]).filter(Boolean);
    return { nodes: result };
  },
});

/**
 * Tool for graph editing (add/remove nodes/edges, update weights)
 */
export const graphRagEditTool = createTool({
  id: "graph-rag-edit",
  description: "Adds/removes nodes/edges or updates weights in the graph",
  inputSchema: z.object({
    action: z.enum(["addNode", "removeNode", "addEdge", "removeEdge", "updateWeight"]),
    node: z.any().optional(),
    edge: z.object({ from: z.string(), to: z.string() }).optional(),
    weight: z.number().optional(),
    namespace: z.string().optional(),
  }),
  execute: async ({ context }) => {
    // Graph editing (add/remove node/edge, update weight)
    const ns = context.namespace || "default";
    if (!graphStore[ns]) graphStore[ns] = { nodes: {}, edges: {} };
    const graph = graphStore[ns];
    let msg = "";
    switch (context.action) {
      case "addNode": {
        // Strict validation and type safety
        if (!context.node || typeof context.node.id !== 'string' || !context.node.id.trim()) {
          logger.warn("Attempted to add node with missing or invalid id", { context });
          return { success: false, message: "Missing or invalid node id" };
        }
        // Enforce type safety: validate node before adding
        assertGraphNode(context.node, "Attempted to add invalid node to graph");
        if (graph.nodes[context.node.id]) {
          logger.warn("Node already exists", { nodeId: context.node.id });
          return { success: false, message: `Node ${context.node.id} already exists` };
        }
        // Add node with type safety
        graph.nodes[context.node.id] = context.node;
        msg = `Node ${context.node.id} added.`;
        logger.info(msg, { nodeId: context.node.id });
        break;
      }
      case "removeNode": {
        // Strict validation and type safety
        if (!context.node || typeof context.node.id !== 'string' || !context.node.id.trim()) {
          logger.warn("Attempted to remove node with missing or invalid id", { context });
          return { success: false, message: "Missing or invalid node id" };
        }
        const nodeId = context.node.id;
        if (!graph.nodes[nodeId]) {
          logger.warn("Attempted to remove non-existent node", { nodeId });
          return { success: false, message: `Node ${nodeId} does not exist` };
        }
        delete graph.nodes[nodeId];
        // Remove all edges connected to this node
        Object.keys(graph.edges).forEach(eid => {
          const e = graph.edges[eid];
          if (e && (e.from === nodeId || e.to === nodeId)) delete graph.edges[eid];
        });
        // Remove this node from any other node's connections
        Object.values(graph.nodes).forEach(n => {
          if (n && typeof n === 'object' && Array.isArray(n.connections)) {
            n.connections = n.connections.filter(cid => cid !== nodeId);
            if (n.connectionWeights) delete n.connectionWeights[nodeId];
          }
        });
        msg = `Node ${nodeId} and its edges removed.`;
        logger.info(msg, { nodeId });
        break;
      }
      case "addEdge": {
        // Strict type guards for edge
        const edge = context.edge;
        if (!edge || typeof edge.from !== 'string' || typeof edge.to !== 'string' || !edge.from.trim() || !edge.to.trim()) {
          logger.warn("Attempted to add edge with missing or invalid endpoints", { context });
          return { success: false, message: "Missing or invalid edge endpoints" };
        }
        if (!graph.nodes[edge.from] || !graph.nodes[edge.to]) {
          logger.warn("Attempted to add edge between non-existent nodes", { edge });
          return { success: false, message: `Both nodes must exist to add an edge: ${edge.from}, ${edge.to}` };
        }
        const eid = `${edge.from}->${edge.to}`;
        if (graph.edges[eid]) {
          logger.warn("Edge already exists", { eid });
          return { success: false, message: `Edge ${eid} already exists` };
        }
        const weight = typeof context.weight === 'number' ? context.weight : 1;
        graph.edges[eid] = { from: edge.from, to: edge.to, weight };
        // Update node connections
        graph.nodes[edge.from].connections.push(edge.to);
        graph.nodes[edge.from].connectionWeights[edge.to] = weight;
        msg = `Edge ${eid} added.`;
        logger.info(msg, { eid });
        break;
      }
      case "removeEdge": {
        const edge = context.edge;
        if (!edge || typeof edge.from !== 'string' || typeof edge.to !== 'string' || !edge.from.trim() || !edge.to.trim()) {
          logger.warn("Attempted to remove edge with missing or invalid endpoints", { context });
          return { success: false, message: "Missing or invalid edge endpoints" };
        }
        const eid = `${edge.from}->${edge.to}`;
        if (!graph.edges[eid]) {
          logger.warn("Attempted to remove non-existent edge", { eid });
          return { success: false, message: `Edge ${eid} does not exist` };
        }
        delete graph.edges[eid];
        // Remove from node's connections
        if (graph.nodes[edge.from]) {
          graph.nodes[edge.from].connections = graph.nodes[edge.from].connections.filter(id => id !== edge.to);
          if (graph.nodes[edge.from].connectionWeights) delete graph.nodes[edge.from].connectionWeights[edge.to];
        }
        msg = `Edge ${eid} removed.`;
        logger.info(msg, { eid });
        break;
      }
      case "updateWeight": {
        const edge = context.edge;
        if (!edge || typeof edge.from !== 'string' || typeof edge.to !== 'string' || !edge.from.trim() || !edge.to.trim() || typeof context.weight !== 'number') {
          logger.warn("Attempted to update edge weight with missing/invalid endpoints or weight", { context });
          return { success: false, message: "Missing or invalid edge endpoints or weight" };
        }
        const eid = `${edge.from}->${edge.to}`;
        if (!graph.edges[eid]) {
          logger.warn("Attempted to update weight of non-existent edge", { eid });
          return { success: false, message: `Edge ${eid} does not exist` };
        }
        graph.edges[eid].weight = context.weight;
        if (graph.nodes[edge.from]) {
          graph.nodes[edge.from].connectionWeights[edge.to] = context.weight;
        }
        msg = `Edge ${eid} weight updated.`;
        logger.info(msg, { eid });
        break;
      }
      default:
        return { success: false, message: "Unknown action" };
    }
    return { success: true, message: msg };
  },
});
/**
 * Tool for graph pruning/optimization
 */
// (removed duplicate tool declaration)
export const graphRagPruneTool = createTool({
  id: "graph-rag-prune",
  description: "Prunes or optimizes the graph (removes or merges nodes/edges)",
  inputSchema: z.object({
    mode: z.enum(["pruneOrphans", "mergeDuplicates", "removeLowScoreEdges"]).optional(),
    threshold: z.number().optional(),
    namespace: z.string().optional(),
  }),
  execute: async ({ context }) => {
    // Pruning/optimization
    const ns = context.namespace || "default";
    const graph = graphStore[ns];
    if (!graph) return { success: false, message: "No graph in namespace" };
    let pruned = 0;
    switch (context.mode) {
      case "pruneOrphans":
        // Remove nodes with no connections
        Object.keys(graph.nodes).forEach(id => {
          if (!graph.nodes[id].connections.length) {
            delete graph.nodes[id];
            pruned++;
          }
        });
        break;
      case "mergeDuplicates":
        // Naive duplicate merge: nodes with same content
        const seen = {};
        Object.keys(graph.nodes).forEach(id => {
          const node = graph.nodes[id];
          if (!node || typeof node.content !== 'string') return;
          const content = node.content;
          if (seen[content]) {
            // Merge connections into first node
            seen[content].connections.push(...node.connections);
            Object.assign(seen[content].connectionWeights, node.connectionWeights);
            delete graph.nodes[id];
            pruned++;
          } else {
            seen[content] = node;
          }
        });
        break;
      case "removeLowScoreEdges":
        // Remove edges below threshold
        const thresh = typeof context.threshold === "number" ? context.threshold : 0.2;
        Object.keys(graph.edges).forEach(eid => {
          if (graph.edges[eid].weight < thresh) {
            delete graph.edges[eid];
            pruned++;
          }
        });
        break;
      default:
        return { success: false, message: "Unknown prune mode" };
    }
    return { success: true, pruned };
  },
});

/**
 * Tool for graph export/import
 */
// (removed duplicate tool declaration)
export const graphRagExportImportTool = createTool({
  id: "graph-rag-export-import",
  description: "Exports or imports the graph in standard formats (JSON, CSV, GraphML, etc)",
  inputSchema: z.object({
    direction: z.enum(["export", "import"]),
    format: z.enum(["json", "csv", "graphml"]).default("json"),
    data: z.any().optional(),
    namespace: z.string().optional(),
  }),
  execute: async ({ context }) => {
    // Export/import logic
    const ns = context.namespace || "default";
    if (context.direction === "export") {
      const graph = graphStore[ns];
      if (!graph) return { success: false, message: "No graph to export" };
      switch (context.format) {
        case "json":
          return { success: true, format: "json", data: JSON.stringify(graph) };
        case "csv":
          // Export as edge list CSV
          const csv = Object.values(graph.edges)
            .map(e => `${e.from},${e.to},${e.weight}`)
            .join("\n");
          return { success: true, format: "csv", data: csv };
        case "graphml":
          // Export as GraphML XML
          let xml = '<?xml version="1.0"?><graphml><graph id="G" edgedefault="directed">';
          Object.values(graph.nodes).forEach(n => {
            xml += `<node id="${n.id}"/>`;
          });
          Object.values(graph.edges).forEach(e => {
            xml += `<edge source="${e.from}" target="${e.to}" weight="${e.weight}"/>`;
          });
          xml += '</graph></graphml>';
          return { success: true, format: "graphml", data: xml };
        default:
          return { success: false, message: "Unknown export format" };
      }
    } else if (context.direction === "import") {
      // Import logic: parse and load graph
      switch (context.format) {
        case "json":
          try {
            const obj = JSON.parse(context.data);
            graphStore[ns] = obj;
            return { success: true };
          } catch (err) {
            return { success: false, message: "Invalid JSON: " + String(err) };
          }
        case "csv":
          // CSV: edge list
          const lines = context.data.split("\n").filter(Boolean);
          const nodes: Record<string, any> = {};
          const edges: Record<string, any> = {};
          lines.forEach(line => {
            const [from, to, weight] = line.split(",");
            if (!nodes[from]) nodes[from] = { id: from, connections: [to], connectionWeights: { [to]: Number(weight) } };
            else {
              nodes[from].connections.push(to);
              nodes[from].connectionWeights[to] = Number(weight);
            }
            if (!nodes[to]) nodes[to] = { id: to, connections: [], connectionWeights: {} };
            const eid = `${from}->${to}`;
            edges[eid] = { from, to, weight: Number(weight) };
          });
          graphStore[ns] = { nodes, edges };
          return { success: true };
        case "graphml":
          // Very basic GraphML import (nodes/edges only)
          try {
            const parser = typeof window !== 'undefined' && window.DOMParser ? window.DOMParser : (require('xmldom').DOMParser);
            const doc = new parser().parseFromString(context.data, "text/xml");
            const nodeEls = Array.from(doc.getElementsByTagName("node"));
            const edgeEls = Array.from(doc.getElementsByTagName("edge"));
            const nodes: Record<string, any> = {};
            const edges: Record<string, any> = {};
            nodeEls.forEach((n: any) => {
              nodes[n.getAttribute("id")] = { id: n.getAttribute("id"), connections: [], connectionWeights: {} };
            });
            edgeEls.forEach((e: any) => {
              const from = e.getAttribute("source");
              const to = e.getAttribute("target");
              const weight = Number(e.getAttribute("weight")) || 1;
              const eid = `${from}->${to}`;
              edges[eid] = { from, to, weight };
              if (nodes[from]) {
                nodes[from].connections.push(to);
                nodes[from].connectionWeights[to] = weight;
              }
            });
            graphStore[ns] = { nodes, edges };
            return { success: true };
          } catch (err) {
            return { success: false, message: "Invalid GraphML: " + String(err) };
          }
        default:
          return { success: false, message: "Unknown import format" };
      }
    } else {
      return { success: false, message: "Unknown direction" };
    }
  },
});

/**
 * Tool for graph observability/tracing
 */
// (removed duplicate tool declaration)
export const graphRagObservabilityTool = createTool({
  id: "graph-rag-observability",
  description: "Exposes detailed traces of retrieval, hops, and scoring for a query or node",
  inputSchema: z.object({
    query: z.string().optional(),
    nodeId: z.string().optional(),
    namespace: z.string().optional(),
    initialDocumentCount: z.number().optional().default(3),
    maxHopCount: z.number().optional().default(2),
    minSimilarity: z.number().optional().default(0.6),
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
      (await import("../services/langfuse")).langfuse.logGeneration("graph-rag-query-generation", {
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
      (await import("../services/langfuse")).langfuse.logWithTraceContext("Error querying graph RAG", { error });
      if (!span) throw new Error("Tracing span is undefined");
      span.end();
      return { documents: [], count: 0 };
    }
  },
});

export const graphRagTools = [
  graphRagVisualizationTool,
  graphRagInspectorTool,
  graphRagEditTool,
  graphRagPruneTool,
  graphRagExportImportTool,
  graphRagObservabilityTool,
];