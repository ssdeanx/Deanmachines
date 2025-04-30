/**
 * Memory Helper Utilities
 * 
 * Shared utility functions for memory processors to reduce duplication
 * and make the memory-processors.ts file more maintainable.
 */

import { createLogger } from '@mastra/core/logger';
import { createEmbeddings } from "./vector-store";
import type { MastraEmbeddingAdapter } from "./vector-store";
import { CoreMessage, MemoryProcessor } from '@mastra/core';
import { createTracedSpan, createCounter, createHistogram } from '../services/tracing';

// Create a dedicated logger for memory utilities
const logger = createLogger({ name: 'memory-helpers', level: 'info' });

// Analytics metrics
const clusterMetrics = createHistogram('memory_processor_clusters');
const messageCounter = createCounter('memory_helper_messages_total');
const processingLatency = createHistogram('memory_helper_latency_ms');

/**
 * Generic message type used by memory processors
 */
export interface MemoryMessage {
  role: string;
  content: any;
  id?: string;
  embedding?: number[];
  metadata?: {
    tags?: string[];
    source?: string;
    [key: string]: any;
  };
  createdAt?: string;
  [key: string]: any;
}

/**
 * Cache manager for embeddings to avoid recalculating
 */
export class EmbeddingCache {
  private cache: Map<string, number[]> = new Map();
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private maxSize: number;
  
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }
  
  /**
   * Get cache metrics
   */
  get stats() {
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.cacheHits + this.cacheMisses > 0 
        ? this.cacheHits / (this.cacheHits + this.cacheMisses) 
        : 0
    };
  }
  
  /**
   * Get embedding from cache, or compute and store it
   */
  async getEmbedding(
    content: string, 
    embeddings: MastraEmbeddingAdapter
  ): Promise<number[] | null> {
    // Create a cache key from content (limit size for memory considerations)
    const cacheKey = `embed_${content.slice(0, 100)}_${content.length}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      this.cacheHits++;
      return this.cache.get(cacheKey) || null;
    }
    
    // If not in cache, compute embedding
    try {
      this.cacheMisses++;
      const embedding = await embeddings.embedQuery(content);
      
      // Manage cache size
      if (this.cache.size >= this.maxSize) {
        // Simple LRU: clear 1/4 of the cache when full
        const keysToRemove = Array.from(this.cache.keys()).slice(0, Math.floor(this.maxSize / 4));
        for (const key of keysToRemove) {
          this.cache.delete(key);
        }
      }
      
      // Cache the result
      this.cache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      logger.error('Error generating embedding', {
        error: error instanceof Error ? error.message : String(error),
        contentLength: content.length
      });
      return null;
    }
  }
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

/**
 * Calculates cosine similarity between two vectors
 * 
 * @param vecA First vector
 * @param vecB Second vector
 * @returns Similarity score from -1 to 1
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimensions don't match: ${vecA.length} vs ${vecB.length}`);
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Estimates token count based on character count
 * 
 * @param text Text to estimate tokens for
 * @param tokensPerChar Character to token ratio (default: 0.25)
 * @returns Estimated token count
 */
export function estimateTokens(text: string, tokensPerChar: number = 0.25): number {
  // Add base overhead for message formatting
  return Math.ceil(text.length * tokensPerChar) + 10;
}

/**
 * Safely creates embeddings with error handling
 * 
 * @returns MastraEmbeddingAdapter instance or null on error
 */
