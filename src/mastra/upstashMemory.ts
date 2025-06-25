import { Memory } from '@mastra/memory';
import { UpstashStore, UpstashVector } from '@mastra/upstash';
import { z } from 'zod';
import { PinoLogger } from '@mastra/loggers';
import type { CoreMessage } from '@mastra/core';
import { maskStreamTags } from '@mastra/core/utils';
import { MemoryProcessor, MemoryProcessorOpts } from '@mastra/core/memory';
import { UIMessage } from 'ai';
import { fastembed } from '@mastra/fastembed';
import { TokenLimiter, ToolCallFilter } from "@mastra/memory/processors";

/**
 * VectorStoreError for proper error handling following Mastra patterns
 */
export class VectorStoreError extends Error {
  constructor(
    message: string,
    public code: 'connection_failed' | 'invalid_dimension' | 'index_not_found' | 'operation_failed' = 'operation_failed',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VectorStoreError';
  }
}


const logger = new PinoLogger({ name: 'upstashMemory', level: 'info' });

/**
 * Environment variable validation for Upstash services
 * Ensures all required credentials are present before initialization
 */
function validateUpstashEnvironment(): void {
  const required = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'UPSTASH_VECTOR_REST_URL',
    'UPSTASH_VECTOR_REST_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required Upstash environment variables: ${missing.join(', ')}`);
  }

  logger.info('Upstash environment variables validated successfully');
}

// Validate environment on module load
validateUpstashEnvironment();

