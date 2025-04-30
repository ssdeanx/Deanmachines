/**
 * Thread Manager for consistent memory persistence
 *
 * This utility helps manage thread IDs consistently across conversations,
 * ensuring that memory context is properly maintained and retrieved.
 */

import { randomUUID } from "crypto";
import { createLogger } from "@mastra/core/logger";
import signoz, { createAISpan } from "../services/signoz.js";
import { configureLangSmithTracing, createLangSmithRun, trackFeedback } from "../services/langsmith.js";
import { langfuse } from "../services/langfuse.js";
import type { ThreadInfo, CreateThreadOptions } from "../types.js";
import { ThreadManagerError, CreateThreadOptionsSchema } from "../types.js";
import { sharedMemory } from "../database/index.js";

const logger = createLogger({ name: "thread-manager", level: "info" });

const langsmithClient = configureLangSmithTracing();
if (langsmithClient) {
  logger.info("LangSmith tracing enabled for Mastra agents");
}
/**
 * Manages conversation threads to ensure consistent memory access
 */
export class ThreadManager {
  private threads: Map<string, ThreadInfo> = new Map();
  private resourceThreads: Map<string, Set<string>> = new Map();
  private threadReadStatus: Map<string, Date> = new Map(); // threadId -> lastReadAt
  private creatingThreads: Set<string> = new Set(); // Recursion guard
  // --- Thread creation context flag to prevent tracing/logging recursion ---
  private isCreatingThread: boolean = false;

  /**
   * Creates a new conversation thread
   *
   * @param options - Thread creation options
   * @returns Thread information including the ID
   * @throws ThreadManagerError if validation fails
   */
  public async createThread(options: CreateThreadOptions): Promise<ThreadInfo> {
    // Strictly prevent tracing/logging recursion during thread creation
    if (this.isCreatingThread) {
      // No tracing, logging, or span creation allowed in recursive context
      return this._createThreadCore(options);
    }
    this.isCreatingThread = true;
    try {
      return await this._createThreadCore(options);
    } finally {
      this.isCreatingThread = false;
    }
  }

  // Core thread creation logic, optionally with tracing/logging
  private async _createThreadCore(options: CreateThreadOptions): Promise<ThreadInfo> {
    const parseResult = CreateThreadOptionsSchema.safeParse(options);
    if (!parseResult.success) {
      if (!this.isCreatingThread) logger.error(JSON.stringify({ event: "thread.create.validation_failed", errors: parseResult.error.errors, options }));
      throw new ThreadManagerError("Invalid thread creation options");
    }
    const span = this.isCreatingThread ? null : createAISpan("thread.create", { resourceId: options.resourceId });
    if (!this.isCreatingThread) logger.info("Creating thread", { resourceId: options.resourceId, metadata: options.metadata });
    const startTime = Date.now();
    let runId: string | undefined;
    try {
      const threadId = options.threadId || randomUUID();
      const threadInfo: ThreadInfo = {
        id: threadId,
        resourceId: options.resourceId,
        createdAt: new Date(),
        metadata: options.metadata,
      };
      this.threads.set(threadId, threadInfo);
      if (!this.resourceThreads.has(options.resourceId)) {
        this.resourceThreads.set(options.resourceId, new Set());
      }
      this.resourceThreads.get(options.resourceId)?.add(threadId);
      if (!this.isCreatingThread) logger.info(JSON.stringify({ event: "thread.created", threadId, resourceId: options.resourceId }));
      if (span) {
        span.setStatus({ code: 1 });
        if (!this.isCreatingThread) signoz.recordMetrics(span, { latencyMs: Date.now() - startTime, status: "success" });
      }
      if (!this.isCreatingThread) {
        runId = await createLangSmithRun("thread.create", [options.resourceId]);
        await trackFeedback(runId, { score: 1, comment: "Thread created successfully" });
        // Record thread creation trace in Langfuse
        const trace = langfuse.createTrace("thread.create", {
          metadata: {
            threadId,
            resourceId: options.resourceId,
            ...options.metadata,
            ...(options.usage_details && { usage_details: options.usage_details }),
            ...(options.cost_details && { cost_details: options.cost_details })
          },
        });
        if (trace) {
          trace.event({
            name: "thread-created",
            input: threadId,
            metadata: { resourceId: options.resourceId, ...options.metadata },
          });
        }
      }
      return threadInfo;
    } catch (error) {
      if (span) {
        signoz.recordMetrics(span, { latencyMs: Date.now() - startTime, status: "error", errorMessage: String(error) });
        span.setStatus({ code: 2, message: String(error) });
      }
      if (!this.isCreatingThread && runId) await trackFeedback(runId, { score: 0, comment: "Thread creation failed", value: error });
      if (!this.isCreatingThread) logger.error(JSON.stringify({ event: "thread.create.failed", error: String(error) }));
      throw new ThreadManagerError(String(error));
    } finally {
      if (span) span.end();
    }
  }

