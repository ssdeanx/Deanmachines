/**
 * Database configuration for memory persistence using PostgreSQL.
 *
 * This module sets up the PostgreSQL adapter for Mastra memory persistence,
 * allowing agent conversations and context to be stored reliably.
 */

import { PostgresStore, PgVector } from "@mastra/pg";
import { Memory } from "@mastra/memory";
import type { MastraStorage, MastraVector } from "@mastra/core";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "Memory", level: "debug" });

logger.info("Initializing Memory with PostgreSQL storage");

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
  lastMessages: 200,
  semanticRecall: {
    topK: 8,
    messageRange: {
      before: 4,
      after: 2,
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
 * Creates a new Memory instance with PostgreSQL storage and vector capabilities.
 * @param options Memory configuration options
 * @returns Configured Memory instance
 */
export function createMemory(
  options: Partial<MemoryConfig> = defaultMemoryConfig
): Memory {
  const connectionString = process.env.DATABASE_URL!;
  // Initialize PostgreSQL storage
  const storage = new PostgresStore({
    connectionString,
  });

  // Initialize PostgreSQL vector store for semantic search
  const vector = new PgVector(connectionString);

  return new Memory({
    storage: storage as MastraStorage,
    vector: vector as MastraVector,
    options,
  });
}

// Export shared memory instance
export const sharedMemory = createMemory();

// Re-export Memory type for convenience
export type { Memory };