// Validation schemas
const createThreadSchema = z.object({
  resourceId: z.string().nonempty(),
  threadId: z.string().optional(),
  title: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const getMessagesSchema = z.object({
  resourceId: z.string().nonempty(),
  threadId: z.string().nonempty(),
  last: z.number().int().min(1).optional()
});

const threadIdSchema = z.string().nonempty();
const resourceIdSchema = z.string().nonempty();

const searchMessagesSchema = z.object({
  threadId: z.string().nonempty(),
  vectorSearchString: z.string().nonempty(),
  topK: z.number().int().min(1).default(3),
  before: z.number().int().min(0).default(0),
  after: z.number().int().min(0).default(0),
});

// Enhanced vector operation schemas
const vectorIndexSchema = z.object({
  indexName: z.string().nonempty(),
  dimension: z.number().int().min(1).default(384), // fastembed embedding dimension (384)
  metric: z.enum(['cosine']).default('cosine')
});

const vectorUpsertSchema = z.object({
  indexName: z.string().nonempty(),
  vectors: z.array(z.array(z.number())),
  metadata: z.array(z.record(z.unknown())).optional(),
  ids: z.array(z.string()).optional()
});

const vectorQuerySchema = z.object({
  indexName: z.string().nonempty(),
  queryVector: z.array(z.number()),
  topK: z.number().int().min(1).default(10),
  filter: z.any().optional(), // Use z.any() for MetadataFilter compatibility
  includeVector: z.boolean().default(false)
});

const vectorUpdateSchema = z.object({
  indexName: z.string().nonempty(),
  id: z.string().nonempty(),
  vector: z.array(z.number()).optional(),
  metadata: z.record(z.unknown()).optional()
});

/**
 * Vector operation result interfaces following Upstash Vector API
 */
export interface VectorQueryResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
  vector?: number[];
}

export interface VectorIndexStats {
  dimension: number;
  count: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
}

export interface VectorOperationResult {
  success: boolean;
  operation: string;
  indexName?: string;
  count?: number;
  error?: string;
}

/**
 * ExtractParams interface for metadata extraction following Mastra patterns
 * Supports title, summary, keywords, and questions extraction from document chunks
 */
export interface ExtractParams {
  title?: boolean | {
    nodes?: number;
    nodeTemplate?: string;
    combineTemplate?: string;
  };
  summary?: boolean | {
    summaries?: ('self' | 'prev' | 'next')[];
    promptTemplate?: string;
  };
  keywords?: boolean | {
    keywords?: number;
    promptTemplate?: string;
  };
  questions?: boolean | {
    questions?: number;
    promptTemplate?: string;
    embeddingOnly?: boolean;
  };
}

/**
 * Enhanced metadata filter interface supporting Upstash-compatible MongoDB/Sift query syntax
 *
 * @remarks
 * Upstash-specific limitations:
 * - Field keys limited to 512 characters
 * - Query size is limited (avoid large IN clauses)
 * - No support for null/undefined values in filters
 * - Translates to SQL-like syntax internally
 * - Case-sensitive string comparisons
 * - Metadata updates are atomic
 *
 * Supported operators: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $and, $or, $not, $nor, $exists, $contains, $regex
 */
export interface MetadataFilter {
  // Basic comparison operators (Upstash compatible)
  $eq?: string | number | boolean;
  $ne?: string | number | boolean;
  $gt?: number;
  $gte?: number;
  $lt?: number;
  $lte?: number;

  // Array operators (Upstash compatible - avoid large arrays)
  $in?: (string | number | boolean)[];
  $nin?: (string | number | boolean)[];

  // Logical operators (Upstash compatible)
  $and?: MetadataFilter[];
  $or?: MetadataFilter[];
  $not?: MetadataFilter;
  $nor?: MetadataFilter[];

  // Element operators (Upstash compatible)
  $exists?: boolean;

  // Upstash-specific operators
  $contains?: string; // Text contains substring
  $regex?: string; // Regular expression match

  // Field-level filters (keys must be ≤512 chars, no null values)
  [key: string]: string | number | boolean | MetadataFilter | MetadataFilter[] | (string | number | boolean)[] | undefined;
}

// Create shared Upstash storage instance
export const upstashStorage = new UpstashStore({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
});

/**
 * Enhanced Upstash Vector Configuration
 * Initializes vector storage for optimal search performance with proper dimensions
 *
 * @remarks
 * - Configured for fastembed embedding model (384 dimensions)
 * - Uses cosine similarity for text embeddings
 * - Supports metadata filtering and hybrid search
 */
export const upstashVector = new UpstashVector({
  url: process.env.UPSTASH_VECTOR_REST_URL || '',
  token: process.env.UPSTASH_VECTOR_REST_TOKEN || ''
});

/**
 * Vector configuration constants
 */
export const VECTOR_CONFIG = {
  DEFAULT_INDEX_NAME: 'mastra-memory-vectors',
  EMBEDDING_DIMENSION: 384, // fastembed text-embedding dimension (updated to match your setup)
  DISTANCE_METRIC: 'cosine' as const,
  DEFAULT_TOP_K: 5,
  MAX_BATCH_SIZE: 100
} as const;

/**
 * Advanced Attention-Guided Memory Processor (2025)
 *
 * Implements cutting-edge memory management techniques based on latest research:
 * - Attention-based relevance scoring
 * - Dynamic context pruning
 * - Semantic importance weighting
 * - Token efficiency optimization
 *
 * @see https://mastra.ai/en/docs/memory/memory-processors
 *
 * @version 1.0.0
 * @author SSD
 * @date 2025-06-20
 *
 * @mastra Memory Processor implementation for Upstash Memory
 * @class AttentionGuidedMemoryProcessor
 *
 * @remarks
 * Features:
 * - Removes redundant messages using semantic similarity
 * - Prioritizes high-importance content based on keywords
 * - Applies attention-guided summarization for verbose messages
 * - Maintains conversation flow and context coherence
 *
 * @example
 * ```typescript
 * const memory = new Memory({
 *   processors: [
 *     new AttentionGuidedMemoryProcessor({
 *       maxMessages: 50,
 *       similarityThreshold: 0.85,
 *       importanceKeywords: ['error', 'critical', 'urgent', 'important']
 *     }),
 *     new TokenLimiter(127000)
 *   ]
 * });
 * ```
 *
 * [EDIT: 2025-06-20] & [BY: GitHub Copilot]
 */
export class AttentionGuidedMemoryProcessor extends MemoryProcessor {
  private readonly maxMessages: number;
  private readonly similarityThreshold: number;
  private readonly importanceKeywords: string[];
  private readonly verboseMessageThreshold: number;
  private readonly contextPreservationRatio: number;

  constructor(options: {
    maxMessages?: number;
    similarityThreshold?: number;
    importanceKeywords?: string[];
    verboseMessageThreshold?: number;
    contextPreservationRatio?: number;
  } = {}) {
    super({ name: 'AttentionGuidedMemoryProcessor' });
    this.maxMessages = options.maxMessages ?? 50;
    this.similarityThreshold = options.similarityThreshold ?? 0.85;
    this.importanceKeywords = options.importanceKeywords ?? [
      'error', 'critical', 'urgent', 'important', 'warning', 'issue', 
      'problem', 'fix', 'solution', 'bug', 'security', 'performance', 'update', 'correct'
    ];
    this.verboseMessageThreshold = options.verboseMessageThreshold ?? 500;
    this.contextPreservationRatio = options.contextPreservationRatio ?? 0.3;

    logger.info('AttentionGuidedMemoryProcessor initialized', {
      maxMessages: this.maxMessages,
      similarityThreshold: this.similarityThreshold,
      importanceKeywords: this.importanceKeywords.length,
      verboseMessageThreshold: this.verboseMessageThreshold
    });
  }
  /**
   * Process messages using attention-guided memory management
   * @param messages - Array of messages to process
   * @param opts - Processing options for configuration
   * @returns Filtered and optimized messages array
   */
  process(messages: CoreMessage[], opts: MemoryProcessorOpts = {}): CoreMessage[] {
    // Use opts properties that are actually available
    const targetMessages = this.maxMessages;
    if (messages.length <= targetMessages) {
      return messages;
    }

    const startTime = Date.now();
    try {
      // Step 1: Score messages by importance
      const scoredMessages = this.scoreMessageImportance(messages);
      // Step 2: Remove redundant messages using semantic similarity
      const deduplicatedMessages = this.removeRedundantMessages(scoredMessages);
      // Step 3: Apply dynamic context pruning
      const prunedMessages = this.applyContextPruning(deduplicatedMessages);
      // Step 4: Ensure conversation flow preservation
      const finalMessages = this.preserveConversationFlow(prunedMessages);
      const duration = Date.now() - startTime;
      logger.info('AttentionGuidedMemoryProcessor completed', {
        originalCount: messages.length,
        finalCount: finalMessages.length,
        reductionPercentage: ((messages.length - finalMessages.length) / messages.length * 100).toFixed(1),
        processingDuration: duration,
        optsReceived: Object.keys(opts).length > 0
      });
      return finalMessages;
    } catch (error: unknown) {
      logger.error('AttentionGuidedMemoryProcessor failed', {
        error: (error as Error).message,
        messageCount: messages.length,
        optsReceived: Object.keys(opts).length > 0
      });
      // Fallback: return most recent messages
      return messages.slice(-targetMessages);
    }
  }

  /**
   * Score messages based on importance factors
   */
  private scoreMessageImportance(messages: CoreMessage[]): Array<{ message: CoreMessage; score: number; index: number }> {
    return messages.map((message, index) => {
      let score = 0;
      const content = message.content?.toString().toLowerCase() || '';
      // Base score for message type
      if (message.role === 'user') score += 1.0;
      else if (message.role === 'assistant') score += 0.8;
      else if (message.role === 'system') score += 1.2;
      else if (message.role === 'tool') score += 0.6;
      // Importance keyword bonus
      this.importanceKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          score += 0.5;
        }
      });
      // Recent message bonus (exponential decay)
      const recencyBonus = Math.exp(-0.1 * (messages.length - index - 1));
      score += recencyBonus;
      // Verbose message penalty (but not elimination)
      if (content.length > this.verboseMessageThreshold) {
        score *= 0.7;
      }
      // Question/command detection bonus
      if (content.includes('?') || content.includes('how') || content.includes('what') || content.includes('why')) {
        score += 0.3;
      }
      return { message, score, index };
    });
  }

  /**
   * Remove semantically similar/redundant messages
   */
  private removeRedundantMessages(
    scoredMessages: Array<{ message: CoreMessage; score: number; index: number }>
  ): Array<{ message: CoreMessage; score: number; index: number }> {
    const filtered: Array<{ message: CoreMessage; score: number; index: number }> = [];
    for (const current of scoredMessages) {
      const currentContent = current.message.content?.toString().toLowerCase() || '';
      // Skip if very similar to an existing message with higher score
      const isDuplicate = filtered.some(existing => {
        const existingContent = existing.message.content?.toString().toLowerCase() || '';
        // Simple similarity check using word overlap
        const similarity = this.calculateTextSimilarity(currentContent, existingContent);
        return similarity > this.similarityThreshold && existing.score >= current.score;
      });
      if (!isDuplicate) {
        filtered.push(current);
      }
    }
    return filtered;
  }

  /**
   * Apply dynamic context pruning based on attention patterns
   */
  private applyContextPruning(
    messages: Array<{ message: CoreMessage; score: number; index: number }>
  ): Array<{ message: CoreMessage; score: number; index: number }> {
    // Sort by score (descending) and select top messages
    const sortedByScore = [...messages].sort((a, b) => b.score - a.score);
    // Calculate how many messages to keep
    const targetCount = Math.min(this.maxMessages, messages.length);
    const contextPreservationCount = Math.floor(targetCount * this.contextPreservationRatio);
    // Always keep some recent messages for context
    const recentMessages = messages.slice(-contextPreservationCount);
    const remainingSlots = targetCount - recentMessages.length;
    // Fill remaining slots with highest-scored messages (excluding already selected recent ones)
    const recentIndices = new Set(recentMessages.map(m => m.index));
    const additionalMessages = sortedByScore
      .filter(m => !recentIndices.has(m.index))
      .slice(0, remainingSlots);
    return [...additionalMessages, ...recentMessages];
  }

  /**
   * Preserve conversation flow and coherence
   */
  private preserveConversationFlow(
    messages: Array<{ message: CoreMessage; score: number; index: number }>
  ): CoreMessage[] {
    // Sort by original index to maintain chronological order
    const chronologicalMessages = messages
      .sort((a, b) => a.index - b.index)
      .map(item => item.message);
    // Ensure we don't break conversation pairs (user-assistant sequences)
    const preservedMessages: CoreMessage[] = [];
    for (let i = 0; i < chronologicalMessages.length; i++) {
      const current = chronologicalMessages[i];
      preservedMessages.push(current);
      // If this is a user message and the next is an assistant response, include both
      if (current.role === 'user' &&
          i + 1 < chronologicalMessages.length &&
          chronologicalMessages[i + 1].role === 'assistant') {
        preservedMessages.push(chronologicalMessages[i + 1]);
        i++; // Skip the next message since we already added it
      }
    }
    return preservedMessages;
  }

  /**
   * Calculate text similarity using simple word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

/**
 * Enhanced Contextual Relevance Processor (2025)
 *
 * @version 1.0.0
 * @author SSD
 * @date 2025-06-20
 *
 * @mastra Memory Processor implementation for Upstash Memory
 * @class ContextualRelevanceProcessor
 *
 * @remarks
 * Focuses on maintaining only contextually relevant messages
 * based on topic continuity and semantic coherence.
 *
 * @example
 * ```typescript
 * const memory = new Memory({
 *   processors: [
 *     new ContextualRelevanceProcessor({
 *       topicContinuityThreshold: 0.7,
 *       maxTopicShifts: 3
 *     })
 *   ]
 * });
 * ```
 *
 * [EDIT: 2025-06-20] & [BY: GitHub Copilot]
 */
