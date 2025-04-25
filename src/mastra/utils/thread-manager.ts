/**
 * Thread Manager for consistent memory persistence
 *
 * This utility helps manage thread IDs consistently across conversations,
 * ensuring that memory context is properly maintained and retrieved.
 */

import { randomUUID } from "crypto";
import { createLogger } from "@mastra/core/logger";
import signoz, { createAISpan } from "../services/signoz";
import { createLangSmithRun, trackFeedback } from "../services/langsmith";
import type { ThreadInfo, CreateThreadOptions } from "../types";
import { ThreadManagerError, CreateThreadOptionsSchema } from "../types";
import { sharedMemory } from "../database/index";

const logger = createLogger({ name: "thread-manager", level: "info" });

/**
 * Manages conversation threads to ensure consistent memory access
 */
export class ThreadManager {
  private threads: Map<string, ThreadInfo> = new Map();
  private resourceThreads: Map<string, Set<string>> = new Map();
  private threadReadStatus: Map<string, Date> = new Map(); // threadId -> lastReadAt

  /**
   * Creates a new conversation thread
   *
   * @param options - Thread creation options
   * @returns Thread information including the ID
   * @throws ThreadManagerError if validation fails
   */
  public async createThread(options: CreateThreadOptions): Promise<ThreadInfo> {
    // Validate input
    const parseResult = CreateThreadOptionsSchema.safeParse(options);
    if (!parseResult.success) {
      logger.error(JSON.stringify({ event: "thread.create.validation_failed", errors: parseResult.error.errors, options }));
      throw new ThreadManagerError("Invalid thread creation options");
    }
    const span = createAISpan("thread.create", { resourceId: options.resourceId });
    logger.info("Creating thread", { resourceId: options.resourceId, metadata: options.metadata });
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
      logger.info(JSON.stringify({ event: "thread.created", threadId, resourceId: options.resourceId }));
      span.setStatus({ code: 1 });
      signoz.recordMetrics(span, { latencyMs: Date.now() - startTime, status: "success" });
      runId = await createLangSmithRun("thread.create", [options.resourceId]);
      await trackFeedback(runId, { score: 1, comment: "Thread created successfully" });
      return threadInfo;
    } catch (error) {
      signoz.recordMetrics(span, { latencyMs: Date.now() - startTime, status: "error", errorMessage: String(error) });
      if (runId) await trackFeedback(runId, { score: 0, comment: "Thread creation failed", value: error });
      logger.error(JSON.stringify({ event: "thread.create.failed", error: String(error) }));
      span.setStatus({ code: 2, message: String(error) });
      throw new ThreadManagerError(String(error));
    } finally {
      span.end();
    }
  }

  /**
   * Retrieves a thread by its ID
   *
   * @param threadId - The ID of the thread to retrieve
   * @returns Thread information or undefined if not found
   */
  public getThread(threadId: string): ThreadInfo | undefined {
    // TODO: Add access control check here if threads are user-specific
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
    // TODO: Add access control check here if threads are user-specific
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
    const span = createAISpan("thread.getOrCreate", { resourceId });
    try {
      const existingThread = this.getMostRecentThread(resourceId);
      if (existingThread) {
        logger.info(JSON.stringify({ event: "thread.getOrCreate", resourceId, threadId: existingThread.id, found: true }));
        span.setStatus({ code: 1 });
        return existingThread;
      }
      logger.info(JSON.stringify({ event: "thread.getOrCreate", resourceId, found: false }));
      const newThread = await this.createThread({ resourceId, metadata });
      span.setStatus({ code: 1 });
      return newThread;
    } catch (error) {
      logger.error(JSON.stringify({ event: "thread.getOrCreate.failed", error: String(error) }));
      span.setStatus({ code: 2, message: String(error) });
      throw new ThreadManagerError(String(error));
    } finally {
      span.end();
    }
  }

  /**
   * Mark a thread as read (updates lastReadAt)
   * @param threadId - The ID of the thread to mark as read
   * @param date - Optional date (defaults to now)
   */
  public markThreadAsRead(threadId: string, date: Date = new Date()): void {
    const span = createAISpan("thread.markAsRead", { threadId });
    try {
      this.threadReadStatus.set(threadId, date);
      const thread = this.threads.get(threadId);
      if (thread) {
        thread.lastReadAt = date;
        logger.info(JSON.stringify({ event: "thread.markAsRead", threadId, date }));
      }
      span.setStatus({ code: 1 });
    } catch (error) {
      logger.error(JSON.stringify({ event: "thread.markAsRead.failed", error: String(error) }));
      span.setStatus({ code: 2, message: String(error) });
    } finally {
      span.end();
    }
  }

  /**
   * Get unread threads for a resource (threads never read or with new activity)
   * @param resourceId - The resource ID to check
   * @returns Array of unread ThreadInfo
   */
  public getUnreadThreadsByResource(resourceId: string): ThreadInfo[] {
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