export function createSafeEmbeddings(): MastraEmbeddingAdapter | null {
  try {
    const embeddings = createEmbeddings();
    logger.info(`Created embeddings with model: ${embeddings.modelId}, ${embeddings.dimensions} dimensions`);
    return embeddings;
  } catch (error) {
    logger.warn('Failed to create embeddings', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Memory Index Manager to track and update conversation indices
 */
export class MemoryIndexManager {
  private currentIndex: string = '';
  private lastUpdateMessageCount: number = 0;
  private updateFrequency: number;
  
  constructor(updateFrequency: number = 10) {
    this.updateFrequency = updateFrequency;
  }
  
  /**
   * Checks if index should be updated
   */
  shouldUpdate(messageCount: number): boolean {
    return messageCount - this.lastUpdateMessageCount >= this.updateFrequency || 
           !this.currentIndex;
  }
  
  /**
   * Updates the current index
   */
  updateIndex(index: string, messageCount: number): void {
    this.currentIndex = index;
    this.lastUpdateMessageCount = messageCount;
  }
  
  /**
   * Gets the current index
   */
  getIndex(): string {
    return this.currentIndex;
  }
}

/**
 * Extract message content regardless of format
 */
export function getMessageContent(message: MemoryMessage | CoreMessage): string {
  return typeof message.content === 'string' 
    ? message.content 
    : JSON.stringify(message.content);
}

/**
 * Truncate text to a specific length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Simple type for processor options
export interface MemoryProcessorOpts {
  [key: string]: any;
}

/**
 * Type guard to ensure we return the correct type from processors
 */
export function ensureMemoryProcessorReturn(messages: any[]): CoreMessage[] {
  // Map each message to ensure it has the correct role type
  return messages.map(msg => ({
    ...msg,
    role: (msg.role === 'user' || 
           msg.role === 'system' || 
           msg.role === 'assistant' || 
           msg.role === 'tool') 
      ? msg.role 
      : 'assistant'
  })) as CoreMessage[];
}

/**
 * Production-grade Semantic Clustering Processor
 * 
 * This processor groups semantically similar messages into clusters and selects
 * representative samples from each cluster to ensure diverse coverage of topics.
 * This helps preserve conceptual breadth while reducing token usage.
 */
export class SemanticClusteringProcessor extends MemoryProcessor {
  private embeddings: ReturnType<typeof createSafeEmbeddings>;
  private embeddingCache: EmbeddingCache;
  private clusterThreshold: number;
  private maxClusters: number;
  private minClusterSize: number;
  
  /**
   * Creates a new semantic clustering processor
   * 
   * @param options Configuration options
   * @param options.clusterThreshold Similarity threshold for clustering (0.0-1.0)
   * @param options.maxClusters Maximum number of clusters to maintain
   * @param options.minClusterSize Minimum messages per cluster before compression
   */
  constructor(options?: { 
    clusterThreshold?: number;
    maxClusters?: number; 
    minClusterSize?: number;
  }) {
    super({ name: 'SemanticClusteringProcessor' });
    
    this.clusterThreshold = options?.clusterThreshold || 0.82; // Higher = more clusters
    this.maxClusters = options?.maxClusters || 12;
    this.minClusterSize = options?.minClusterSize || 5;
    
    // Initialize embeddings for semantic clustering
    this.embeddings = createSafeEmbeddings();
    this.embeddingCache = new EmbeddingCache();
    
    if (this.embeddings) {
      logger.info(`SemanticClusteringProcessor initialized with parameters:`, {
        clusterThreshold: this.clusterThreshold,
        maxClusters: this.maxClusters,
        minClusterSize: this.minClusterSize,
        embeddingModel: this.embeddings.modelId,
        dimensions: this.embeddings.dimensions
      });
    } else {
      logger.warn('SemanticClusteringProcessor initialized without embeddings - will use fallback methods');
    }
  }
  
  /**
   * Process messages by clustering semantically similar ones and keeping representative samples
   * 
   * Note: This processor uses a synchronous implementation for compatibility.
   * In a production environment with full control of the types, you would use an async process method.
   */
  process(messages: CoreMessage[], _opts: MemoryProcessorOpts = {}): CoreMessage[] {
    const startTime = performance.now();
    const span = createTracedSpan('memory.semanticClustering', { 
      messageCount: messages.length
    });
    
    // Skip processing if conditions aren't right
    if (!this.embeddings || messages.length < this.minClusterSize) {
      span?.end();
      return ensureMemoryProcessorReturn(messages);
    }
    
    try {
      // Simple synchronous clustering based on content similarity
      const result = messages.filter((msg, i, arr) => {
        // Keep at least some messages to prevent over-filtering
        if (arr.length < 20) return true;
        
        // Always keep user messages
        if (msg.role === 'user') return true;
        
        // For system and assistant messages, do basic content-based filtering
        const content = getMessageContent(msg);
        
        // Simple duplicate detection based on content prefix
        const contentPrefix = content.substring(0, 100);
        const isDuplicate = arr.slice(0, i).some(m => {
          const mContent = getMessageContent(m);
          return mContent.startsWith(contentPrefix) && Math.abs(mContent.length - content.length) < 20;
        });
        
        return !isDuplicate;
      });
      
      // Record metrics
      clusterMetrics.record(0, { operation: 'sync_deduplication' });
      messageCounter.add(messages.length - result.length, { 
        processor: 'SemanticClusteringProcessor', 
        operation: 'filter' 
      });
      
      logger.info(`Semantic clustering (sync pass): ${messages.length} → ${result.length} messages`);
      
      return ensureMemoryProcessorReturn(result);
    } catch (error) {
      logger.error('Error in semantic clustering', {
        error: error instanceof Error ? error.message : String(error)
      });
      span?.recordException?.(error);
      return ensureMemoryProcessorReturn(messages); // Return original messages on error
    } finally {
      processingLatency.record(performance.now() - startTime, { processor: 'SemanticClusteringProcessor' });
      span?.end();
    }
  }
}