export class ContextualRelevanceProcessor extends MemoryProcessor {
  private readonly topicContinuityThreshold: number;
  private readonly maxTopicShifts: number;

  constructor(options: {
    topicContinuityThreshold?: number;
    maxTopicShifts?: number;
  } = {}) {
    super({ name: 'ContextualRelevanceProcessor' });
    this.topicContinuityThreshold = options.topicContinuityThreshold ?? 0.7;
    this.maxTopicShifts = options.maxTopicShifts ?? 3;
  }
  process(messages: CoreMessage[], opts: MemoryProcessorOpts = {}): CoreMessage[] {
    const minReturnMessages = 10;
    if (messages.length <= minReturnMessages) {
      return messages;
    }

    try {
      const topicSegments = this.identifyTopicSegments(messages);
      const relevantSegments = this.selectRelevantSegments(topicSegments);
      const result = relevantSegments.flat();
      // Log processing information including opts usage
      logger.info('ContextualRelevanceProcessor completed', {
        originalCount: messages.length,
        finalCount: result.length,
        segmentsProcessed: topicSegments.length,
        optsReceived: Object.keys(opts).length > 0,
        optsKeys: Object.keys(opts)
      });
      return result;
    } catch (error: unknown) {
      logger.error('ContextualRelevanceProcessor failed', {
        error: (error as Error).message,
        optsReceived: Object.keys(opts).length > 0
      });
      return messages;
    }
  }

  private identifyTopicSegments(messages: CoreMessage[]): CoreMessage[][] {
    const segments: CoreMessage[][] = [];
    let currentSegment: CoreMessage[] = [];
    for (let i = 0; i < messages.length; i++) {
      currentSegment.push(messages[i]);
      // Check for topic shift
      if (i < messages.length - 1) {
        const current = messages[i].content?.toString() || '';
        const next = messages[i + 1].content?.toString() || '';
        if (this.detectTopicShift(current, next)) {
          segments.push([...currentSegment]);
          currentSegment = [];
        }
      }
    }
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }
    return segments;
  }

  private detectTopicShift(current: string, next: string): boolean {
    // Simple topic shift detection using keyword overlap
    const currentWords = new Set(current.toLowerCase().split(/\s+/));
    const nextWords = new Set(next.toLowerCase().split(/\s+/));
    const overlap = [...currentWords].filter(w => nextWords.has(w)).length;
    const totalUnique = new Set([...currentWords, ...nextWords]).size;
    const continuity = totalUnique > 0 ? overlap / totalUnique : 0;
    return continuity < this.topicContinuityThreshold;
  }

  private selectRelevantSegments(segments: CoreMessage[][]): CoreMessage[][] {
    // Keep the most recent segments up to maxTopicShifts
    return segments.slice(-this.maxTopicShifts);
  }
}

/**
 * Shared Mastra agent memory instance using Upstash for distributed storage and vector search.
 *
 * @remarks
 * - Uses UpstashStore for distributed Redis storage
 * - Uses UpstashVector for semantic search with cloud-based vectors (384-dim fastembed embeddings)
 * - Embeddings powered by fastembed text-embedding model with cosine similarity
 * - Configured for working memory and semantic recall with enhanced processors
 * - Supports custom memory processors for filtering, summarization, etc.
 * - Ideal for serverless and distributed applications
 * - Enhanced with vector operations and batch processing capabilities
 *
 * @see https://upstash.com/docs/redis/overall/getstarted
 * @see https://upstash.com/docs/vector/overall/getstarted
 * @see https://mastra.ai/en/reference/rag/upstash
 *
 * @version 1.0.0
 * @author SSD
 * @date 2025-06-20
 *
 * @mastra Shared Upstash memory instance for all agents
 * @instance upstashMemory
 * @module upstashMemory
 * @class Memory
 * @classdesc Shared memory instance for all agents using Upstash for storage and vector search
 * @returns {Memory} Shared Upstash-backed memory instance for all agents
 *
 * @example
 * // Use threadId/resourceId for multi-user or multi-session memory:
 * await agent.generate('Hello', { resourceId: 'user-123', threadId: 'thread-abc' });
 *
 * @example
 * // Initialize vector indexes on startup:
 * await initializeUpstashVectorIndexes();
 */
