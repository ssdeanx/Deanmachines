/**
 * GraphRAG Tool - Production-ready implementation for Dean Machines RSC
 * Uses createGraphRAGTool from @mastra/rag with Upstash Vector store integration
 * Supports chunking, embedding, upserting, and graph-based querying
 *
 * @author Dean Machines RSC Project
 * @version 2.0.1 - Complete rewrite using correct Mastra patterns
 */

import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { createGraphRAGTool, MDocument } from '@mastra/rag';
import { z } from 'zod';
import { generateId } from 'ai';
import { PinoLogger } from '@mastra/loggers';
import { RuntimeContext } from "@mastra/core/runtime-context";

import {
  upsertVectors,
  createVectorIndex,
  VECTOR_CONFIG,
  VectorStoreError
} from '../upstashMemory';
import { embedMany } from 'ai';
import { fastembed } from '@mastra/fastembed';

const logger = new PinoLogger({ name: 'GraphRAGTool' });

/**
 * Zod schemas for GraphRAG tool validation
 */
const documentInputSchema = z.object({
  text: z.string().min(1).describe('The document text content to process'),
  type: z.enum(['text', 'html', 'markdown', 'json', 'latex']).default('text').describe('Type of document content'),
  metadata: z.record(z.any()).optional().describe('Metadata associated with the document')
}).strict();

const chunkParamsSchema = z.object({
  strategy: z.enum(['recursive']).default('recursive').describe('The chunking strategy to use'),
  size: z.number().int().positive().default(512).describe('Target size of each chunk in tokens/characters'),
  overlap: z.number().int().min(0).default(50).describe('Number of overlapping tokens/characters between chunks'),
  separator: z.string().default('\n').describe('Character(s) to use as chunk separator')
}).strict();

const upsertInputSchema = z.object({
  document: documentInputSchema,
  chunkParams: chunkParamsSchema.optional(),
  indexName: z.string().default('context').describe('Name of the index to upsert to'),
  createIndex: z.boolean().default(true).describe('Whether to create the index if it does not exist')
}).strict();

const upsertOutputSchema = z.object({
  success: z.boolean().describe('Whether the upsert operation was successful'),
  chunksProcessed: z.number().int().min(0).describe('Number of chunks processed and upserted'),
  indexName: z.string().describe('Name of the index used'),
  processingTime: z.number().min(0).describe('Time taken to process and upsert in milliseconds'),
  chunkIds: z.array(z.string()).describe('Array of chunk IDs that were upserted')
}).strict();

const queryInputSchema = z.object({
  query: z.string().min(1).describe('The query to search for relationships and patterns'),
  indexName: z.string().default('context').describe('Name of the index to query'),
  topK: z.number().int().positive().default(10).describe('Number of results to return'),
  threshold: z.number().min(0).max(1).default(0.7).describe('Similarity threshold for graph connections'),
  includeVector: z.boolean().default(false).describe('Whether to include vector data in results'),
  minScore: z.number().min(0).max(1).default(0).describe('Minimum similarity score threshold')
}).strict();

const queryResultSchema = z.object({
  id: z.string().describe('Unique chunk/document identifier'),
  score: z.number().describe('Similarity score for this retrieval'),
  content: z.string().describe('The chunk content'),
  metadata: z.record(z.any()).describe('All metadata fields'),
  vector: z.array(z.number()).optional().describe('Embedding vector if requested')
}).strict();

const queryOutputSchema = z.object({
  relevantContext: z.string().describe('Combined text from the most relevant document chunks'),
  sources: z.array(queryResultSchema).describe('Array of full retrieval result objects with metadata and similarity scores'),
  totalResults: z.number().int().min(0).describe('Total number of results found'),
  graphStats: z.object({
    nodes: z.number().int().min(0).describe('Number of nodes in the graph'),
    edges: z.number().int().min(0).describe('Number of edges in the graph'),
    avgScore: z.number().min(0).describe('Average similarity score')
  }).describe('Statistics about the graph structure'),
  processingTime: z.number().min(0).describe('Time taken to process the query in milliseconds')
}).strict();

/**
 * Runtime context type for GraphRAG tool configuration
 */
export type GraphRAGRuntimeContext = {
  indexName: string;
  topK: number;
  threshold: number;
  minScore: number;
  dimension: number;
  userId?: string;
  sessionId?: string;
  category?: string;
  debug?: boolean;
};

/**
 * Document upsert tool - Handles chunking, embedding, and storing documents
 */
