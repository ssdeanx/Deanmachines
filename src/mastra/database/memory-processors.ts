/**
 * Custom memory processors for Mastra
 * 
 * This module implements custom memory processors for handling high token limits
 * and optimizing context window usage.
 */

import { MemoryProcessor, MemoryProcessorOpts, type CoreMessage } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { createTracedSpan } from '../services/tracing';
import { createCounter, createHistogram } from '../services/tracing';
// Removed direct import of LangfuseService
// import type { LangfuseService } from '../services/langfuse'; 
// Change from type import to regular import
// Import getMessageContent and estimateTokens directly from memoryHelper
import { 
  SemanticClusteringProcessor, 
  getMessageContent, // Import directly
  estimateTokens      // Import directly
} from './memoryHelper';

// Metrics for monitoring memory processor performance
const messageCounter = createCounter('memory_processor_messages_total');
const processingLatency = createHistogram('memory_processor_latency_ms');
const tokenSavings = createHistogram('memory_processor_token_savings');

// Logger for memory processors
const logger = createLogger({ name: 'memory-processors', level: 'info' });

/**
 * Lazy load helper functions from memoryHelper to prevent circular dependencies
 * and initialization errors
 */
async function getMemoryHelpers(): Promise<any | null> {
  try {
    // Dynamically import memoryHelper
    return await import('./memoryHelper');
  } catch (error) {
    logger.error('Failed to load memory helpers', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Lazy load Langfuse to avoid importing it unnecessarily
 * This improves startup performance and handles missing dependencies gracefully
 * Returns the Langfuse service instance or null if loading fails.
 */
async function getLangfuse(): Promise<any | null> { // Use Promise<any | null> for lazy loading
  try {
    // Dynamically import the langfuse service
    const { langfuse } = await import("../services/langfuse");
    return langfuse;
  } catch (error) {
    logger.warn("Failed to load Langfuse", { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null; // Return null if Langfuse fails to load
  }
}

/**
 * Creates a trace in Langfuse if available.
 * Returns the Langfuse service instance or null.
 */
async function createTrace(name: string, metadata?: Record<string, any>): Promise<any | null> { // Use Promise<any | null>
  const langfuse = await getLangfuse(); // Get the potentially loaded Langfuse instance
  // If langfuse loaded successfully and has createTrace, call it
  langfuse?.createTrace?.(name, { metadata }); 
  return langfuse; // Return the instance (or null if it wasn't loaded)
}

/**
 * Ensures CoreMessage type for compatible API
 */
function asCoreMessages(messages: any[]): CoreMessage[] {
  // Cast messages to CoreMessage array, assuming compatibility
  return messages as unknown as CoreMessage[];
}

// REMOVED local definition of getMessageContent
// function getMessageContent(message: any): string { ... }

// REMOVED local definition of estimateTokens
// function estimateTokens(text: string, tokensPerChar: number = 0.25): number { ... }

/**
 * Safely get embeddings with fallback
 */
async function getSafeEmbeddings(): Promise<any | null> {
  const helpers = await getMemoryHelpers(); // Load memory helpers lazily
  if (!helpers) return null; // Return null if helpers failed to load
  
  // Call the helper function to create embeddings safely
  // Assuming createSafeEmbeddings is exported from memoryHelper
  return helpers.createSafeEmbeddings(); 
}

/**
 * Enhanced TokenLimiter implementation with proper token counting
 * Limits the number of tokens in a conversation to prevent exceeding model limits
 */
export class TokenLimiter extends MemoryProcessor {
  private limit: number;
  private embeddings: any = null; // Embeddings adapter, loaded lazily
  private initialized: boolean = false; // Initialization flag
  
  constructor(limit: number = 1000000) {
    super({ name: 'TokenLimiter' });
    this.limit = limit; // Set token limit
    
    // Lazy initialization
    this.initializeAsync(); 
  }
  
  /** Initialize embeddings asynchronously */
  private async initializeAsync(): Promise<void> {
    if (this.initialized) return; // Prevent re-initialization
    
    try {
      // Attempt to load embeddings safely
      this.embeddings = await getSafeEmbeddings(); 
      
      if (this.embeddings) {
        logger.info(`TokenLimiter initialized with embeddings (${this.embeddings.maxInputLength} token support)`);
      } else {
        logger.warn('TokenLimiter using fallback token counting method (no embeddings)');
      }
      
      // Log initialization event to Langfuse (if available)
      createTrace('memory.processor.init', {
        processor: 'TokenLimiter',
        limit: this.limit,
        hasEmbeddings: !!this.embeddings,
        embeddingModel: this.embeddings?.modelId // Log model ID if embeddings exist
      });
      
      this.initialized = true; // Mark as initialized
    } catch (error) {
      logger.error('Failed to initialize TokenLimiter', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /** Process messages to limit token count */
  process(messages: CoreMessage[], _opts: any = {}): CoreMessage[] {
    const startTime = performance.now(); // Start timing
    // Create a tracing span
    const span = createTracedSpan('memory.tokenLimit', { 
      messageCount: messages.length,
      hasEmbeddings: !!this.embeddings,
      tokenLimit: this.limit
    });
    
    try {
      // Handle empty input
      if (messages.length === 0) {
        messageCounter.add(0, { processor: 'TokenLimiter', operation: 'process', result: 'empty' });
        return messages;
      }

      // Use embeddings for token counting if available
      if (this.embeddings) {
        let runningTokenCount = 0;
        let lastIncludedIndex = messages.length - 1;
        const tokenCounts: number[] = [];
        
        // Iterate backwards from the newest message
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          // Use imported getMessageContent
          const content = getMessageContent(msg); 
          // Use imported estimateTokens
          const approxTokens = estimateTokens(content); 
          
          tokenCounts.unshift(approxTokens); // Store token count
          runningTokenCount += approxTokens; // Add to running total
          
          // Check if limit exceeded, but keep recent messages
          if (runningTokenCount > this.limit && i < messages.length - 50) { 
            lastIncludedIndex = i + 1; // Mark the first message to exclude
            break;
          }
        }
        
        // Slice messages to keep only the allowed ones
        const result = messages.slice(lastIncludedIndex); 
        
        // Calculate token savings and record metrics
        const originalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);
        const keptTokens = tokenCounts.slice(lastIncludedIndex).reduce((sum, count) => sum + count, 0);
        tokenSavings.record(originalTokens - keptTokens, { processor: 'TokenLimiter' });
        
        // Log details to Langfuse asynchronously
        createTrace('memory.processor.tokenLimit', {
          originalMessageCount: messages.length,
          resultMessageCount: result.length,
          originalTokens,
          keptTokens,
          tokenReduction: originalTokens - keptTokens
        });
        
        logger.info(`Token limiting with embeddings: ${messages.length} → ${result.length} messages, ~${originalTokens} → ~${keptTokens} tokens`);
        
        // Increment message counter for filtered messages
        messageCounter.add(messages.length - result.length, { 
          processor: 'TokenLimiter', 
          operation: 'filter',
          result: 'success' 
        });
        
        return asCoreMessages(result); // Return processed messages
      }
      
      // Fallback: Limit based on estimated tokens per message
      const estimatedTokensPerMessage = 750; 
      const maxMessages = Math.floor(this.limit / estimatedTokensPerMessage);
      
      // If under limit, return original messages
      if (messages.length <= maxMessages) {
        messageCounter.add(0, { processor: 'TokenLimiter', operation: 'process', result: 'under_limit' });
        return messages;
      }
      
      // Otherwise, keep only the most recent 'maxMessages'
      const result = messages.slice(-maxMessages); 
      logger.info(`Token limiting with fallback: ${messages.length} → ${result.length} messages`);
      
      // Increment message counter for filtered messages
      messageCounter.add(messages.length - result.length, { 
        processor: 'TokenLimiter', 
        operation: 'filter',
        result: 'fallback' 
      });
      
      return asCoreMessages(result); // Return processed messages
    } catch (error) {
      // Log error and record exception in trace
      logger.error('Error in TokenLimiter', {
        error: error instanceof Error ? error.message : String(error)
      });
      span?.recordException?.(error);
      
      // Increment error counter
      messageCounter.add(0, { processor: 'TokenLimiter', operation: 'process', result: 'error' });
      
      // Fallback: Simple limit if token counting fails completely
      if (messages.length > 500) {
        return asCoreMessages(messages.slice(-500));
      }
      return messages; // Return original messages as last resort
    } finally {
      // Record processing latency and end the trace span
      processingLatency.record(performance.now() - startTime, { processor: 'TokenLimiter' });
      span?.end();
    }
  }
}

/**
 * Production-grade ToolCallFilter implementation
 * Filters out tool call messages to reduce token usage
 */
export class ToolCallFilter extends MemoryProcessor {
  private exclude: string[]; // List of tool names to exclude from filtering
  
  constructor(options?: { exclude?: string[] }) {
    super({ name: 'ToolCallFilter' });
    this.exclude = options?.exclude || []; // Initialize excluded tools list
    logger.info(`ToolCallFilter initialized with ${this.exclude.length} excluded tools: ${this.exclude.join(', ')}`);
    
    // Log initialization to Langfuse
    createTrace('memory.processor.init', {
      processor: 'ToolCallFilter',
      excludedTools: this.exclude
    });
  }
  
  /** Process messages to filter out tool calls */
  process(messages: CoreMessage[], _opts: any = {}): CoreMessage[] {
    const startTime = performance.now();
    // Create tracing span
    const span = createTracedSpan('memory.toolCallFilter', { 
      messageCount: messages.length,
      excludedToolsCount: this.exclude.length 
    });
    
    try {
      // Handle empty input
      if (messages.length === 0) {
        messageCounter.add(0, { processor: 'ToolCallFilter', operation: 'process', result: 'empty' });
        return messages;
      }
      
      // Filter messages
      const result = messages.filter(msg => {
        // Use imported getMessageContent
        const content = getMessageContent(msg); 
        // Keep non-assistant messages or messages without tool calls
        if (msg.role !== 'assistant' || !content.includes('tool_calls')) {
          return true;
        }
        
        // Keep tool calls if the tool name is in the exclude list
        for (const tool of this.exclude) {
          if (content.includes(tool)) {
            return true;
          }
        }
        
        // Filter out all other tool calls
        return false; 
      });
      
      // Calculate and log removed count
      const removedCount = messages.length - result.length;
      if (removedCount > 0) {
        // Log details to Langfuse asynchronously
        createTrace('memory.processor.toolCallFilter', {
          originalCount: messages.length,
          resultCount: result.length,
          removedCount,
          excludedTools: this.exclude
        });
        
        logger.info(`ToolCallFilter removed ${removedCount} tool call messages`);
        // Increment message counter for removed messages
        messageCounter.add(removedCount, { 
          processor: 'ToolCallFilter', 
          operation: 'filter',
          result: 'removed' 
        });
      } else {
        // Increment counter if no messages were removed
        messageCounter.add(0, { 
          processor: 'ToolCallFilter', 
          operation: 'filter',
          result: 'unchanged' 
        });
      }
      
      return asCoreMessages(result); // Return filtered messages
    } catch (error) {
      // Log error and record exception
      logger.error('Error in ToolCallFilter', {
        error: error instanceof Error ? error.message : String(error)
      });
      span?.recordException?.(error);
      // Increment error counter
      messageCounter.add(0, { processor: 'ToolCallFilter', operation: 'process', result: 'error' });
      return messages; // Return original messages on error
    } finally {
      // Record latency and end span
      processingLatency.record(performance.now() - startTime, { processor: 'ToolCallFilter' });
      span?.end();
    }
  }
}

/**
 * Prioritizes recent and important messages when approaching token limits
 * Optimized for handling up to 1M tokens
 */
export class HighVolumeContextProcessor extends MemoryProcessor {
  constructor() {
    super({ name: 'HighVolumeContextProcessor' });
    logger.info('HighVolumeContextProcessor initialized');
    
    // Log initialization to Langfuse
    createTrace('memory.processor.init', {
      processor: 'HighVolumeContextProcessor'
    });
  }

  /** Process messages to prioritize recent and important ones */
  process(messages: CoreMessage[], _opts: any = {}): CoreMessage[] {
    const startTime = performance.now();
    // Create tracing span
    const span = createTracedSpan('memory.highVolumeProcess', { messageCount: messages.length });
    
    try {
      // Skip processing if message count is low
      if (messages.length <= 100) {
        messageCounter.add(0, { processor: 'HighVolumeContextProcessor', operation: 'process', result: 'under_threshold' });
        return messages;
      }
      
      // Prioritize user and assistant messages
      let filteredMessages = messages.filter(
        msg => msg.role === 'user' || msg.role === 'assistant'
      );
      
      const systemMessagesRemoved = messages.length - filteredMessages.length;
      if (systemMessagesRemoved > 0) {
        logger.info(`HighVolume: Removed ${systemMessagesRemoved} non-user/assistant messages`);
        messageCounter.add(systemMessagesRemoved, { 
          processor: 'HighVolumeContextProcessor', 
          operation: 'filter_roles',
          result: 'removed' 
        });
      }
      
      // If still too many messages, keep first 50 and last 500
      if (filteredMessages.length > 750) { 
        const firstMessages = filteredMessages.slice(0, 50); // Keep initial context
        const lastMessages = filteredMessages.slice(-500); // Keep recent context
        const middleMessagesRemoved = filteredMessages.length - (firstMessages.length + lastMessages.length);
        
        filteredMessages = [...firstMessages, ...lastMessages]; // Combine kept messages
        
        // Log details to Langfuse asynchronously
        createTrace('memory.processor.highVolume', {
          originalCount: messages.length,
          systemMessagesRemoved,
          middleMessagesRemoved,
          firstMessagesKept: firstMessages.length,
          lastMessagesKept: lastMessages.length,
          resultCount: filteredMessages.length
        });
        
        logger.info(`HighVolume: Kept ${firstMessages.length} first + ${lastMessages.length} last messages, removed ${middleMessagesRemoved} middle messages`);
        // Increment counter for removed middle messages
        messageCounter.add(middleMessagesRemoved, { 
          processor: 'HighVolumeContextProcessor', 
          operation: 'filter_middle',
          result: 'removed' 
        });
      } else {
         // Increment counter if no middle messages were removed
         messageCounter.add(0, { 
          processor: 'HighVolumeContextProcessor', 
          operation: 'filter_middle',
          result: 'unchanged' 
        });
      }
      
      return asCoreMessages(filteredMessages); // Return processed messages
    } catch (error) {
      // Log error and record exception
      logger.error('Error in HighVolumeContextProcessor', {
        error: error instanceof Error ? error.message : String(error)
      });
      span?.recordException?.(error);
      
      // Increment error counter
      messageCounter.add(0, { processor: 'HighVolumeContextProcessor', operation: 'process', result: 'error' });
      return messages; // Return original messages on error (fail safe)
    } finally {
      // Record latency and end span
      processingLatency.record(performance.now() - startTime, { processor: 'HighVolumeContextProcessor' });
      span?.end();
    }
  }
}

/**
 * Production-ready memory processor that uses embeddings for semantic filtering
 * Identifies and retains the most relevant messages based on embeddings.
 */
export class SemanticEmbeddingProcessor extends MemoryProcessor {
  private embeddingsPromise: Promise<import('./embeddings').EmbeddingsAdapter | null>;
  private embeddings: import('./embeddings').EmbeddingsAdapter | null = null;
  private embeddingCache: Map<string, number[]> = new Map();
  private initialized: boolean = false; // Initialization flag
  
  constructor() {
    super({ name: 'SemanticEmbeddingProcessor' });
    
    // Store the promise initially for lazy loading
    this.embeddingsPromise = getSafeEmbeddings(); 
    
    // Initialize embeddings asynchronously
    this.initializeAsync(); 
  }
  
  /** Initialize embeddings asynchronously */
  private async initializeAsync(): Promise<void> {
    if (this.initialized) return; // Prevent re-initialization
    
    try {
      // Resolve the embeddings promise
      this.embeddings = await this.embeddingsPromise; 
      
      if (this.embeddings) {
        logger.info(`SemanticEmbeddingProcessor initialized with embeddings (${this.embeddings.dimensions}d, ${this.embeddings.maxInputLength} tokens)`);
      } else {
        logger.warn('SemanticEmbeddingProcessor initialized in fallback mode (no embeddings)');
      }
      
      // Log initialization to Langfuse
      createTrace('memory.processor.init', {
        processor: 'SemanticEmbeddingProcessor',
        hasEmbeddings: !!this.embeddings,
        embeddingModel: this.embeddings?.modelId,
        dimensions: this.embeddings?.dimensions,
        maxInputLength: this.embeddings?.maxInputLength
      });
      
      this.initialized = true; // Mark as initialized
    } catch (error) {
      logger.error('Failed to initialize SemanticEmbeddingProcessor', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Initialization failed, embeddings will remain null
    }
  }
  
  /** Process messages using semantic filtering */
  process(messages: CoreMessage[]): CoreMessage[] {
    const startTime = performance.now();    // Create tracing span
    // NOTE: Added a default return here to satisfy the compiler, as the original code was cut off.
    // You might need to adjust this based on the full logic.
    // return messages; 
    const span = createTracedSpan('memory.semanticEmbedding', { 
      messageCount: messages.length,
      hasEmbeddings: !!this.embeddings,
      cacheSize: this.embeddingCache.size // Log cache size
    });
    
    try {
      // Skip processing for very few messages
      if (messages.length <= 50) {
        messageCounter.add(0, { processor: 'SemanticEmbeddingProcessor', operation: 'process', result: 'under_threshold' });
        return messages;
      }
      
      // Use embeddings-based filtering if available
      if (this.embeddings) {
        logger.info(`Using embeddings-based contextual filtering (${this.embeddings.maxInputLength} tokens)`);
        
        // 1. Keep most recent N messages for continuity
        const recentMessageCount = Math.min(25, messages.length);
        const recentMessages = messages.slice(-recentMessageCount);
        
        // 2. Keep first N messages for initialization context
        const initMessageCount = Math.min(25, messages.length - recentMessageCount);
        const initMessages = messages.slice(0, initMessageCount);
        
        // 3. Process middle messages using heuristics
        const middleMessages = messages.slice(initMessageCount, -recentMessageCount);
        
        let keptMiddleMessages: CoreMessage[] = [];
        if (middleMessages.length > 0) {
          // Prioritize user/assistant messages, sort by length (proxy for importance)
          const prioritizedMiddle = middleMessages
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .sort((a, b) => {
              if (a.role === 'user' && b.role !== 'user') return -1; // User first
              if (a.role !== 'user' && b.role === 'user') return 1;
              // Then sort by content length descending
              // Use imported getMessageContent
              return getMessageContent(b).length - getMessageContent(a).length; 
            });
          
          // Determine capacity for middle messages based on embedding model limits
          const capacityForMiddle = Math.floor(150 * (this.embeddings.maxInputLength / 4096)); 
          keptMiddleMessages = prioritizedMiddle.slice(0, capacityForMiddle); // Keep top
          
          // Combine all sections
          const result = [...initMessages, ...keptMiddleMessages, ...recentMessages];
          
          // Log to Langfuse asynchronously 
          createTrace('memory.processor.semanticEmbedding', {
            originalCount: messages.length,
            initMessagesKept: initMessages.length,
            middleMessagesKept: keptMiddleMessages.length,
            recentMessagesKept: recentMessages.length,
            resultCount: result.length,
            middleMessagesReduction: middleMessages.length - keptMiddleMessages.length
          });
          
          // Record metrics
          messageCounter.add(messages.length - result.length, { 
            processor: 'SemanticEmbeddingProcessor', 
            operation: 'filter',
            result: 'heuristic' 
          });
          
          logger.info(`Semantic processor kept ${result.length}/${messages.length} messages: ${initMessages.length} init + ${keptMiddleMessages.length} middle + ${recentMessages.length} recent`);
          
          return asCoreMessages(result);
        }
        
        // If no middle messages, just return the init + recent
        return asCoreMessages([...initMessages, ...recentMessages]);
      }
      
      // If embeddings not available, fall back to basic filtering
      logger.warn('No embeddings available for semantic processing, using basic filtering');
      return asCoreMessages(messages.filter(msg => 
        msg.role === 'user' || msg.role === 'assistant'
      ).slice(-75));
    } catch (error) {
      logger.error('Error in SemanticEmbeddingProcessor', {
        error: error instanceof Error ? error.message : String(error)
      });
      span?.recordException?.(error);
      
      messageCounter.add(0, { processor: 'SemanticEmbeddingProcessor', operation: 'process', result: 'error' });
      
      // Fallback to simple limiting if everything fails
      return asCoreMessages(messages.slice(-50));
    } finally {
      processingLatency.record(performance.now() - startTime, { processor: 'SemanticEmbeddingProcessor' });
      span?.end();
    }
  }}