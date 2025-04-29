/**
 * Database configuration for memory persistence using a custom LibSQL adapter.
 *
 * This module sets up the custom LibSQL adapter for Mastra memory persistence,
 * allowing agent conversations and context to be stored reliably.
 */

import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import type { MastraStorage, MastraVector } from '@mastra/core';
import { configureLangSmithTracing } from '../services/langsmith';
import { createLogger } from '@mastra/core/logger';
import { ThreadManager, threadManager } from '../utils/thread-manager';
import type { ThreadInfo } from '../types';
import { langfuse } from '../services/langfuse'; // Langfuse integration
import { createTracedSpan, createCounter, createHistogram } from '../services/tracing';
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

// Create LibSQL storage and vector instances
const logger = createLogger({ name: 'database', level: 'info' });

// enable LangSmith tracing for database layer
const langsmithClient = configureLangSmithTracing();
if (langsmithClient) {
  logger.info('LangSmith tracing enabled for database operations');
}

// Initialize Langfuse for database observability
if (langfuse) {
  logger.info("Langfuse tracing enabled for Mastra database");
}


export const storage = new LibSQLStore({
  url: process.env.DATABASE_URL || 'file:.mastra/mastra.db',
  authToken: process.env.DATABASE_KEY,
});
// Patch: add a no-op init if missing
if (typeof (storage as any).init !== 'function') {
  (storage as any).init = async () => { };
}

const vector = new LibSQLVector({
  connectionUrl: process.env.DATABASE_URL || 'file:.mastra/mastra.db',
  authToken: process.env.DATABASE_KEY,
});

// Function to create a configured Memory instance
export function createMemory(options: Partial<MemoryConfig> = defaultMemoryConfig): Memory {
  // Trace memory creation
  langfuse.createTrace('memory.create', {
    metadata: {
      options,
      ...('usage_details' in options ? { usage_details: (options as any).usage_details } : {}),
      ...('cost_details' in options ? { cost_details: (options as any).cost_details } : {})
    }
  });
  return new Memory({
    storage: storage as unknown as MastraStorage,
    vector: vector as unknown as MastraVector,
    options,
  });
}

// Export shared memory instance
export const sharedMemory = createMemory();

// Ensure threadManager initializes only after sharedMemory is ready
export const initThreadManager = (async () => {
  // Wait for memory to initialize (if it has async init)
  if (typeof (sharedMemory as any).init === 'function') {
    await (sharedMemory as any).init();
  } else {
    // Fallback: wait a tick to ensure sharedMemory is constructed
    await new Promise(res => setTimeout(res, 10));
  }
  // Create a default thread to ensure threadManager works with memory
  let defaultThread;
  try {
    defaultThread = await threadManager.getOrCreateThread('mastra_memory');
  } catch (err) {
    // Log but do not block init
    if (typeof logger !== 'undefined') {
      logger.error('Failed to create default thread in threadManager:', err);
    }
  }
  // Trace thread manager initialization, including thread metrics if available
  langfuse.createTrace('initThreadManager', {
    metadata: {
      ...(defaultThread?.usage_details ? { usage_details: defaultThread.usage_details } : {}),
      ...(defaultThread?.cost_details ? { cost_details: defaultThread.cost_details } : {})
    }
  });
  return threadManager;
})();

// Re-export Memory type for convenience
export type { Memory };

export type { ThreadManager }
