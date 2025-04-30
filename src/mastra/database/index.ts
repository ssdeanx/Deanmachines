/**
 * Database configuration for memory persistence using a custom LibSQL adapter.
 *
 * This module sets up the custom LibSQL adapter for Mastra memory persistence,
 * allowing agent conversations and context to be stored reliably.
 */

import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import type { MastraStorage, MastraVector, MemoryProcessor } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { ThreadManager, threadManager } from '../utils/thread-manager';
import type { ThreadInfo } from '../types';
import { createTracedSpan, createCounter, createHistogram } from '../services/tracing';
import { 
  createLargeContextProcessors, 
  HighVolumeContextProcessor, 
  TokenLimiter, 
  ToolCallFilter, 
  SemanticEmbeddingProcessor 
} from './memory-processors';
import { SemanticClusteringProcessor } from './memoryHelper';

const logger = createLogger({ name: 'database', level: 'info' });
const memoryOpsCounter = createCounter('memory_ops_total');
const queryLatency = createHistogram('db_query_latency_ms');

// Define the memory configuration type
export interface MemoryConfig {
  lastMessages: number;
  semanticRecall: {
    topK: number;
    messageRange: {
      before: number;
      after: number;
    };
  };
  workingMemory: {
    enabled: boolean;
    type: "text-stream";
  };
  threads: {
    generateTitle: boolean;
  };
}

// Default memory configuration that works well for most agents
const defaultMemoryConfig: MemoryConfig = {
  lastMessages: 250,
  semanticRecall: {
    topK: 10,
    messageRange: {
      before: 5,
      after: 1,
    },
  },
  workingMemory: {
    enabled: true,
    type: "text-stream",
  },
  threads: {
    generateTitle: true,
  },
};