  /**
   * Retrieves a thread by its ID
   *
   * @param threadId - The ID of the thread to retrieve
   * @returns Thread information or undefined if not found
   */
  public getThread(threadId: string): ThreadInfo | undefined {
    const thread = this.threads.get(threadId);
    const metadata = thread?.metadata || {};
    const trace = langfuse.createTrace("thread.get", {
      metadata: {
        threadId,
        ...metadata,
        ...(thread?.usage_details && { usage_details: thread.usage_details }),
        ...(thread?.cost_details && { cost_details: thread.cost_details })
      },
    });
    if (trace) {
      trace.event({
        name: "thread-get",
        input: threadId,
        metadata: {},

      });
    }
    const span = createAISpan("thread.get", { threadId });
    try {
      const thread = this.threads.get(threadId);
      logger.info(JSON.stringify({ event: "thread.get", threadId, found: !!thread }));
      span.setStatus({ code: 1 });
      return thread;
    } catch (error) {
      logger.error(JSON.stringify({ event: "thread.get.failed", error: String(error) }));
      span.setStatus({ code: 2, message: String(error) });
      return undefined;
    } finally {
      span.end();
    }
  }

  /**
   * Gets all threads associated with a resource ID
   *
   * @param resourceId - The resource ID to look up threads for
   * @returns Array of thread information objects
   */
  public getThreadsByResource(resourceId: string): ThreadInfo[] {
    const threads = this.getThreadsByResource(resourceId);
    const firstThread = threads[0];
    const metadata = firstThread?.metadata || {};
    const trace = langfuse.createTrace("thread.getByResource", {
      metadata: {
        resourceId,
        ...metadata,
        ...(firstThread?.usage_details && { usage_details: firstThread.usage_details }),
        ...(firstThread?.cost_details && { cost_details: firstThread.cost_details })
      },
    });
    if (trace) {
      trace.event({
        name: "thread-getByResource",
        input: resourceId,
        metadata: {},

      });
    }
    const span = createAISpan("thread.getByResource", { resourceId });
    try {
      const threadIds = this.resourceThreads.get(resourceId) || new Set();
      const threads = Array.from(threadIds)
        .map((id) => this.threads.get(id))
        .filter((thread): thread is ThreadInfo => thread !== undefined);
      logger.info(JSON.stringify({ event: "thread.getByResource", resourceId, count: threads.length }));
      span.setStatus({ code: 1 });
      return threads;
    } catch (error) {
      logger.error(JSON.stringify({ event: "thread.getByResource.failed", error: String(error) }));
      span.setStatus({ code: 2, message: String(error) });
      return [];
    } finally {
      span.end();
    }
  }

  /**
   * Gets the most recent thread for a resource
   *
   * @param resourceId - The resource ID to find the most recent thread for
   * @returns Most recent thread information or undefined if none exists
   */
  public getMostRecentThread(resourceId: string): ThreadInfo | undefined {
    const thread = this.getMostRecentThread(resourceId);
    const metadata = thread?.metadata || {};
    const trace = langfuse.createTrace("thread.getMostRecent", {
      metadata: {
        resourceId,
        ...metadata,
        ...(thread?.usage_details && { usage_details: thread.usage_details }),
        ...(thread?.cost_details && { cost_details: thread.cost_details })
      },
    });
    if (trace) {
      trace.event({
        name: "thread-getMostRecent",
        input: resourceId,
        metadata: {},

      });
    }
    const span = createAISpan("thread.getMostRecent", { resourceId });
    try {
      const threads = this.getThreadsByResource(resourceId);
      if (threads.length === 0) {
        logger.info(JSON.stringify({ event: "thread.getMostRecent", resourceId, found: false }));
        span.setStatus({ code: 1 });
        return undefined;
      }
      const mostRecent = threads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      logger.info(JSON.stringify({ event: "thread.getMostRecent", resourceId, threadId: mostRecent.id }));
      span.setStatus({ code: 1 });
      return mostRecent;
    } catch (error) {
      logger.error(JSON.stringify({ event: "thread.getMostRecent.failed", error: String(error) }));
      span.setStatus({ code: 2, message: String(error) });
      return undefined;
    } finally {
      span.end();
    }
  }

