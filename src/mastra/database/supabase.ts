/**
 * Database configuration for memory persistence using PostgreSQL.
 *
 * This module sets up the PostgreSQL adapter for Mastra memory persistence,
 * allowing agent conversations and context to be stored reliably.
 */
import { createLogger } from '@mastra/core/logger';
import { Memory } from '@mastra/memory';
import { PgVector, PostgresStore } from '@mastra/pg';
import fs from 'fs';
import path from 'path';

import type { MastraStorage, MastraVector } from '@mastra/core';


const caFilePath = process.env.PGSSL_CA_PATH || './prod-ca-2021.crt';
const fullPath = path.resolve(caFilePath); // Make sure the path is absolute
let caFileContent: string;
try {
  caFileContent = fs.readFileSync(fullPath).toString(); // Read the file into a string
} catch (err) {
  console.error(`FATAL ERROR: Could not read SSL CA file at ${fullPath}`, err);
  process.exit(1); // Exit if the required cert can't be read
}
const logger = createLogger({ name: 'database', level: 'info' });

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
      before: 6,
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

// Initialize PostgreSQL storage (singleton)
export const storage = new PostgresStore({
  connectionString: process.env.POSTGRES_URL || 'file:.mastra/mastra.db',
  ssl: {
    ca: process.env.SSL,
    rejectUnauthorized: false
  }
});
// Initialize PostgreSQL vector store for semantic search (singleton)
const vector = new PgVector({
  connectionString: 'file:C:/Users/dm/Documents/Deanmachines/prod-ca-2021.crt',
});


// Export shared memory instance (singleton)
export const sharedMemory = new Memory({
  storage: storage as MastraStorage,
  vector: vector as MastraVector,
  options: defaultMemoryConfig,
});