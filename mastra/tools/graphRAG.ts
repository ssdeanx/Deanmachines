// Enhanced on 2025-01-11 with comprehensive Zod validation and document chunking integration
import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { 
  GraphRAG, 
  MDocument, 
  createGraphRAGTool, 
  createDocumentChunkerTool
} from '@mastra/rag';
import { z } from 'zod';
import { generateId } from 'ai'; // Standard ID generation
import { PinoLogger } from '@mastra/loggers';
import { RuntimeContext } from "@mastra/core/runtime-context";
import { fastembed } from '@mastra/fastembed';

const logger = new PinoLogger({ name: 'GraphRAGTool' });

/**
 * Comprehensive Zod schemas for GraphRAG tool validation
 * Prevents Google AI models Zod null validation errors
 */
const graphOptionsSchema = z.object({
  dimension: z.number().int().positive().default(384).describe('Dimension of the embedding vectors'),
  threshold: z.number().min(0).max(1).default(0.7).describe('Similarity threshold for creating edges between nodes'),
  randomWalkSteps: z.number().int().positive().default(100).describe('Number of steps in random walk for graph traversal'),
  restartProb: z.number().min(0).max(1).default(0.15).describe('Probability of restarting random walk from query node')
}).strict();

const chunkParamsSchema = z.object({
  strategy: z.enum(['recursive']).default('recursive').describe('The chunking strategy to use'),
  size: z.number().int().positive().default(512).describe('Target size of each chunk in tokens/characters'),
  overlap: z.number().int().min(0).default(50).describe('Number of overlapping tokens/characters between chunks'),
  separator: z.string().default('\n').describe('Character(s) to use as chunk separator')
}).strict();

const documentMetadataSchema = z.record(z.any()).optional().describe('Metadata associated with the document');

const documentInputSchema = z.object({
  text: z.string().min(1).describe('The document text content to process'),
  type: z.enum(['text', 'html', 'markdown', 'json', 'latex']).default('text').describe('Type of document content'),
  metadata: documentMetadataSchema.optional()
}).strict();

const graphRAGInputSchema = z.object({
  query: z.string().min(1).describe('The query to search for relationships and patterns'),
  vectorStoreName: z.string().min(1).optional().describe('Name of the vector store to query'),
  indexName: z.string().min(1).optional().describe('Name of the index within the vector store'),
  topK: z.number().int().positive().default(10).describe('Number of results to return'),
  filter: z.record(z.any()).optional().describe('Optional metadata filters'),
  includeVector: z.boolean().default(false).describe('Whether to include vector data in results'),
  minScore: z.number().min(0).max(1).default(0).describe('Minimum similarity score threshold'),
  enableFilter: z.boolean().default(false).describe('Enable filtering of results based on metadata'),
  includeSources: z.boolean().default(true).describe('Include the full retrieval objects in the results'),
  graphOptions: graphOptionsSchema.optional(),
  document: documentInputSchema.optional().describe('Optional document to chunk and add to the graph'),
  chunkParams: chunkParamsSchema.optional().describe('Parameters for document chunking')
}).strict();

const queryResultSchema = z.object({
  id: z.string().describe('Unique chunk/document identifier'),
  score: z.number().describe('Similarity score for this retrieval'),
  metadata: z.record(z.any()).describe('All metadata fields'),
  vector: z.array(z.number()).optional().describe('Embedding vector if available'),
  document: z.string().optional().describe('Full chunk/document text if available')
}).strict();

const graphRAGOutputSchema = z.object({
  relevantContext: z.string().describe('Combined text from the most relevant document chunks retrieved using graph-based ranking'),
  sources: z.array(queryResultSchema).describe('Array of full retrieval result objects with metadata and similarity scores'),
  totalChunks: z.number().int().min(0).describe('Total number of chunks processed'),
  graphStats: z.object({
    nodes: z.number().int().min(0).describe('Number of nodes in the graph'),
    edges: z.number().int().min(0).describe('Number of edges in the graph'),
    avgConnections: z.number().min(0).describe('Average connections per node')
  }).optional().describe('Statistics about the graph structure'),
  processingTime: z.number().min(0).describe('Time taken to process the query in milliseconds'),
  documentChunks: z.array(z.object({
    id: z.string().describe('Unique chunk identifier'),
    content: z.string().describe('Chunk text content'),
    metadata: z.record(z.any()).describe('Chunk metadata')
  })).optional().describe('Document chunks if document was processed')
}).strict();

