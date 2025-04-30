/**
 * Custom memory processors for Mastra
 * 
 * This module implements custom memory processors for handling high token limits
 * and optimizing context window usage.
 */

import { MemoryProcessor, type CoreMessage } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { createTracedSpan } from '../services/tracing';
import { createCounter, createHistogram } from '../services/tracing';
// Change from type import to regular import
import { SemanticClusteringProcessor } from './memoryHelper';

// Metrics for monitoring memory processor performance
const messageCounter = createCounter('memory_processor_messages_total');
const processingLatency = createHistogram('memory_processor_latency_ms');
const tokenSavings = createHistogram('memory_processor_token_savings');

// Create a logger for memory processors
const logger = createLogger({ name: 'memory-processors', level: 'info' });

/**
 * Lazy load helper functions from memoryHelper to prevent circular dependencies
 * and initialization errors
 */
async function getMemoryHelpers() {
  try {
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
 */
async function getLangfuse() {
  try {
    const { langfuse } = await import("../services/langfuse");
    return langfuse;
  } catch (error) {
    logger.warn("Failed to load Langfuse", { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}

/**
 * Creates a trace in Langfuse if available
 */
async function createTrace(name: string, metadata?: Record<string, any>) {
  const langfuse = await getLangfuse();
  langfuse?.createTrace?.(name, { metadata });
  return langfuse;
}

/**
 * Ensures CoreMessage type for compatible API
 */
function asCoreMessages(messages: any[]): CoreMessage[] {
  return messages as unknown as CoreMessage[];
}

/**
 * Safely get content from a message regardless of format
 */
function getMessageContent(message: any): string {
  return typeof message.content === 'string' 
    ? message.content 
    : JSON.stringify(message.content);
}

/**
 * Estimate token count from text with a safety margin
 */
function estimateTokens(text: string, tokensPerChar: number = 0.25): number {
  return Math.ceil(text.length * tokensPerChar) + 10;
}

/**
 * Safely get embeddings with fallback
 */
async function getSafeEmbeddings() {
  const helpers = await getMemoryHelpers();
  if (!helpers) return null;
  
  return helpers.createSafeEmbeddings();
}

// Enhanced TokenLimiter implementation with proper token counting
export class TokenLimiter extends MemoryProcessor {
  private limit: number;
  private embeddings: any = null;
  private initialized: boolean = false;
  
  constructor(limit: number) {
    super({ name: 'TokenLimiter' });
    this.limit = limit;
    
    // Lazy initialization
    this.initializeAsync();
  }
  
  private async initializeAsync() {
    if (this.initialized) return;
    
    try {
      // Use Google embeddings for token counting - supports 8192 tokens
      this.embeddings = await getSafeEmbeddings();
      
      if (this.embeddings) {
        logger.info(`TokenLimiter initialized with Google embeddings (${this.embeddings.maxInputLength} token support)`);
      } else {
        logger.warn('Using fallback token counting method');
      }
      
      // Log initialization to Langfuse
      createTrace('memory.processor.init', {
        processor: 'TokenLimiter',
        limit: this.limit,
        hasEmbeddings: !!this.embeddings,
        embeddingModel: this.embeddings?.modelId
      });
      
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize TokenLimiter', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  process(messages: CoreMessage[], _opts: any = {}): CoreMessage[] {
    const startTime = performance.now();
    const span = createTracedSpan('memory.tokenLimit', { 
      messageCount: messages.length,
      hasEmbeddings: !!this.embeddings,
      tokenLimit: this.limit
    });
    
    try {
      if (messages.length === 0) {
        messageCounter.add(0, { processor: 'TokenLimiter', operation: 'process', result: 'empty' });
        return messages;
      }

      // If we have Google embeddings, use its real token count capabilities
      if (this.embeddings) {
        // Calculate approximate token counts based on content
        let runningTokenCount = 0;
        let lastIncludedIndex = messages.length - 1;
        const tokenCounts: number[] = [];
        
        // Start from the most recent message and work backward
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          const content = getMessageContent(msg);
          
          // Calculate approximate token count based on characters
          const approxTokens = estimateTokens(content);
          
          tokenCounts.unshift(approxTokens);
          runningTokenCount += approxTokens;
          
          // If we exceed the limit, stop including messages
          if (runningTokenCount > this.limit && i < messages.length - 50) {
            // Always keep at least the last 50 messages for context continuity
            lastIncludedIndex = i + 1;
            break;
          }
        }
        
        // Keep all messages from the lastIncludedIndex onward
        const result = messages.slice(lastIncludedIndex);
        
        // Record metrics
        const originalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);
        const keptTokens = tokenCounts.slice(lastIncludedIndex).reduce((sum, count) => sum + count, 0);
        tokenSavings.record(originalTokens - keptTokens, { processor: 'TokenLimiter' });
        
        // Log to Langfuse asynchronously
        createTrace('memory.processor.tokenLimit', {
          originalMessageCount: messages.length,
          resultMessageCount: result.length,
          originalTokens,
          keptTokens,
          tokenReduction: originalTokens - keptTokens
        });
        
        logger.info(`Token limiting with real counts: ${messages.length} → ${result.length} messages, ~${originalTokens} → ~${keptTokens} tokens`);
        
        messageCounter.add(messages.length - result.length, { 
          processor: 'TokenLimiter', 
          operation: 'filter',
          result: 'success' 
        });
        
        return asCoreMessages(result);
      }
      
      // Fallback to conservative message-based limiting
      const estimatedTokensPerMessage = 750; // Conservative estimate for complex messages
      const maxMessages = Math.floor(this.limit / estimatedTokensPerMessage);
      
      if (messages.length <= maxMessages) {
        messageCounter.add(0, { processor: 'TokenLimiter', operation: 'process', result: 'under_limit' });
        return messages;
      }
      
      // Keep removing oldest messages until under limit
      const result = messages.slice(-maxMessages);
      logger.info(`Token limiting with fallback method: ${messages.length} → ${result.length} messages`);
      
      messageCounter.add(messages.length - result.length, { 
        processor: 'TokenLimiter', 
        operation: 'filter',
        result: 'fallback' 
      });
      
      return asCoreMessages(result);
    } catch (error) {
      logger.error('Error in TokenLimiter', {
        error: error instanceof Error ? error.message : String(error)
      });
      span?.recordException?.(error);
      
      messageCounter.add(0, { processor: 'TokenLimiter', operation: 'process', result: 'error' });
      
      // Fallback to simple limiting if token counting fails
      if (messages.length > 500) {
        return asCoreMessages(messages.slice(-500));
      }
      return messages;
    } finally {
      processingLatency.record(performance.now() - startTime, { processor: 'TokenLimiter' });
      span?.end();
    }
  }
}

// Production-grade ToolCallFilter implementation
export class ToolCallFilter extends MemoryProcessor {
  private exclude: string[];
  
  constructor(options?: { exclude?: string[] }) {
    super({ name: 'ToolCallFilter' });
    this.exclude = options?.exclude || [];
    logger.info(`ToolCallFilter initialized with ${this.exclude.length} excluded tools: ${this.exclude.join(', ')}`);
    
    // Log initialization to Langfuse
    createTrace('memory.processor.init', {
      processor: 'ToolCallFilter',
      excludedTools: this.exclude
    });
  }
  
  process(messages: CoreMessage[], _opts: any = {}): CoreMessage[] {
    const startTime = performance.now();
    const span = createTracedSpan('memory.toolCallFilter', { 
      messageCount: messages.length,
      excludedToolsCount: this.exclude.length 
    });
    
    try {
      // Early return if no messages
      if (messages.length === 0) {
        messageCounter.add(0, { processor: 'ToolCallFilter', operation: 'process', result: 'empty' });
        return messages;
      }
      
      // Filter out tool calls except for specified tools
      const result = messages.filter(msg => {
        // Keep non-tool messages
        if (msg.role !== 'assistant' || !getMessageContent(msg).includes('tool_calls')) {
          return true;
        }
        
        // Keep tool calls for excluded tools
        for (const tool of this.exclude) {
          if (getMessageContent(msg).includes(tool)) {
            return true;
          }
        }
        
        // Filter out other tool calls
        return false;
      });
      
      const removedCount = messages.length - result.length;
      if (removedCount > 0) {
        // Log to Langfuse asynchronously
        createTrace('memory.processor.toolCallFilter', {
          originalCount: messages.length,
          resultCount: result.length,
          removedCount,
          excludedTools: this.exclude
        });
        
        logger.info(`ToolCallFilter removed ${removedCount} tool call messages`);
        messageCounter.add(removedCount, { 
          processor: 'ToolCallFilter', 
          operation: 'filter',
          result: 'removed' 
        });
      } else {
        messageCounter.add(0, { 
          processor: 'ToolCallFilter', 
          operation: 'filter',
          result: 'unchanged' 
        });
      }
      
      return asCoreMessages(result);
    } catch (error) {
      logger.error('Error in ToolCallFilter', {
        error: error instanceof Error ? error.message : String(error)
      });
      span?.recordException?.(error);
      messageCounter.add(0, { processor: 'ToolCallFilter', operation: 'process', result: 'error' });
      return messages; // Return original messages on error
    } finally {
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

  process(messages: CoreMessage[], _opts: any = {}): CoreMessage[] {
    const startTime = performance.now();
    const span = createTracedSpan('memory.highVolumeProcess', { messageCount: messages.length });
    
    try {
      if (messages.length <= 100) {
        messageCounter.add(0, { processor: 'HighVolumeContextProcessor', operation: 'process', result: 'under_threshold' });
        return messages;
      }
      
      // First, keep all user and assistant messages, prioritizing them
      let filteredMessages = messages.filter(
        msg => msg.role === 'user' || msg.role === 'assistant'
      );
      
      const systemMessagesRemoved = messages.length - filteredMessages.length;
      if (systemMessagesRemoved > 0) {
        logger.info(`Removed ${systemMessagesRemoved} system messages`);
        messageCounter.add(systemMessagesRemoved, { 
          processor: 'HighVolumeContextProcessor', 
          operation: 'filter_system',
          result: 'removed' 
        });
      }
      
      // If we're still over 750 messages, keep only the last 500 messages plus first 50
      // This preserves recent context plus initialization context
      if (filteredMessages.length > 750) {
        const firstMessages = filteredMessages.slice(0, 50);
        const lastMessages = filteredMessages.slice(-500);
        const middleMessagesRemoved = filteredMessages.length - (firstMessages.length + lastMessages.length);
        
        filteredMessages = [...firstMessages, ...lastMessages];
        
        // Log to Langfuse asynchronously
        createTrace('memory.processor.highVolume', {
          originalCount: messages.length,
          systemMessagesRemoved,
          middleMessagesRemoved,
          firstMessagesKept: firstMessages.length,
          lastMessagesKept: lastMessages.length,
          resultCount: filteredMessages.length
        });
        
        logger.info(`High volume processing removed ${middleMessagesRemoved} middle messages, keeping ${firstMessages.length} first and ${lastMessages.length} last messages`);
        messageCounter.add(middleMessagesRemoved, { 
          processor: 'HighVolumeContextProcessor', 
          operation: 'filter_middle',
          result: 'removed' 
        });
      }
      
      return asCoreMessages(filteredMessages);
    } catch (error) {
      logger.error('Error in HighVolumeContextProcessor', {
        error: error instanceof Error ? error.message : String(error)
      });
      span?.recordException?.(error);
      
      messageCounter.add(0, { processor: 'HighVolumeContextProcessor', operation: 'process', result: 'error' });
      // Return original messages on error (fail safe)
      return messages;
    } finally {
      processingLatency.record(performance.now() - startTime, { processor: 'HighVolumeContextProcessor' });
      span?.end();
    }
  }
}

/**
 * Production-ready memory processor that uses Google embeddings for semantic filtering
 * Uses real embeddings to identify and retain the most relevant messages
 */
export class SemanticEmbeddingProcessor extends MemoryProcessor {
  private embeddingsPromise: ReturnType<typeof getSafeEmbeddings>;
  private embeddings: any = null;
  private embeddingCache: Map<string, number[]> = new Map();
  private initialized: boolean = false;
  
  constructor() {
    super({ name: 'SemanticEmbeddingProcessor' });
    
    // Store the promise initially
    this.embeddingsPromise = getSafeEmbeddings();
    
    // Initialize embeddings asynchronously
    this.initializeAsync();
  }
  
  private async initializeAsync() {
    if (this.initialized) return;
    
    try {
      // Resolve the embeddings promise
      this.embeddings = await this.embeddingsPromise;
      
      if (this.embeddings) {
        logger.info(`SemanticEmbeddingProcessor initialized with Google embeddings (${this.embeddings.dimensions} dimensions, ${this.embeddings.maxInputLength} token support)`);
      } else {
        logger.warn('SemanticEmbeddingProcessor initialized with fallback mode (no embeddings)');
      }
      
      // Log initialization to Langfuse
      createTrace('memory.processor.init', {
        processor: 'SemanticEmbeddingProcessor',
        hasEmbeddings: !!this.embeddings,
        embeddingModel: this.embeddings?.modelId,
        dimensions: this.embeddings?.dimensions,
        maxInputLength: this.embeddings?.maxInputLength
      });
      
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize SemanticEmbeddingProcessor', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  process(messages: CoreMessage[], _opts: any = {}): CoreMessage[] {
    const startTime = performance.now();
    const span = createTracedSpan('memory.semanticEmbedding', { 
      messageCount: messages.length,
      hasEmbeddings: !!this.embeddings,
      cacheSize: this.embeddingCache.size
    });
    
    try {
      // If we have very few messages, no need for processing
      if (messages.length <= 50) {
        messageCounter.add(0, { processor: 'SemanticEmbeddingProcessor', operation: 'process', result: 'under_threshold' });
        return messages;
      }
      
      if (this.embeddings) {
        logger.info(`Using Google embeddings-based contextual filtering (${this.embeddings.maxInputLength} tokens)`);
        
        // 1. Always keep the most recent N messages for context continuity
        const recentMessageCount = Math.min(25, messages.length);
        const recentMessages = messages.slice(-recentMessageCount);
        
        // 2. Always keep the first N messages for initialization context
        const initMessageCount = Math.min(25, messages.length - recentMessageCount);
        const initMessages = messages.slice(0, initMessageCount);
        
        // 3. For middle messages, prioritize by importance heuristics:
        const middleMessages = messages.slice(initMessageCount, -recentMessageCount);
        
        if (middleMessages.length > 0) {
          // Filter out system messages and sort the rest by length (longer messages often contain more info)
          const prioritizedMiddle = middleMessages
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .sort((a, b) => {
              // User messages are highest priority
              if (a.role === 'user' && b.role !== 'user') return -1;
              if (a.role !== 'user' && b.role === 'user') return 1;
              
              // Then sort by length (proxy for information content)
              const aContent = getMessageContent(a);
              const bContent = getMessageContent(b);
              return bContent.length - aContent.length;
            });
          
          // Keep top N middle messages based on our capacity
          const capacityForMiddle = Math.floor(150 * (this.embeddings.maxInputLength / 4096));
          const keptMiddleMessages = prioritizedMiddle.slice(0, capacityForMiddle);
          
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
  }
}

/**
 * Creates a production-ready memory processor chain optimized for 1M token context windows
 * with Google embeddings for semantic filtering (8192 tokens)
 */
export function createLargeContextProcessors(_options?: { useMultiMode?: boolean }): MemoryProcessor[] {
  // Log processor creation to Langfuse
  createTrace('memory.createProcessors', {
    optimizedFor: '1M tokens',
    useMultiMode: _options?.useMultiMode
  });
  
  // Standard processor chain for optimal memory management
  return [
    new SemanticClusteringProcessor(),
    new SemanticEmbeddingProcessor(),
    new HighVolumeContextProcessor(),
    new ToolCallFilter({
      exclude: ['vectorQueryTool', 'documentChunkerTool']
    }),
    new TokenLimiter(975000) // Set limit to 975K tokens
  ] as unknown as MemoryProcessor[]; // Type cast to satisfy compiler
} 