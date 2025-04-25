/**
 * Extremely simplified memory diagnostics utility
 */

import { randomUUID } from "crypto";
import { sharedMemory } from "../database";
import { createAISpan, recordMetrics } from "../services/signoz";

/**
 * Runs basic diagnostics on the shared Memory component.
 *
 * @returns A promise resolving to an object indicating success or failure,
 *          along with diagnostic information or an error message.
 */
export async function runMemoryDiagnostics() {
  const span = createAISpan("memory.diagnostics");
  const startTime = Date.now();
  try {
    // Generate test IDs
    const testId = randomUUID();
    const threadId = `test-thread-${testId}`;
    const testContent = `Test message created at ${new Date().toISOString()}`;

    // Create a test thread
    await sharedMemory.createThread({
      resourceId: testId,
      threadId,
      title: `Test Thread`,
      metadata: { test: true },
    });

    // Add a test message
    await sharedMemory.addMessage({
      threadId,
      resourceId: testId,
      role: "user",
      content: testContent,
      type: "text",
    });

    // Retrieve the thread
    const thread = await sharedMemory.getThreadById({ threadId });

    recordMetrics(span, { status: "success", latencyMs: Date.now() - startTime });
    return {
      success: true,
      threadInfo: thread,
      testId,
    };
  } catch (error) {
    recordMetrics(span, { status: "error", latencyMs: Date.now() - startTime, errorMessage: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    span.end();
  }
}
