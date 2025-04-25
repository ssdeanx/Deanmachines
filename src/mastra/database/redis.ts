import { UpstashStore } from "@mastra/upstash";
import { Memory } from "@mastra/memory";
import { Redis } from "@upstash/redis";
import { Index as UpstashVectorIndex } from "@upstash/vector";
import { logWithTraceContext } from "../services/tracing";
import signoz from "../services/signoz";

// --- Tracing helpers ---
function traced<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const span = signoz.createSpan(operation);
  return fn()
    .then((result) => {
      span.setStatus({ code: 1 });
      span.end();
      return result;
    })
    .catch((error) => {
      span.setStatus({ code: 2, message: error?.message || String(error) });
      logWithTraceContext(console, "error", `${operation} failed`, { error });
      span.end();
      throw error;
    });
}

// --- Upstash Redis Client (raw, for health checks/advanced ops) ---
let redisClient: Redis | undefined;
try {
  redisClient = new Redis({
    url: `https://${process.env.UPSTASH_REDIS_REST_URL}`,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  logWithTraceContext(console, "info", "Upstash Redis client initialized", { url: process.env.UPSTASH_REDIS_REST_URL });
} catch (error) {
  logWithTraceContext(console, "error", "Failed to initialize Upstash Redis client", { error });
}

// --- UpstashStore for Mastra Memory ---
let redisStore: UpstashStore | undefined;
let redisMemory: Memory | undefined;
try {
  redisStore = new UpstashStore({
    url: `https://${process.env.UPSTASH_REDIS_REST_URL}`,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  redisMemory = new Memory({
    storage: redisStore,
    options: {
      lastMessages: 100,
    },
  });
  logWithTraceContext(console, "info", "Upstash Redis memory initialized", { url: process.env.UPSTASH_REDIS_REST_URL });
} catch (error) {
  logWithTraceContext(console, "error", "Failed to initialize Upstash Redis memory", { error });
}

// --- Upstash VectorDB (full feature set) ---
let upstashVector: UpstashVectorIndex<any> | undefined;
try {
  upstashVector = new UpstashVectorIndex({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
  });
  logWithTraceContext(console, "info", "Upstash VectorDB initialized", { url: process.env.UPSTASH_VECTOR_REST_URL, index: process.env.UPSTASH_INDEX });
} catch (error) {
  logWithTraceContext(console, "error", "Failed to initialize Upstash VectorDB", { error });
}

// --- VectorDB Feature Wrappers (traced) ---
export async function vectorUpsert({ id, vector, metadata }: { id: string, vector: number[], metadata?: Record<string, any> }) {
  if (!upstashVector) throw new Error("Upstash VectorDB not initialized");
  return traced("vector.upsert", () => upstashVector!.upsert({ id, vector, metadata }));
}

export async function vectorQuery({ query, topK = 5, filter, includeVectors = false, includeMetadata = true }: {
  query: number[];
  topK?: number;
  filter?: string;
  includeVectors?: boolean;
  includeMetadata?: boolean;
}) {
  if (!upstashVector) throw new Error("Upstash VectorDB not initialized");
  return traced("vector.query", () => upstashVector!.query({
    vector: query,
    topK,
    filter,
    includeVectors,
    includeMetadata,
  }));
}

export async function vectorFetch(ids: string[] | number[]) {
  if (!upstashVector) throw new Error("Upstash VectorDB not initialized");
  return traced("vector.fetch", () => upstashVector!.fetch(ids));
}

export async function vectorRange(cursor: number | string = 0, limit: number = 10) {
  if (!upstashVector) throw new Error("Upstash VectorDB not initialized");
  return traced("vector.range", () => upstashVector!.range({ cursor, limit }));
}

// --- Health Check for Redis (traced) ---
export async function checkRedisHealth() {
  if (!redisClient) return false;
  return traced("redis.health", async () => {
    await redisClient!.ping();
    return true;
  }).catch(() => false);
}

export { redisClient, redisStore, redisMemory, upstashVector };
