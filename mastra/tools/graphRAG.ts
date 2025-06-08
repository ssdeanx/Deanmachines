// Generated on 2024-07-26
import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { GraphRAG, MDocument } from '@mastra/rag'; // Added GraphChunk and RankedNode
import { z } from 'zod';
import { generateId } from 'ai'; // Standard ID generation
import { PinoLogger } from '@mastra/loggers';
import { RuntimeContext } from "@mastra/core/runtime-context";
import { createGraphRAGTool } from "@mastra/rag";
import { google } from '@ai-sdk/google';
import { fastembed } from '@mastra/fastembed';
const logger = new PinoLogger({ name: 'GraphRAGTool' });


/**
 * @interface IGraphRAGInput
 * @description Defines the input schema for the GraphRAG tool.
 * @property {IUserDocumentChunk[]} documentChunks - An array of document chunks to build the graph from.
 * @property {number[][]} embeddings - An array of embeddings corresponding to the documentChunks.
 * @property {number[]} queryEmbedding - The embedding of the query to search the graph.
 * @property {{ dimension: number; threshold?: number }} [graphRAGConfig] - Configuration for the GraphRAG instance.
 * @property {{ topK?: number; randomWalkSteps?: number; restartProb?: number }} [queryConfig] - Configuration for the query operation.
 */
export const GraphRAGInputSchema = z.object({
  documentChunks: z.array(z.instanceof(MDocument)).min(1, "At least one document chunk is required."),
  embeddings: z.array(z.array(z.number()))
    .min(1, "Embeddings array cannot be empty.")
    .refine(data => data.every(embedding => embedding.length > 0), {
      message: "All embeddings must have a non-zero length.",
    }),
  queryEmbedding: z.array(z.number()).min(1, "Query embedding cannot be empty."),
  graphRAGConfig: z.object({
    dimension: z.number().positive("Dimension must be a positive number."),
    threshold: z.number().optional(),
  }).optional(),
  queryConfig: z.object({
    topK: z.number().positive("topK must be a positive number.").optional(),
    randomWalkSteps: z.number().int().positive("randomWalkSteps must be a positive integer.").optional(),
    restartProb: z.number().min(0).max(1, "restartProb must be between 0 and 1.").optional(),
  }).optional(),
}).refine(data => data.documentChunks.length === data.embeddings.length, {
  message: "The number of document chunks must match the number of embeddings.",
  path: ["embeddings"], // Path to highlight for this error
});
export type IGraphRAGInput = z.infer<typeof GraphRAGInputSchema>;

/**
 * @interface IGraphRAGOutputNode
 * @description Defines the structure for a single node in the GraphRAG tool output.
 * @property {string} id - The identifier of the result node (preferably the user-provided chunk ID).
 * @property {string} content - The textual content of the result node.
 * @property {number} score - The relevance score of the result node.
 * @property {Record<string, any>} [metadata] - Metadata associated with the result node.
 */
export const GraphRAGOutputNodeSchema = z.object({
  id: z.string(),
  content: z.string(),
  score: z.number(),
  metadata: z.record(z.any()).optional(),
});

/**
 * @interface IGraphRAGOutput
 * @description Defines the output schema for the GraphRAG tool.
 * @property {IGraphRAGOutputNode[]} results - An array of ranked nodes from the graph query.
 */
export const GraphRAGOutputSchema = z.object({
  results: z.array(GraphRAGOutputNodeSchema),
});
export type IGraphRAGOutput = z.infer<typeof GraphRAGOutputSchema>;

export const graphTool = createGraphRAGTool({
  vectorStoreName: "agentVector",
  indexName: "context",
  model: fastembed,
  graphOptions: {
    dimension: 384,
    threshold: 0.7,
    randomWalkSteps: 100,
    restartProb: 0.15,
  },
  description:
    "Analyze context relationships to find complex patterns and connections in the data",
});

export const runtimeContext = new RuntimeContext<{
  vectorStoreName: string;
  indexName: string;
  topK: number;
  filter: any;
  model: string;
  description: string;
  graphOptions: {
    dimension: number;
    threshold: number;
    randomWalkSteps: number;
    restartProb: number;
  };
}>();
runtimeContext.set("vectorStoreName", "agentVector");
runtimeContext.set("indexName", "context");
runtimeContext.set("topK", 5);
runtimeContext.set("filter", { category: "context" });
runtimeContext.set("model", "fastembed");
runtimeContext.set("description", "Analyze context relationships to find complex patterns and connections in the data");
runtimeContext.set("graphOptions", {
  dimension: 384,
  threshold: 0.7,
  randomWalkSteps: 100,
  restartProb: 0.15,
});

/**
 * GraphRAG Query Tool
 *
 * Builds a knowledge graph from documents and embeddings, then queries it for relevant nodes.
 *
 * @see https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/reference/tools/create-tool.mdx
 * @module tools
 */
export const graphRAGTool = createTool({
  id: "perform_graph_rag_query",
  description: "Builds a knowledge graph from documents and embeddings, then queries it.",
  inputSchema: GraphRAGInputSchema,
  outputSchema: GraphRAGOutputSchema,
  async execute({ context }) {
    try {
      const parsed = GraphRAGInputSchema.parse(context);
      const { documentChunks, embeddings, queryEmbedding, graphRAGConfig, queryConfig } = parsed;

      // Build the graph with correct constructor
      const graph = new GraphRAG(
        graphRAGConfig?.dimension || queryEmbedding.length,
        graphRAGConfig?.threshold
      );

      // Add nodes: extract content and metadata from MDocument
      for (let i = 0; i < documentChunks.length; i++) {
        const doc = documentChunks[i];
        // MDocument.getDocs() returns array of { text, metadata }
        const docs = typeof doc.getDocs === 'function' ? doc.getDocs() : [];
        const text = docs[0]?.text || (typeof doc.getText === 'function' ? doc.getText()[0] : '');
        const metadata = docs[0]?.metadata || (typeof doc.getMetadata === 'function' ? doc.getMetadata()[0] : {});
        graph.addNode({
          id: generateId(),
          content: text,
          embedding: embeddings[i],
          metadata,
        });
      }

      // Query the graph (query: number[])
      const results = graph.query({
        query: queryEmbedding,
        topK: queryConfig?.topK,
        randomWalkSteps: queryConfig?.randomWalkSteps,
        restartProb: queryConfig?.restartProb,
      });

      // Format output
      return {
        results: results.map((node: any) => ({
          id: node.id,
          content: node.content,
          score: node.score,
          metadata: node.metadata,
        })),
      };
    } catch (error) {
      logger.error("GraphRAG tool execution failed", { error });
      throw error;
    }
  },
});

/**
 * Exports the GraphRAG tool for use in Mastra agentic workflows and toolsets.
 */
export default graphRAGTool;
// Generated on 2025-06-01
// TODO: Add more robust type guards if MDocument is not a Zod schema instance.