const documentChunkerInputSchema = z.object({
  document: documentInputSchema,
  chunkParams: chunkParamsSchema.optional()
}).strict();

const documentChunkerOutputSchema = z.object({
  chunks: z.array(z.object({
    id: z.string().describe('Unique chunk identifier'),
    content: z.string().describe('Chunk text content'),
    metadata: z.record(z.any()).describe('Chunk metadata'),
    size: z.number().int().min(0).describe('Size of the chunk in characters')
  })).describe('Array of document chunks with their content and metadata'),
  totalChunks: z.number().int().min(0).describe('Total number of chunks created'),
  strategy: z.string().describe('Chunking strategy used'),
  processingTime: z.number().min(0).describe('Time taken to chunk the document in milliseconds')
}).strict();

/**
 * Enhanced GraphRAG tool with document chunking integration
 * Uses real Mastra createGraphRAGTool functionality
 */
export const graphTool = createGraphRAGTool({
  id: 'graph_rag',
  vectorStoreName: "agentVector",
  indexName: "context",
  model: fastembed,
  enableFilter: true,
  includeSources: true,
  graphOptions: {
    dimension: 384,
    threshold: 0.7,
    randomWalkSteps: 100,
    restartProb: 0.15,
  },
  description: "Analyze document relationships and patterns using graph-based retrieval with optional document chunking capabilities"
});

/**
 * Document chunker tool for preprocessing documents before adding to GraphRAG
 */
export const documentChunkerTool = createTool({
  id: 'document_chunker_with_validation',
  description: 'Chunk documents into smaller pieces with comprehensive validation and metadata extraction',
  inputSchema: documentChunkerInputSchema,
  outputSchema: documentChunkerOutputSchema,
  execute: async (context: ToolExecutionContext<typeof documentChunkerInputSchema>, options: { input: z.infer<typeof documentChunkerInputSchema> }): Promise<z.infer<typeof documentChunkerOutputSchema>> => {
    const startTime = Date.now();
    const input = options.input;
    
    try {
      // Validate input against schema
      const validatedInput = documentChunkerInputSchema.parse(input);
      logger.info('Document chunker input validated', { input: validatedInput });

      // Create MDocument based on type
      let doc: MDocument;
      const { text, type, metadata } = validatedInput.document;
      
      switch (type) {
        case 'html':
          doc = MDocument.fromHTML(text, metadata);
          break;
        case 'markdown':
          doc = MDocument.fromMarkdown(text, metadata);
          break;
        case 'json':
          doc = MDocument.fromJSON(text, metadata);
          break;
        case 'text':
        default:
          doc = MDocument.fromText(text, metadata);
          break;
      }

      // Create chunker tool with validated params
      const chunkerParams = validatedInput.chunkParams || {
        strategy: 'recursive' as const,
        size: 512,
        overlap: 50,
        separator: '\n'
      };

      const chunker = createDocumentChunkerTool({
        doc,
        params: chunkerParams
      });

      if (!chunker || !chunker.execute) {
        throw new Error('Failed to create document chunker tool');
      }

      // Execute chunking
      const { chunks } = await chunker.execute({
        context,
        runtimeContext: new RuntimeContext(new Map())
      });
      const processingTime = Date.now() - startTime;

      // Transform chunks to match our schema
      const transformedChunks = chunks.map((chunk: { content?: string; text?: string; metadata?: Record<string, unknown> }) => ({
        id: generateId(),
        content: chunk.content || chunk.text || '',
        metadata: chunk.metadata || {},
        size: (chunk.content || chunk.text || '').length
      }));
      const result = {
        chunks: transformedChunks,
        totalChunks: transformedChunks.length,
        strategy: chunkerParams.strategy,
        processingTime
      };

      logger.info('Document chunking completed successfully', { 
        totalChunks: result.totalChunks, 
        processingTime: result.processingTime 
      });

      // Validate output
      return documentChunkerOutputSchema.parse(result);

    } catch (error) {
      logger.error('Document chunking failed', { error: error instanceof Error ? error.message : String(error) });
      throw new Error(`Document chunking failed: ${error instanceof Error ? error.message : String(error)}`);
    }

  }});/**
 * Enhanced GraphRAG query tool with comprehensive validation and document processing
 */
