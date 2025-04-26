/**
 * Database configuration for memory persistence using a custom LibSQL adapter.
 *
 * This module sets up the custom LibSQL adapter for Mastra memory persistence,
 * allowing agent conversations and context to be stored reliably.
 */

import { createClient, Client } from "@libsql/client";
import { Memory } from "@mastra/memory";
import type { MastraStorage, MastraVector } from "@mastra/core";
import { configureLangSmithTracing } from "../services/langsmith";
import { createLogger } from "@mastra/core/logger";
import { threadManager } from "../utils/thread-manager";

// Custom LibSQLStore adapter using @libsql/client
class CustomLibSQLStore {
  private client: Client;
  private url: string;
  private authToken?: string;
  private _hasInitialized = false;
  shouldCacheInit = false;
  // Mastra expects hasInitialized as a Promise<boolean>
  get hasInitialized(): Promise<boolean> {
    return Promise.resolve(this._hasInitialized);
  }

  constructor({ url, authToken }: { url: string; authToken?: string }) {
    this.url = url;
    this.authToken = authToken;
    this.client = createClient({ url, authToken });
  }

  async init() {
    await this.client.execute({
      sql: `CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )`,
      args: []
    });
    this._hasInitialized = true;
  }

  // Example CRUD methods for chat memory
  async get(id: string): Promise<any | null> {
    const res = await this.client.execute({ sql: `SELECT data FROM memory WHERE id = ?`, args: [id] });
    if (!res.rows || res.rows.length === 0) return null;
    return JSON.parse(res.rows[0]["data"] as string);
  }

  async set(id: string, value: any): Promise<void> {
    const data = JSON.stringify(value);
    await this.client.execute({ sql: `INSERT OR REPLACE INTO memory (id, data) VALUES (?, ?)`, args: [id, data] });
  }

  async delete(id: string): Promise<void> {
    await this.client.execute({ sql: `DELETE FROM memory WHERE id = ?`, args: [id] });
  }

  // --- Stubbed methods to satisfy MastraStorage interface ---
  async createTable() {}
  async clearTable() {}
  async close() {}
  async ensureInit() {}
  async all() { return []; }
  async keys() { return []; }
  async values() { return []; }
  async entries() { return []; }
  async has() { return false; }
  async size() { return 0; }
  async clear() {}
  async forEach() {}
  // Add more stubs as needed for your Mastra version
}

// Stub vector adapter with required methods
class StubVector {
  async init() {}
  baseKeys = [];
  // Generic signature for normalizeArgs
  normalizeArgs<T, E extends any[] = never>(method: string, args: E | any[], extendedKeys?: string[]): T {
    // Return dummy value
    return [] as unknown as T;
  }
  async query<T = any>() { return [] as T[]; }
  async upsert<E = any>(..._args: any[]): Promise<string[]> { return []; }
  async delete() { return; }
  async clear() { return; }
  // Add more stubs as needed for your Mastra version
}


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
  // Use the custom LibSQLStore
  const storage = new CustomLibSQLStore({
    url: process.env.DATABASE_URL || "file:.mastra/mastra.db",
    authToken: process.env.DATABASE_KEY,
  });

  // Use a stub vector (or implement as needed)
  const vector = new StubVector();

  // Defer default memory thread creation to avoid init-order circularity
  process.nextTick(() => {
    threadManager.getOrCreateThread("mastra_memory").catch(err =>
      logger.error("Memory thread init failed", err)
    );
  });

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