// Enable lazy loading for Langfuse
async function getLangfuse() {
  try {
    const { langfuse } = await import("../services/langfuse");
    return langfuse;
  } catch (error) {
    logger.warn("Failed to load Langfuse", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

// Pool connections to avoid connection limits with Turso
// Turso has a connection limit (default is 30)
const connectionPool = {
  maxSize: 20, // Keep max pool size under Turso's limit
  minSize: 5,   // Keep a minimum set of connections alive
  maxLifetimeMs: 30 * 60 * 1000, // 30 minutes max connection lifetime
  idleTimeoutMs: 10 * 60 * 1000, // 10 minutes idle timeout
  acquireTimeoutMs: 10000, // 10 seconds timeout to acquire connection
};

// Create LibSQL storage and vector instances with optimized configuration
export const storage = new LibSQLStore({
  url: process.env.DATABASE_URL || 'file:.mastra/mastra.db',
  authToken: process.env.DATABASE_KEY,
  // Note: When upgrading @mastra/libsql, check if encryption is supported
  // encryptionKey: process.env.DATABASE_ENCRYPTION_KEY
});

// Patch: add a no-op init if missing
if (typeof (storage as any).init !== 'function') {
  (storage as any).init = async () => { };
}

// Create vector storage with matching configuration
const vector = new LibSQLVector({
  connectionUrl: process.env.DATABASE_URL || 'file:.mastra/mastra.db',
  authToken: process.env.DATABASE_KEY,
  // Note: When upgrading @mastra/libsql, check if encryption is supported
  // encryptionKey: process.env.DATABASE_ENCRYPTION_KEY
});

// Function to create a configured Memory instance with telemetry
export async function createMemory(options: Partial<MemoryConfig> = defaultMemoryConfig): Promise<Memory> {
  const span = createTracedSpan('memory.create', { options });
  const startTime = performance.now();
  
  try {
    // Lazy load Langfuse
    const langfuse = await getLangfuse();
    langfuse?.createTrace?.('memory.create', {
      metadata: {
        options,
        ...('usage_details' in options ? { usage_details: (options as any).usage_details } : {}),
        ...('cost_details' in options ? { cost_details: (options as any).cost_details } : {})
      }
    });
    
    // Check if high token limits are requested (default to true for maximum performance)
    const useHighTokenLimits = (options as any)?.highTokenLimits !== false;
    // Create memory instance with optimized processors for high token limits
    const memory = new Memory({
      storage: new LibSQLStore({
        url: process.env.DATABASE_URL || 'file:.mastra/mastra.db',
        authToken: process.env.DATABASE_KEY,
      }),
      options: { semanticRecall: true },
      vector: new LibSQLVector({
        connectionUrl: process.env.DATABASE_URL || 'file:.mastra/mastra.db',
        authToken: process.env.DATABASE_KEY,
      }),
      // Add our custom processor chain for high token limits
      ...(useHighTokenLimits ? { processors: createLargeContextProcessors() } : {})
    });
    
    logger.info('Memory created', { 
      highTokenLimits: useHighTokenLimits,
      processors: useHighTokenLimits ? 'Using 1M token optimized processors' : 'Using default processors'
    });

    
    // Record telemetry
    memoryOpsCounter.add(1, { operation: 'create' });
    queryLatency.record(performance.now() - startTime, { operation: 'create_memory' });
    
    span?.end();
    return memory;
  } catch (error) {
    span?.recordException?.(error);
    span?.end();
    throw error;
  }
}

// Export shared memory instance with high token limit support
export const sharedMemory = new Memory({
  storage: storage as unknown as MastraStorage,
  vector: vector as unknown as MastraVector,
  options: defaultMemoryConfig,
  processors: createLargeContextProcessors() // Add 1M token support to shared memory
});

// Optimize database performance by adding indices when needed
export async function ensureDatabaseIndices(): Promise<void> {
  const span = createTracedSpan('database.ensureIndices');
  
  try {
    // These indices help with query performance for common operations
    const indexOperations = [
      "CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id)",
      "CREATE INDEX IF NOT EXISTS idx_threads_resource_id ON threads(resourceId)",
      "CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(createdAt)",
      "CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updatedAt)",
    ];
    
    for (const indexOp of indexOperations) {
      await (storage as any).exec(indexOp);
    }
    
    logger.info('Database indices created or verified');
    span?.end();
  } catch (error) {
    logger.warn('Failed to create database indices', {
      error: error instanceof Error ? error.message : String(error)
    });
    span?.recordException?.(error);
    span?.end();
  }
}

// Ensure threadManager initializes only after sharedMemory is ready
export const initThreadManager = (async () => {
  const span = createTracedSpan('threadManager.init');
  
  try {
    // Wait for memory to initialize (if it has async init)
    if (typeof (sharedMemory as any).init === 'function') {
      await (sharedMemory as any).init();
    } else {
      // Fallback: wait a tick to ensure sharedMemory is constructed
      await new Promise(res => setTimeout(res, 10));
    }
    
    // Ensure indices exist
    await ensureDatabaseIndices();
    
    // Create a default thread to ensure threadManager works with memory
    let defaultThread: ThreadInfo | undefined;
    try {
      defaultThread = await threadManager.getOrCreateThread('mastra_memory');
    } catch (err) {
      // Log but do not block init
      logger.error('Failed to create default thread in threadManager:', err);
    }
    
    // Trace thread manager initialization
    const langfuse = await getLangfuse();
    langfuse?.createTrace?.('initThreadManager', {
      metadata: {
        ...(defaultThread?.usage_details ? { usage_details: defaultThread.usage_details } : {}),
        ...(defaultThread?.cost_details ? { cost_details: defaultThread.cost_details } : {})
      }
    });
    
    span?.end();
    return threadManager;
  } catch (error) {
    span?.recordException?.(error);
    span?.end();
    throw error;
  }
})();

// Utility function to close all connections when shutting down
export async function closeConnections(): Promise<void> {
  try {
    logger.info('Closing database connections...');
    
    // Close storage connections
    if (typeof (storage as any).close === 'function') {
      await (storage as any).close();
    }
    
    // Close vector connections
    if (typeof (vector as any).close === 'function') {
      await (vector as any).close();
    }
    
    logger.info('All database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Re-export Memory type for convenience
export type { Memory };
export type { ThreadManager };

// Export memory processors for use in other modules
export {
  HighVolumeContextProcessor,
  TokenLimiter,
  ToolCallFilter,
  SemanticEmbeddingProcessor,
  SemanticClusteringProcessor
};

// Enhanced memory configuration type with processor options
export interface EnhancedMemoryConfig extends MemoryConfig {
  highTokenLimits?: boolean;
  customProcessors?: MemoryProcessor[]; // Allow custom processor chain
}

/**
 * Creates a configured Memory instance with advanced processor options
 * 
 * @param options Memory configuration options
 * @returns Configured Memory instance
 */
export async function createAdvancedMemory(options: Partial<EnhancedMemoryConfig> = defaultMemoryConfig): Promise<Memory> {
  const span = createTracedSpan('memory.createAdvanced', { options });
  const startTime = performance.now();
  
  try {
    // Lazy load Langfuse
    const langfuse = await getLangfuse();
    langfuse?.createTrace?.('memory.createAdvanced', {
      metadata: {
        options,
        ...('usage_details' in options ? { usage_details: (options as any).usage_details } : {}),
        ...('cost_details' in options ? { cost_details: (options as any).cost_details } : {})
      }
    });
    
    // Determine processor configuration
    let processors;
    
    // Use custom processors if provided
    if (options.customProcessors) {
      processors = options.customProcessors;
      logger.info('Using custom processor chain', { 
        processorCount: processors.length 
      });
    }
    // Otherwise use our production-ready large context processors 
    else if (options.highTokenLimits !== false) {
      processors = createLargeContextProcessors();
      logger.info('Using 1M token optimized processors');
    }
    
    // Create memory instance with configured processors
    const memory = new Memory({
      storage: storage as unknown as MastraStorage,
      vector: vector as unknown as MastraVector,
      options,
      ...(processors ? { processors } : {})
    });
    
    // Record telemetry
    memoryOpsCounter.add(1, { operation: 'create_advanced' });
    queryLatency.record(performance.now() - startTime, { operation: 'create_advanced_memory' });
    
    span?.end();
    return memory;
  } catch (error) {
    span?.recordException?.(error);
    span?.end();
    throw error;
  }
}