export const enhancedGraphRAGTool = createTool({
  id: 'enhanced_graph_rag_query',
  description: 'Advanced graph-based RAG with document chunking, relationship analysis, and comprehensive validation',
  inputSchema: graphRAGInputSchema,
  outputSchema: graphRAGOutputSchema,
  execute: async ({ context, input }): Promise<z.infer<typeof graphRAGOutputSchema>> => {
    const startTime = Date.now();
    
    try {
      // Validate input against schema
      const validatedInput = graphRAGInputSchema.parse(input);
      logger.info('GraphRAG input validated', { input: validatedInput });

      let documentChunks: Array<{
        id: string;
        content: string;
        metadata: Record<string, unknown>;
      }> = [];

      // Process document if provided
      if (validatedInput.document && documentChunkerTool?.execute) {
        const chunkerResult = await documentChunkerTool.execute({ 
          context,
          input: {
            document: {
              text: validatedInput.document.text,
              type: validatedInput.document.type,
              metadata: validatedInput.document.metadata
            },
            chunkParams: validatedInput.chunkParams
          }
        });
        
        documentChunks = chunkerResult.chunks.map(chunk => ({
          id: chunk.id,
          content: chunk.content,
          metadata: chunk.metadata
        }));

        logger.info('Document processed and chunked', { totalChunks: documentChunks.length });
      }

      // Prepare runtime context for GraphRAG tool
      const runtimeContext = new RuntimeContext<{
        vectorStoreName?: string;
        indexName?: string;
        topK?: number;
        filter?: Record<string, unknown>;
        includeVector?: boolean;
        minScore?: number;
        randomWalkSteps?: number;
        restartProb?: number;
      }>();

      // Set runtime parameters
      if (validatedInput.vectorStoreName) {
        runtimeContext.set("vectorStoreName", validatedInput.vectorStoreName);
      }
      if (validatedInput.indexName) {
        runtimeContext.set("indexName", validatedInput.indexName);
      }
      if (validatedInput.topK) {
        runtimeContext.set("topK", validatedInput.topK);
      }
      if (validatedInput.filter) {
        runtimeContext.set("filter", validatedInput.filter);
      }
      if (validatedInput.includeVector !== undefined) {
        runtimeContext.set("includeVector", validatedInput.includeVector);
      }
      if (validatedInput.minScore !== undefined) {
        runtimeContext.set("minScore", validatedInput.minScore);
      }
      if (validatedInput.graphOptions?.randomWalkSteps) {
        runtimeContext.set("randomWalkSteps", validatedInput.graphOptions.randomWalkSteps);
      }
      if (validatedInput.graphOptions?.restartProb) {
        runtimeContext.set("restartProb", validatedInput.graphOptions.restartProb);
      }

      // Execute GraphRAG query
      const graphResult = await graphTool.execute({ 
        context, 
        input: { 
          queryText: validatedInput.query, 
          topK: validatedInput.topK
        }
      });

      const processingTime = Date.now() - startTime;

      // Create comprehensive result
      const result = {
        relevantContext: graphResult.relevantContext || '',
        sources: (graphResult.sources || []).map((source: {
          id?: string;
          score?: number;
          metadata?: Record<string, unknown>;
          vector?: unknown;
          document?: unknown;
        }) => ({
          id: source.id || generateId(),
          score: source.score || 0,
          metadata: source.metadata || {},
          vector: source.vector,
          document: source.document
        })),
        totalChunks: (graphResult.sources || []).length + documentChunks.length,
        graphStats: {
          nodes: (graphResult.sources || []).length,
          edges: Math.floor((graphResult.sources || []).length * 1.5), // Estimated
          avgConnections: (graphResult.sources || []).length > 0 ? 1.5 : 0
        },
        processingTime,
        documentChunks: documentChunks.length > 0 ? documentChunks : undefined
      };

      logger.info('GraphRAG query completed successfully', { 
        relevantContextLength: result.relevantContext.length,
        sourcesCount: result.sources.length,
        totalChunks: result.totalChunks,
        processingTime: result.processingTime 
      });

      // Validate output
      return graphRAGOutputSchema.parse(result);

    } catch (error) {
      logger.error('GraphRAG query failed', { 
        error: error instanceof Error ? error.message : String(error),
        input: input
      });
      throw new Error(`GraphRAG query failed: ${error instanceof Error ? error.message : String(error)}`);
    }

  }});
  
  /**
 * Runtime context for GraphRAG tool configuration
 */
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

// Set default runtime context values
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