export const graphRAGUpsertTool = createTool({
  id: 'graph_rag_upsert',
  description: 'Chunk documents, create embeddings, and upsert them to the Upstash Vector store for GraphRAG retrieval',
  inputSchema: upsertInputSchema,
  outputSchema: upsertOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof upsertInputSchema> & { 
    input: z.infer<typeof upsertInputSchema>;
    runtimeContext?: RuntimeContext<GraphRAGRuntimeContext>;
  }): Promise<z.infer<typeof upsertOutputSchema>> => {
    const startTime = Date.now();
    
    try {
      const validatedInput = upsertInputSchema.parse(input);
      
      // Get runtime context values
      const userId = runtimeContext?.get('userId') || 'anonymous';
      const sessionId = runtimeContext?.get('sessionId') || 'default';
      const debug = runtimeContext?.get('debug') || false;
      
      if (debug) {
        logger.info('Starting document upsert', { 
          textLength: validatedInput.document.text.length,
          type: validatedInput.document.type,
          indexName: validatedInput.indexName,
          userId,
          sessionId
        });
      }

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
        case 'latex':
          doc = MDocument.fromText(text, metadata); // Fallback to text for LaTeX
          break;
        case 'text':
        default:
          doc = MDocument.fromText(text, metadata);
          break;
      }

      // Chunk the document
      const chunkParams = validatedInput.chunkParams || {
        strategy: 'recursive' as const,
        size: 512,
        overlap: 50,
        separator: '\n'
      };

      const chunks = await doc.chunk({
        strategy: chunkParams.strategy,
        size: chunkParams.size,
        overlap: chunkParams.overlap,
        separator: chunkParams.separator
      });

      logger.info('Document chunked successfully', { totalChunks: chunks.length });

      // Create embeddings
      const chunkTexts = chunks.map(chunk => chunk.text);
      const { embeddings } = await embedMany({
        model: fastembed,
        values: chunkTexts
      });

      // Create index if needed (Upstash Vector auto-creates indexes)
      if (validatedInput.createIndex) {
        try {
          await createVectorIndex(
            validatedInput.indexName,
            VECTOR_CONFIG.EMBEDDING_DIMENSION, // 384 dimensions for fastembed compatibility
            VECTOR_CONFIG.DISTANCE_METRIC // cosine similarity
          );
          logger.info('Upstash Vector index validated', { indexName: validatedInput.indexName });
        } catch (error) {
          // Index might already exist, continue
          logger.warn('Index validation warning (might already exist)', {
            indexName: validatedInput.indexName,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Upsert embeddings and metadata
      const chunkIds: string[] = [];
      const metadataArray = chunks.map((chunk, index) => {
        const chunkId = generateId();
        chunkIds.push(chunkId);
        return {
          id: chunkId,
          text: chunk.text,
          ...chunk.metadata,
          ...metadata,
          chunkIndex: index,
          totalChunks: chunks.length,
          strategy: chunkParams.strategy,
          chunkSize: chunk.text.length
        };
      });

      // Upsert vectors to Upstash Vector with sparse cosine similarity
      await upsertVectors(
        validatedInput.indexName,
        embeddings,
        metadataArray,
        chunkIds
      );

      const processingTime = Date.now() - startTime;
      
      const result = {
        success: true,
        chunksProcessed: chunks.length,
        indexName: validatedInput.indexName,
        processingTime,
        chunkIds
      };

      logger.info('Document upsert completed successfully', result);
      return upsertOutputSchema.parse(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Document upsert failed', {
        error: errorMessage,
        indexName: input.indexName || 'context'
      });

      // Throw VectorStoreError for better error handling
      throw new VectorStoreError(
        `GraphRAG document upsert failed: ${errorMessage}`,
        'operation_failed',
        {
          indexName: input.indexName || 'context',
          documentType: input.document?.type,
          processingTime: Date.now() - startTime
        }
      );
    }
  }
});

/**
 * GraphRAG query tool - Uses createGraphRAGTool with Upstash Vector store and sparse cosine similarity
 */
export const graphRAGTool = createGraphRAGTool({
  vectorStoreName: 'upstashVector',
  indexName: VECTOR_CONFIG.DEFAULT_INDEX_NAME,
  model: fastembed,
  graphOptions: {
    dimension: VECTOR_CONFIG.EMBEDDING_DIMENSION, // 384 dimensions for fastembed
    threshold: 0.7
  }
});

/**
 * Enhanced GraphRAG query tool with comprehensive validation
 */
export const graphRAGQueryTool = createTool({
  id: 'graph_rag_query',
  description: 'Query the GraphRAG system for complex document relationships and patterns using graph-based retrieval',
  inputSchema: queryInputSchema,
  outputSchema: queryOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof queryInputSchema> & { 
    input: z.infer<typeof queryInputSchema>;
    runtimeContext?: RuntimeContext<GraphRAGRuntimeContext>;
  }): Promise<z.infer<typeof queryOutputSchema>> => {
    const startTime = Date.now();
    
    try {
      const validatedInput = queryInputSchema.parse(input);
      
      // Get runtime context values
      const userId = runtimeContext?.get('userId') || 'anonymous';
      const sessionId = runtimeContext?.get('sessionId') || 'default';
      const debug = runtimeContext?.get('debug') || false;
      const indexName = runtimeContext?.get('indexName') || validatedInput.indexName;
      const topK = runtimeContext?.get('topK') || validatedInput.topK;
      const threshold = runtimeContext?.get('threshold') || validatedInput.threshold;
      
      if (debug) {
        logger.info('Starting GraphRAG query', { 
          query: validatedInput.query,
          indexName,
          topK,
          threshold,
          userId,
          sessionId
        });
      }

      // Create runtime context for the GraphRAG tool
      const graphRAGContext = new RuntimeContext();
      graphRAGContext.set('indexName', indexName);
      graphRAGContext.set('topK', topK);
      graphRAGContext.set('threshold', threshold);
      graphRAGContext.set('minScore', validatedInput.minScore);

      // Execute the GraphRAG query
      const graphResult = await graphRAGTool.execute({
        context: {
          queryText: validatedInput.query,
          topK: validatedInput.topK,
          includeVector: validatedInput.includeVector,
          minScore: validatedInput.minScore
        },
        runtimeContext: graphRAGContext
      });

      const processingTime = Date.now() - startTime;

      // Transform results to match our schema
      const sources = (graphResult.sources || []).map((source: {
        id?: string;
        score?: number;
        metadata?: Record<string, unknown>;
        text?: string;
        content?: string;
        vector?: number[];
      }) => ({
        id: source.id || generateId(),
        score: source.score || 0,
        content: source.text || source.content || '',
        metadata: source.metadata || {},
        vector: validatedInput.includeVector ? source.vector : undefined
      }));

      const totalResults = sources.length;
      const avgScore = totalResults > 0 ? sources.reduce((sum: number, s: { score: number }) => sum + s.score, 0) / totalResults : 0;

      const result = {
        relevantContext: graphResult.relevantContext || sources.map((s: { content: string }) => s.content).join('\n\n'),
        sources,
        totalResults,
        graphStats: {
          nodes: totalResults,
          edges: Math.floor(totalResults * 1.5), // Estimated edges based on threshold
          avgScore
        },
        processingTime
      };

      logger.info('GraphRAG query completed successfully', { 
        relevantContextLength: result.relevantContext.length,
        totalResults: result.totalResults,
        avgScore: result.graphStats.avgScore,
        processingTime: result.processingTime 
      });

      return queryOutputSchema.parse(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GraphRAG query failed', {
        error: errorMessage,
        query: input.query,
        indexName: input.indexName
      });

      // Throw VectorStoreError for better error handling
      throw new VectorStoreError(
        `GraphRAG query failed: ${errorMessage}`,
        'operation_failed',
        {
          query: input.query,
          indexName: input.indexName,
          processingTime: Date.now() - startTime
        }
      );
    }
  }
});

/**
 * Runtime context for GraphRAG tools with default values
 */
export const graphRAGRuntimeContext = new RuntimeContext<GraphRAGRuntimeContext>();

// Set default runtime context values for Upstash Vector with sparse cosine similarity
graphRAGRuntimeContext.set("indexName", VECTOR_CONFIG.DEFAULT_INDEX_NAME);
graphRAGRuntimeContext.set("topK", VECTOR_CONFIG.DEFAULT_TOP_K);
graphRAGRuntimeContext.set("threshold", 0.7);
graphRAGRuntimeContext.set("minScore", 0.0);
graphRAGRuntimeContext.set("dimension", VECTOR_CONFIG.EMBEDDING_DIMENSION); // 384 for fastembed
graphRAGRuntimeContext.set("category", "document");
graphRAGRuntimeContext.set("debug", false);