  /**
   * Creates or retrieves a thread for a resource ID
   *
   * @param resourceId - The resource ID to get or create a thread for
   * @param metadata - Optional metadata for the thread if created
   * @returns Thread information with a consistent ID
   * @throws ThreadManagerError if creation fails
   */
  public async getOrCreateThread(
    resourceId: string,
    metadata?: Record<string, unknown>
  ): Promise<ThreadInfo> {
    if (this.creatingThreads.has(resourceId)) {
      throw new ThreadManagerError(`Recursive getOrCreateThread detected for resourceId: ${resourceId}`);
    }
    this.creatingThreads.add(resourceId);
    try {
      // Strictly prevent tracing/logging recursion during thread creation
      // All tracing/logging inside createThread is guarded by isCreatingThread
      // Check if thread exists for resourceId
      for (const [id, thread] of this.threads.entries()) {
        if (thread.resourceId === resourceId) {
          return thread;
        }
      }
      // If not found, create a new thread
      return await this.createThread({ resourceId, metadata });
    } finally {
      this.creatingThreads.delete(resourceId);
    }
  }

  /**
   * Mark a thread as read (updates lastReadAt)
   * @param threadId - The ID of the thread to mark as read
  public getUnreadThreadsByResource(resourceId: string): ThreadInfo[] {
    const threads = this.getThreadsByResource(resourceId);
    const firstThread = threads[0];
    const metadata = firstThread?.metadata || {};
    const trace = langfuse.createTrace("thread.getUnreadByResource", {
      metadata: {
        resourceId,
        ...metadata,
        ...(firstThread?.usage_details && { usage_details: firstThread.usage_details }),
        ...(firstThread?.cost_details && { cost_details: firstThread.cost_details })
      },
    });
    if (trace) {
      trace.event({
        name: "thread-getUnreadByResource",
        input: resourceId,
        metadata: {},

      });
    }
    const span = createAISpan("thread.getUnreadByResource", { resourceId });
    try {
      const threads = this.getThreadsByResource(resourceId);
      const unread = threads.filter(thread => {
        const lastRead = this.threadReadStatus.get(thread.id);
        return !lastRead || thread.createdAt > lastRead;
      });
      logger.info(JSON.stringify({ event: "thread.getUnreadByResource", resourceId, count: unread.length }));
      span.setStatus({ code: 1 });
      return unread;
    } catch (error) {
      logger.error(JSON.stringify({ event: "thread.getUnreadByResource.failed", error: String(error) }));
      span.setStatus({ code: 2, message: String(error) });
      return [];
    } finally {
      span.end();
    }
  }

  /**
   * Retrieve persisted memory for a thread.
   */
  public async getThreadMemory(threadId: string): Promise<any> {
    const thread = this.threads.get(threadId);
    const metadata = thread?.metadata || {};
    const trace = langfuse.createTrace("memory.get", {
      metadata: {
        threadId,
        ...metadata,
        ...(thread?.usage_details && { usage_details: thread.usage_details }),
        ...(thread?.cost_details && { cost_details: thread.cost_details })
      },
    });
    if (trace) {
      trace.event({
        name: "memory-get",
        input: threadId,
        metadata: {},

      });
    }
    const span = createAISpan("memory.get", { threadId });
    try {
      if (!sharedMemory) throw new ThreadManagerError("Memory not initialized");
      const mem = await sharedMemory.getMemory(threadId);
      span.setStatus({ code: 1 });
      return mem;
    } catch (error) {
      span.setStatus({ code: 2, message: String(error) });
      throw new ThreadManagerError(String(error));
    } finally {
      span.end();
    }
  }

  /**
   * Save memory for a thread.
   */
  public async saveThreadMemory(threadId: string, data: any): Promise<void> {
    const thread = this.threads.get(threadId);
    const metadata = thread?.metadata || {};
    const trace = langfuse.createTrace("memory.save", {
      metadata: {
        threadId,
        ...metadata,
        ...(thread?.usage_details && { usage_details: thread.usage_details }),
        ...(thread?.cost_details && { cost_details: thread.cost_details })
      },
    });
    if (trace) {
      trace.event({
        name: "memory-save",
        input: threadId,
        metadata: { data },

      });
    }
    const span = createAISpan("memory.save", { threadId });
    try {
      if (!sharedMemory) throw new ThreadManagerError("Memory not initialized");
      await sharedMemory.saveMemory(threadId, data);
      span.setStatus({ code: 1 });
    } catch (error) {
      span.setStatus({ code: 2, message: String(error) });
      throw new ThreadManagerError(String(error));
    } finally {
      span.end();
    }
  }
}

// Export a singleton instance for app-wide use
export const threadManager = new ThreadManager();