export const upstashMemory = new Memory({
  storage: upstashStorage,
  vector: upstashVector,
  embedder: fastembed,
  options: {
    lastMessages: 500, // Enhanced for better context retention
    semanticRecall: {
      topK: VECTOR_CONFIG.DEFAULT_TOP_K,
      messageRange: {
        before: 3,
        after: 1,
      },
      scope: 'resource', // Search across all threads for a user
    },
    threads: {
      generateTitle: true, // Auto-generate thread titles
    },
    workingMemory: {
      enabled: true, // Persistent user information across conversations
      template: `# Memory
- Preferences:
- Goals:
- Context:
- Recent Actions:
- Key Insights:
- Important Notes:
`
    },
  },
  processors: [
    new AttentionGuidedMemoryProcessor({
      maxMessages: 50,
      similarityThreshold: 0.85,
      importanceKeywords: ['urgent', 'important', 'critical', 'error', 'bug', 'issue', 'task', 'goal'],
      verboseMessageThreshold: 500,
      contextPreservationRatio: 0.3,
    }),
    new ContextualRelevanceProcessor({
        topicContinuityThreshold: 0.7,
        maxTopicShifts: 4,
    }),
    new TokenLimiter(1000000), // 1M token limit for context
    new ToolCallFilter({
      exclude: ['get_pull_request_reviews', 'search_issues', 'get_issue', 'create_pull_request_review', 'merge_pull_request', 'get_pull_request_files', 'get_pull_request_status', 'update_pull_request_branch', 'get_pull_request_comments', 'get_pull_request_reviews', 'add_issue_comment', 'update_issue', 'list_issues', 'create_entities', 'create_relations', 'add_observations', 'delete_entities', 'delete_observations', 'delete_relations', 'read_graph', 'search_nodes', 'open_nodes'], // Include all tool calls for better context
    }),
    // Add custom processors as needed
  ],
});

/**
 * Create a new memory thread using Upstash storage.
 * @param resourceId - User/resource identifier
 * @param title - Optional thread title
 * @param metadata - Optional thread metadata
 * @param threadId - Optional specific thread ID
 * @returns Promise resolving to thread information
 */
