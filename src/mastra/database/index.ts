/**
 * Database configuration for memory persistence using LibSQL.
 *
 * This module sets up the LibSQL adapter for Mastra memory persistence,
 * allowing agent conversations and context to be stored reliably.
 */

import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import type { MastraStorage, MastraVector } from "@mastra/core";
import { configureLangSmithTracing } from "../services/langsmith";
import { createLogger } from "@mastra/core/logger";
import { threadManager } from "../utils/thread-manager";

const logger = createLogger({ name: "database", level: "info" });

// enable LangSmith tracing for database layer
const langsmithClient = configureLangSmithTracing();
if (langsmithClient) {
  logger.info("LangSmith tracing enabled for database operations");
}

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

/**
 * Creates a new Memory instance with LibSQL storage and vector capabilities.
 * @param options Memory configuration options
 * @returns Configured Memory instance
 */
export function createMemory(
  options: Partial<MemoryConfig> = defaultMemoryConfig
): Memory {
  // Initialize LibSQL storage
  const storage = new LibSQLStore({
    url: process.env.DATABASE_URL || "file:.mastra/mastra.db",
    authToken: process.env.DATABASE_KEY,
  });

  // Initialize LibSQL vector store for semantic search
  const vector = new LibSQLVector({
    connectionUrl: process.env.DATABASE_URL || "file:.mastra/mastra.db",
    authToken: process.env.DATABASE_KEY,
  });

  // Ensure default memory thread exists via thread manager
  threadManager.getOrCreateThread("mastra_memory").catch(err => logger.error("Memory thread init failed", err));

  return new Memory({
    storage: storage as unknown as MastraStorage,
    vector: vector as unknown as MastraVector,
    options,
  });
}

// Export shared memory instance
export const sharedMemory = createMemory();

// Re-export Memory type for convenience
export type { Memory };

/**
 * Thread manager for conversation/session management and tracing.
 */
export { threadManager } from "../utils/thread-manager";