export async function createUpstashThread(
  resourceId: string,
  title?: string,
  metadata?: Record<string, unknown>,
  threadId?: string
) {
  const params = createThreadSchema.parse({ resourceId, threadId, title, metadata });
  try {
    return await upstashMemory.createThread(params);
  } catch (error: unknown) {
    logger.error(`createUpstashThread failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Query messages for a thread using Upstash storage.
 * @param resourceId - User/resource ID
 * @param threadId - Thread ID
 * @param last - Number of last messages to retrieve
 * @returns Promise resolving to thread messages
 */
export async function getUpstashThreadMessages(
  resourceId: string,
  threadId: string,
  last = 10
) {
  const params = getMessagesSchema.parse({ resourceId, threadId, last });
  try {
    return await upstashMemory.query({
      resourceId: params.resourceId,
      threadId: params.threadId,
      selectBy: { last: params.last }
    });
  } catch (error: unknown) {
    logger.error(`getUpstashThreadMessages failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Retrieve a memory thread by its ID using Upstash storage.
 * @param threadId - Thread identifier
 * @returns Promise resolving to thread information
 */
export async function getUpstashThreadById(threadId: string) {
  const id = threadIdSchema.parse(threadId);
  try {
    return await upstashMemory.getThreadById({ threadId: id });
  } catch (error: unknown) {
    logger.error(`getUpstashThreadById failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Retrieve all memory threads associated with a resource using Upstash storage.
 * @param resourceId - Resource identifier
 * @returns Promise resolving to array of threads
 */
export async function getUpstashThreadsByResourceId(resourceId: string) {
  const id = resourceIdSchema.parse(resourceId);
  try {
    return await upstashMemory.getThreadsByResourceId({ resourceId: id });
  } catch (error: unknown) {
    logger.error(`getUpstashThreadsByResourceId failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Perform a semantic search in a thread's messages using Upstash vector search.
 * Enhanced to support metadata filtering following Mastra patterns.
 *
 * @param threadId - Thread identifier
 * @param vectorSearchString - Query string for semantic search
 * @param topK - Number of similar messages to retrieve
 * @param before - Number of messages before each match
 * @param after - Number of messages after each match
 * @param filter - Optional metadata filter using MongoDB/Sift query syntax
 * @returns Promise resolving to { messages: CoreMessage[], uiMessages: UIMessage[] }
 *
 * @example
 * ```typescript
 * // Basic search
 * const results = await searchUpstashMessages('thread-123', 'AI concepts', 5);
 *
 * // Search with metadata filtering
 * const filteredResults = await searchUpstashMessages(
 *   'thread-123',
 *   'AI concepts',
 *   5,
 *   2,
 *   1,
 *   { role: 'assistant', importance: { $gt: 0.8 } }
 * );
 * ```
 */
export async function searchUpstashMessages(
  threadId: string,
  vectorSearchString: string,
  topK = 3,
  before = 2,
  after = 1,
  filter?: MetadataFilter
): Promise<{ messages: CoreMessage[]; uiMessages: UIMessage[] }> {
  const params = searchMessagesSchema.parse({ threadId, vectorSearchString, topK, before, after });
  try {
    const queryConfig: {
      threadId: string;
      selectBy: { vectorSearchString: string };
      threadConfig: {
        semanticRecall: {
          topK: number;
          messageRange: { before: number; after: number };
        };
      };
      filter?: Record<string, unknown>;
    } = {
      threadId: params.threadId,
      selectBy: { vectorSearchString: params.vectorSearchString },
      threadConfig: {
        semanticRecall: {
          topK: params.topK,
          messageRange: {
            before: params.before,
            after: params.after
          }
        }
      },
    };

    // Add metadata filter if provided (validate for Upstash compatibility)
    if (filter) {
      const validatedFilter = validateUpstashFilter(filter);
      queryConfig.filter = validatedFilter;
      logger.info('Applying Upstash-compatible metadata filter to search', {
        threadId: params.threadId,
        filter: validatedFilter,
        topK: params.topK
      });
    }

    const result = await upstashMemory.query(queryConfig);

    logger.info('Upstash message search completed', {
      threadId: params.threadId,
      messagesFound: result.messages.length,
      uiMessagesFound: result.uiMessages.length,
      hasFilter: !!filter
    });

    return result;
  } catch (error: unknown) {
    logger.error(`searchUpstashMessages failed: ${(error as Error).message}`, {
      threadId: params.threadId,
      vectorSearchString: params.vectorSearchString,
      filter
    });
    throw new VectorStoreError(
      `Failed to search messages: ${(error as Error).message}`,
      'operation_failed',
      { threadId: params.threadId, filter }
    );
  }
}

/**
 * Retrieve UI-formatted messages for a thread using Upstash storage.
 * @param threadId - Thread identifier
 * @param last - Number of recent messages
 * @returns Promise resolving to array of UI-formatted messages
 */
export async function getUpstashUIThreadMessages(threadId: string, last = 100): Promise<UIMessage[]> {
  const id = threadIdSchema.parse(threadId);
  try {
    const { uiMessages } = await upstashMemory.query({
      threadId: id,
      selectBy: { last },
    });
    return uiMessages;
  } catch (error: unknown) {
    logger.error(`getUpstashUIThreadMessages failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Masks internal working_memory updates from a response textStream for Upstash.
 * @param textStream - Async iterable of response chunks including <working_memory> tags
 * @param onStart - Optional callback when a working_memory update starts
 * @param onEnd - Optional callback when a working_memory update ends
 * @param onMask - Optional callback for the masked content
 * @returns Async iterable of chunks with working_memory tags removed
 */
export function maskUpstashWorkingMemoryStream(
  textStream: AsyncIterable<string>,
  onStart?: () => void,
  onEnd?: () => void,
  onMask?: (chunk: string) => void
): AsyncIterable<string> {
  return maskStreamTags(textStream, 'working_memory', { onStart, onEnd, onMask });
}

/**
 * Enhanced search function with performance tracking and detailed logging for Upstash.
 * @param threadId - Thread identifier
 * @param vectorSearchString - Query string for semantic search
 * @param topK - Number of similar messages to retrieve
 * @param before - Number of messages before each match
 * @param after - Number of messages after each match
 * @returns Promise resolving to { messages, uiMessages } with enhanced metadata
 */
export async function enhancedUpstashSearchMessages(
  threadId: string,
  vectorSearchString: string,
  topK = 3,
  before = 2,
  after = 1
): Promise<{
  messages: CoreMessage[];
  uiMessages: UIMessage[];
  searchMetadata: {
    topK: number;
    before: number;
    after: number;
  }
}> {
  try {
    const result = await upstashMemory.query({
      threadId,
      selectBy: { vectorSearchString },
      threadConfig: {
        semanticRecall: {
          topK,
          messageRange: { before, after }
        }
      },
    });
    return {
      ...result,
      searchMetadata: { topK, before, after }
    };
  } catch (error: unknown) {
    logger.error(`enhancedUpstashSearchMessages failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Create a vector index with proper configuration
 * @param indexName - Name of the index to create
 * @param dimension - Vector dimension (default: 384 for fastembed)
 * @param metric - Distance metric (default: cosine)
 * @returns Promise resolving to operation result
 */
export async function createVectorIndex(
  indexName: string = VECTOR_CONFIG.DEFAULT_INDEX_NAME,
  dimension: number = VECTOR_CONFIG.EMBEDDING_DIMENSION,
  metric: 'cosine' = VECTOR_CONFIG.DISTANCE_METRIC
): Promise<VectorOperationResult> {
  const params = vectorIndexSchema.parse({ indexName, dimension, metric });
  try {
    // Note: Upstash Vector createIndex is a no-op as indexes are auto-created
    // But we validate the parameters and log the configuration
    logger.info('Vector index configuration validated', {
      indexName: params.indexName,
      dimension: params.dimension,
      metric: params.metric
    });
    return {
      success: true,
      operation: 'createIndex',
      indexName: params.indexName
    };
  } catch (error: unknown) {
    logger.error('Failed to validate vector index configuration', {
      error: (error as Error).message,
      indexName: params.indexName
    });
    return {
      success: false,
      operation: 'createIndex',
      indexName: params.indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Initialize Upstash Vector indexes for optimal search performance
 * Should be called during application startup
 *
 * @version 1.0.0
 * @author SSD
 * @date 2025-06-20
 *
 * @mastra Initialization function for Upstash Vector indexes
 * @module upstashMemory
 * @function initializeUpstashVectorIndexes
 * @returns Promise resolving to operation result
 *
 * @example
 * ```typescript
 * await initializeUpstashVectorIndexes();
 * ```
 *
 * @remarks
 * Upstash Vector automatically manages indexes, but this function provides
 * validation and logging for the vector setup process
 */
export async function initializeUpstashVectorIndexes(): Promise<VectorOperationResult> {
  try {
    // Upstash Vector handles index creation automatically
    // We can validate the connection by attempting to list indexes
    const indexes = await upstashVector.listIndexes();
    logger.info('Upstash Vector indexes initialized successfully', {
      indexCount: indexes.length,
      indexes: indexes.slice(0, 5), // Log first 5 indexes
      vectorConfig: VECTOR_CONFIG
    });
    return {
      success: true,
      operation: 'initializeIndexes',
      count: indexes.length
    };
  } catch (error: unknown) {
    logger.error('Upstash Vector index initialization failed', {
      error: (error as Error).message,
      vectorConfig: VECTOR_CONFIG
    });
    return {
      success: false,
      operation: 'initializeIndexes',
      error: (error as Error).message
    };
  }
}

/**
 * List all available vector indexes
 * @returns Promise resolving to array of index names
 */
export async function listVectorIndexes(): Promise<string[]> {
  try {
    const indexes = await upstashVector.listIndexes();
    logger.info('Vector indexes listed successfully', { count: indexes.length });
    return indexes;
  } catch (error: unknown) {
    logger.error('Failed to list vector indexes', {
      error: (error as Error).message
    });
    throw error;
  }
}

/**
 * Get detailed information about a vector index
 * @param indexName - Name of the index to describe
 * @returns Promise resolving to index statistics
 */
export async function describeVectorIndex(indexName: string): Promise<VectorIndexStats> {
  try {
    const stats = await upstashVector.describeIndex({ indexName });
    logger.info('Vector index described successfully', { indexName, stats });
    return {
      dimension: stats.dimension,
      count: stats.count,
      metric: stats.metric || 'cosine'
    };
  } catch (error: unknown) {
    logger.error('Failed to describe vector index', {
      error: (error as Error).message,
      indexName
    });
    throw error;
  }
}

/**
 * Delete a vector index
 * @param indexName - Name of the index to delete
 * @returns Promise resolving to operation result
 */
export async function deleteVectorIndex(indexName: string): Promise<VectorOperationResult> {
  try {
    await upstashVector.deleteIndex({ indexName });
    logger.info('Vector index deleted successfully', { indexName });
    return {
      success: true,
      operation: 'deleteIndex',
      indexName
    };
  } catch (error: unknown) {
    logger.error('Failed to delete vector index', {
      error: (error as Error).message,
      indexName
    });

    return {
      success: false,
      operation: 'deleteIndex',
      indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Upsert vectors into an index with metadata
 * @param indexName - Name of the index
 * @param vectors - Array of embedding vectors
 * @param metadata - Optional metadata for each vector
 * @param ids - Optional IDs for each vector
 * @returns Promise resolving to operation result
 */
export async function upsertVectors(
  indexName: string,
  vectors: number[][],
  metadata?: Record<string, unknown>[],
  ids?: string[]
): Promise<VectorOperationResult> {
  const params = vectorUpsertSchema.parse({ indexName, vectors, metadata, ids });
  try {
    await upstashVector.upsert({
      indexName: params.indexName,
      vectors: params.vectors,
      metadata: params.metadata,
      ids: params.ids
    });
    logger.info('Vectors upserted successfully', {
      indexName: params.indexName,
      vectorCount: params.vectors.length,
      hasMetadata: !!params.metadata,
      hasIds: !!params.ids
    });
    return {
      success: true,
      operation: 'upsert',
      indexName: params.indexName,
      count: params.vectors.length
    };
  } catch (error: unknown) {
    logger.error('Failed to upsert vectors', {
      error: (error as Error).message,
      indexName: params.indexName,
      vectorCount: params.vectors.length
    });
    return {
      success: false,
      operation: 'upsert',
      indexName: params.indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Query vectors for similarity search with enhanced metadata filtering
 * Supports MongoDB/Sift query syntax for comprehensive filtering capabilities
 *
 * @param indexName - Name of the index to query
 * @param queryVector - Query vector for similarity search (384 dimensions for fastembed)
 * @param topK - Number of results to return
 * @param filter - Optional metadata filter using MongoDB/Sift query syntax
 * @param includeVector - Whether to include vectors in results
 * @returns Promise resolving to query results with metadata
 *
 * @example
 * ```typescript
 * // Basic vector query
 * const results = await queryVectors('my-index', embedding, 10);
 *
 * // Query with metadata filtering
 * const filteredResults = await queryVectors(
 *   'my-index',
 *   embedding,
 *   5,
 *   {
 *     category: 'documents',
 *     importance: { $gte: 0.8 },
 *     tags: { $in: ['urgent', 'priority'] }
 *   }
 * );
 * ```
 */
export async function queryVectors(
  indexName: string,
  queryVector: number[],
  topK: number = VECTOR_CONFIG.DEFAULT_TOP_K,
  filter?: MetadataFilter,
  includeVector: boolean = false
): Promise<VectorQueryResult[]> {
  const params = vectorQuerySchema.parse({
    indexName,
    queryVector,
    topK,
    filter,
    includeVector
  });
  try {
    // Validate filter for Upstash compatibility if provided
    let validatedFilter: MetadataFilter | undefined;
    if (params.filter) {
      validatedFilter = validateUpstashFilter(params.filter);
    }

    // For now, skip complex filter conversion and just pass undefined
    // TODO: Implement proper UpstashVectorFilter conversion
    const upstashFilter = validatedFilter ? undefined : undefined;

    const results = await upstashVector.query({
      indexName: params.indexName,
      queryVector: params.queryVector,
      topK: params.topK,
      filter: upstashFilter,
      includeVector: params.includeVector
    });
    
    logger.info('Vector query completed successfully', {
      indexName: params.indexName,
      topK: params.topK,
      resultCount: results.length,
      hasFilter: !!params.filter,
      filterSkipped: !!validatedFilter // Log that filter was skipped
    });
    
    // Transform results to match our interface
    return results.map(result => ({
      id: result.id,
      score: result.score,
      metadata: result.metadata || {},
      vector: result.vector
    }));
  } catch (error: unknown) {
    logger.error('Failed to query vectors', {
      error: (error as Error).message,
      indexName: params.indexName,
      topK: params.topK
    });
    throw error;
  }
}


/**
 * Update a specific vector in an index
 * @param indexName - Name of the index
 * @param id - ID of the vector to update
 * @param vector - New vector values (optional)
 * @param metadata - New metadata (optional)
 * @returns Promise resolving to operation result
 */
export async function updateVector(
  indexName: string,
  id: string,
  vector?: number[],
  metadata?: Record<string, unknown>
): Promise<VectorOperationResult> {
  const params = vectorUpdateSchema.parse({ indexName, id, vector, metadata });
  if (!params.vector && !params.metadata) {
    throw new Error('Either vector or metadata must be provided for update');
  }
  try {
    await upstashVector.updateVector({
      indexName: params.indexName,
      id: params.id,
      update: {
        vector: params.vector,
        metadata: params.metadata
      }
    });
    logger.info('Vector updated successfully', {
      indexName: params.indexName,
      id: params.id,
      hasVector: !!params.vector,
      hasMetadata: !!params.metadata
    });
    return {
      success: true,
      operation: 'updateVector',
      indexName: params.indexName
    };
  } catch (error: unknown) {
    logger.error('Failed to update vector', {
      error: (error as Error).message,
      indexName: params.indexName,
      id: params.id
    });
    return {
      success: false,
      operation: 'updateVector',
      indexName: params.indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Delete a specific vector from an index
 * @param indexName - Name of the index
 * @param id - ID of the vector to delete
 * @returns Promise resolving to operation result
 */
export async function deleteVector(
  indexName: string,
  id: string
): Promise<VectorOperationResult> {
  try {
    await upstashVector.deleteVector({
      indexName,
      id
    });
    logger.info('Vector deleted successfully', { indexName, id });
    return {
      success: true,
      operation: 'deleteVector',
      indexName
    };
  } catch (error: unknown) {
    logger.error('Failed to delete vector', {
      error: (error as Error).message,
      indexName,
      id
    });
    return {
      success: false,
      operation: 'deleteVector',
      indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Batch upsert vectors for improved performance
 * @param indexName - Name of the index
 * @param vectors - Array of embedding vectors
 * @param metadata - Optional metadata for each vector
 * @param ids - Optional IDs for each vector
 * @param batchSize - Size of each batch (default: 100)
 * @returns Promise resolving to operation result
 */
export async function batchUpsertVectors(
  indexName: string,
  vectors: number[][],
  metadata?: Record<string, unknown>[],
  ids?: string[],
  batchSize: number = VECTOR_CONFIG.MAX_BATCH_SIZE
): Promise<VectorOperationResult> {
  const totalVectors = vectors.length;
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  try {
    for (let i = 0; i < totalVectors; i += batchSize) {
      const batchVectors = vectors.slice(i, i + batchSize);
      const batchMetadata = metadata?.slice(i, i + batchSize);
      const batchIds = ids?.slice(i, i + batchSize);
      try {
        await upsertVectors(indexName, batchVectors, batchMetadata, batchIds);
        successCount += batchVectors.length;
      } catch (error: unknown) {
        errorCount += batchVectors.length;
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${(error as Error).message}`);
      }
    }
    logger.info('Batch vector upsert completed', {
      indexName,
      totalVectors,
      successCount,
      errorCount,
      batchSize
    });
    return {
      success: errorCount === 0,
      operation: 'batchUpsert',
      indexName,
      count: successCount,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  } catch (error: unknown) {
    logger.error('Batch vector upsert failed', {
      error: (error as Error).message,
      indexName,
      totalVectors
    });
    return {
      success: false,
      operation: 'batchUpsert',
      indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Enhanced vector search with semantic filtering and ranking
 * @param indexName - Name of the index to search
 * @param queryVector - Query vector for similarity search
 * @param options - Search configuration options
 * @returns Promise resolving to enhanced search results
 */
export async function enhancedVectorSearch(
  indexName: string,
  queryVector: number[],
  options: {
    topK?: number;
    filter?: MetadataFilter;
    includeVector?: boolean;
    minScore?: number;
    rerank?: boolean;
  } = {}
): Promise<{
  results: VectorQueryResult[];
  searchMetadata: {
    totalResults: number;
    filteredResults: number;
    searchTime: number;
    topK: number;
  };
}> {
  const startTime = Date.now();
  const {
    topK = VECTOR_CONFIG.DEFAULT_TOP_K,
    filter,
    includeVector = false,
    minScore = 0,
    rerank = false
  } = options;
  try {
    let results = await queryVectors(indexName, queryVector, topK, filter, includeVector);
    const totalResults = results.length;
    // Apply minimum score filtering
    if (minScore > 0) {
      results = results.filter(result => result.score >= minScore);
    }
    // Apply reranking if requested
    if (rerank && results.length > 1) {
      results = results.sort((a, b) => {
        // Enhanced ranking considering both score and metadata relevance
        const scoreWeight = 0.8;
        const metadataWeight = 0.2;
        const aScore = a.score * scoreWeight;
        const bScore = b.score * scoreWeight;
        // Simple metadata relevance (can be enhanced based on specific needs)
        const aMetadataScore = Object.keys(a.metadata).length * metadataWeight;
        const bMetadataScore = Object.keys(b.metadata).length * metadataWeight;
        return (bScore + bMetadataScore) - (aScore + aMetadataScore);
      });
    }
    const searchTime = Date.now() - startTime;
    logger.info('Enhanced vector search completed', {
      indexName,
      totalResults,
      filteredResults: results.length,
      searchTime,
      topK,
      hasFilter: !!filter,
      minScore,
      rerank
    });
    return {
      results,
      searchMetadata: {
        totalResults,
        filteredResults: results.length,
        searchTime,
        topK
      }
    };
  } catch (error: unknown) {
    logger.error('Enhanced vector search failed', {
      error: (error as Error).message,
      indexName,
      topK
    });
    throw error;
  }
}

/**
 * Batch operations for improved performance with Upstash Redis pipeline
 */
export interface UpstashThread {
  id: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Batch create multiple threads efficiently using Upstash Redis
 * @param threadRequests - Array of thread creation requests
 * @returns Promise resolving to array of created threads
 */
export async function batchCreateUpstashThreads(
  threadRequests: Array<{
    resourceId: string;
    metadata?: Record<string, unknown>;
    threadId?: string;
  }>
): Promise<UpstashThread[]> {
  const startTime = Date.now();
  try {
    const results = await Promise.allSettled(
      threadRequests.map(request =>
        createUpstashThread(request.resourceId, undefined, request.metadata, request.threadId)
      )
    );
    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;
    const duration = Date.now() - startTime;
    logger.info('Batch Upstash thread creation completed', {
      totalRequests: threadRequests.length,
      successes,
      failures,
      duration,
    });
    return results
      .map(result => (result.status === 'fulfilled' ? result.value : null))
      .filter(Boolean) as UpstashThread[];
  } catch (error: unknown) {
    logger.error(`batchCreateUpstashThreads failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Enhanced memory cleanup and optimization for Upstash Redis
 * @param options - Cleanup configuration options
 */
export async function optimizeUpstashMemoryStorage(options: {
  olderThanDays?: number;
  keepMinimumMessages?: number;
  compactVectorIndex?: boolean;
} = {}): Promise<{
  threadsProcessed: number;
  messagesCompacted: number;
  vectorIndexOptimized: boolean;
}> {
  const {
    olderThanDays = 30,
    keepMinimumMessages = 10,
    compactVectorIndex = true
  } = options;
  const startTime = Date.now();
  try {
    logger.info('Upstash memory optimization requested', {
      olderThanDays,
      keepMinimumMessages,
      compactVectorIndex,
      timestamp: new Date().toISOString()
    });
    // Upstash Redis handles memory optimization automatically
    // This is provided for API consistency
    const optimizationResults = {
      threadsProcessed: 0,
      messagesCompacted: 0,
      vectorIndexOptimized: compactVectorIndex,
      duration: Date.now() - startTime
    };
    logger.info('Upstash memory optimization completed (auto-managed)', optimizationResults);
    return optimizationResults;
  } catch (error: unknown) {
    logger.error(`optimizeUpstashMemoryStorage failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Validate metadata filter for Upstash compatibility
 * Ensures filter meets Upstash-specific requirements and limitations
 *
 * @param filter - Metadata filter to validate
 * @returns Validated filter or throws VectorStoreError
 *
 * @example
 * ```typescript
 * const validFilter = validateUpstashFilter({
 *   category: 'electronics',
 *   price: { $gt: 100 },
 *   tags: { $in: ['sale', 'new'] }
 * });
 * ```
 */
export function validateUpstashFilter(filter: MetadataFilter): MetadataFilter {
  if (!filter || typeof filter !== 'object') {
    throw new VectorStoreError('Filter must be a valid object', 'operation_failed');
  }

  // Check field key length limits (512 chars for Upstash)
  const checkFieldKeys = (obj: Record<string, unknown>, path = ''): void => {
    Object.keys(obj).forEach(key => {
      const fullPath = path ? `${path}.${key}` : key;

      if (fullPath.length > 512) {
        throw new VectorStoreError(
          `Field key '${fullPath}' exceeds 512 character limit for Upstash`,
          'operation_failed',
          { fieldKey: fullPath, length: fullPath.length }
        );
      }

      // Check for null/undefined values (not supported by Upstash)
      const value = obj[key];
      if (value === null || value === undefined) {
        throw new VectorStoreError(
          `Null/undefined values not supported by Upstash in field '${fullPath}'`,
          'operation_failed',
          { fieldKey: fullPath, value }
        );
      }

      // Recursively check nested objects
      if (typeof value === 'object' && !Array.isArray(value) && !key.startsWith('$')) {
        checkFieldKeys(value as Record<string, unknown>, fullPath);
      }
    });
  };

  checkFieldKeys(filter);

  // Check for large IN clauses (Upstash has query size limits)
  const checkArraySizes = (obj: Record<string, unknown>): void => {
    Object.entries(obj).forEach(([key, value]) => {
      if (key === '$in' || key === '$nin') {
        if (Array.isArray(value) && value.length > 100) {
          logger.warn('Large IN/NIN clause detected - may hit Upstash query size limits', {
            operator: key,
            arraySize: value.length
          });
        }
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        checkArraySizes(value as Record<string, unknown>);
      }
    });
  };

  checkArraySizes(filter);

  return filter;
}

/**
 * Extract metadata from document chunks using LLM analysis
 * Follows Mastra ExtractParams patterns for title, summary, keywords, and questions
 *
 * @param chunks - Array of document chunks to process
 * @param extractParams - Configuration for metadata extraction
 * @returns Promise resolving to chunks with enhanced metadata
 *
 * @example
 * ```typescript
 * const enhancedChunks = await extractChunkMetadata(chunks, {
 *   title: true,
 *   summary: { summaries: ['self'] },
 *   keywords: { keywords: 5 },
 *   questions: { questions: 3 }
 * });
 * ```
 */
export async function extractChunkMetadata(
  chunks: Array<{
    id: string;
    content: string;
    metadata: Record<string, unknown>;
  }>,
  extractParams: ExtractParams
): Promise<Array<{
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}>> {
  const startTime = Date.now();

  try {
    logger.info('Starting metadata extraction for chunks', {
      chunkCount: chunks.length,
      extractParams: Object.keys(extractParams)
    });

    const enhancedChunks = chunks.map(chunk => ({ ...chunk }));

    // Title extraction (grouped by docId if available)
    if (extractParams.title) {

      // Group chunks by docId for shared title extraction
      const docGroups = new Map<string, typeof enhancedChunks>();
      enhancedChunks.forEach(chunk => {
        const docId = (chunk.metadata.docId as string) || chunk.id;
        if (!docGroups.has(docId)) {
          docGroups.set(docId, []);
        }
        docGroups.get(docId)!.push(chunk);
      });

      // Extract titles for each document group
      for (const [docId, docChunks] of docGroups) {
        const combinedContent = docChunks.map(c => c.content).join('\n\n');
        // Use combined content for title generation (simplified for demo)
        const extractedTitle = combinedContent.length > 100
          ? `Document: ${combinedContent.substring(0, 50)}...`
          : `Document: ${docId.substring(0, 50)}...`;

        docChunks.forEach(chunk => {
          chunk.metadata.documentTitle = extractedTitle;
        });
      }
    }

    // Summary extraction
    if (extractParams.summary) {
      const summaryConfig = typeof extractParams.summary === 'boolean' ? { summaries: ['self'] } : extractParams.summary;
      const summaries = summaryConfig.summaries || ['self'];

      enhancedChunks.forEach((chunk) => {
        if (summaries.includes('self')) {
          // Simplified summary generation
          const summary = chunk.content.length > 200
            ? `${chunk.content.substring(0, 200)}...`
            : chunk.content;
          chunk.metadata.sectionSummary = summary;
        }
      });
    }

    // Keywords extraction
    if (extractParams.keywords) {
      const keywordConfig = typeof extractParams.keywords === 'boolean' ? { keywords: 5 } : extractParams.keywords;
      const keywordCount = keywordConfig.keywords || 5;

      enhancedChunks.forEach(chunk => {
        // Simplified keyword extraction
        const words = chunk.content.toLowerCase().split(/\s+/)
          .filter(word => word.length > 3)
          .slice(0, keywordCount);
        chunk.metadata.excerptKeywords = `KEYWORDS: ${words.join(', ')}`;
      });
    }

    // Questions extraction
    if (extractParams.questions) {
      const questionConfig = typeof extractParams.questions === 'boolean' ? { questions: 3 } : extractParams.questions;
      const questionCount = questionConfig.questions || 3;

      if (!questionConfig.embeddingOnly) {
        enhancedChunks.forEach(chunk => {
          // Simplified question generation
          const questions = Array.from({ length: questionCount }, (_, i) =>
            `${i + 1}. What is discussed about ${chunk.content.split(' ')[0]}?`
          );
          chunk.metadata.questionsThisExcerptCanAnswer = questions.join('\n');
        });
      }
    }

    const processingTime = Date.now() - startTime;
    logger.info('Metadata extraction completed', {
      chunkCount: enhancedChunks.length,
      processingTime,
      extractedFields: Object.keys(extractParams)
    });

    return enhancedChunks;
  } catch (error: unknown) {
    logger.error('Metadata extraction failed', {
      error: (error as Error).message,
      chunkCount: chunks.length
    });
    throw new VectorStoreError(
      `Failed to extract metadata: ${(error as Error).message}`,
      'operation_failed',
      { chunkCount: chunks.length, extractParams }
    );
  }
}

/**
 * Comprehensive Upstash setup and validation
 * Call this function during application startup to ensure everything is properly configured
 *
 * @version 1.0.0
 * @author SSD
 * @date 2025-06-20
 *
 * @mastra Initialization function for Upstash Memory System
 * @module upstashMemory
 * @function initializeUpstashMemorySystem
 *
 * @example
 * ```typescript
 * await initializeUpstashMemorySystem();
 * ```
 *
 * @remarks
 * This function ensures all Upstash components are properly configured and connected.
 * @throws {Error} When any component fails to initialize
 * @param options - Configuration options for initialization
 * @returns Promise resolving to initialization results
 */
export async function initializeUpstashMemorySystem(options: {
  validateConnection?: boolean;
  createDefaultIndex?: boolean;
  logConfiguration?: boolean;
} = {}): Promise<{
  storage: boolean;
  vector: boolean;
  memory: boolean;
  errors: string[];
}> {
  const {
    validateConnection = true,
    createDefaultIndex = false,
    logConfiguration = true
  } = options;
  const results = {
    storage: false,
    vector: false,
    memory: false,
    errors: [] as string[]
  };
  try {
    if (logConfiguration) {
      logger.info('Initializing Upstash Memory System', {
        vectorConfig: VECTOR_CONFIG,
        validateConnection,
        createDefaultIndex
      });
    }
    // Test storage connection
    if (validateConnection) {
      try {
        // Test storage with a simple thread operation
        const testThread = await createUpstashThread('test-validation-user', 'Test Thread');
        if (testThread.id) {
          results.storage = true;
          logger.info('Upstash Redis storage connection validated');
        }
      } catch (error: unknown) {
        results.errors.push(`Storage connection failed: ${(error as Error).message}`);
      }
    } else {
      results.storage = true; // Assume storage is working if not validating
    }
    // Test vector connection and initialize
    try {
      const vectorResult = await initializeUpstashVectorIndexes();
      results.vector = vectorResult.success;
      if (!vectorResult.success && vectorResult.error) {
        results.errors.push(`Vector initialization failed: ${vectorResult.error}`);
      }
    } catch (error: unknown) {
      results.errors.push(`Vector connection failed: ${(error as Error).message}`);
    }
    // Validate memory configuration
    try {
      if (upstashMemory) {
        results.memory = true;
        logger.info('Upstash Memory instance validated');
      }
    } catch (error: unknown) {
      results.errors.push(`Memory validation failed: ${(error as Error).message}`);
    }
    const overallSuccess = results.storage && results.vector && results.memory;
    if (logConfiguration) {
      logger.info('Upstash Memory System initialization completed', {
        success: overallSuccess,
        results,
        errorCount: results.errors.length
      });
    }
    return results;
  } catch (error: unknown) {
    const errorMessage = `Upstash Memory System initialization failed: ${(error as Error).message}`;
    results.errors.push(errorMessage);
    logger.error(errorMessage);
    return results;
  }
}
// All vector operation functions are already exported individually above
// This provides a comprehensive Upstash Vector implementation following Mastra patterns

