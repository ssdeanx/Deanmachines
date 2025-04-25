import { createAISpan, recordMetrics } from "../services/signoz";

/**
 * Wraps an async operation in an AI span with standardized metrics.
 * @param spanName - the name of the span to create
 * @param fn - the async function to execute within the span
 */
export async function observe<T>(spanName: string, fn: () => Promise<T>): Promise<T> {
  const span = createAISpan(spanName);
  try {
    const result = await fn();
    recordMetrics(span, { status: "success" });
    return result;
  } catch (error: any) {
    recordMetrics(span, { status: "error", errorMessage: String(error) });
    throw error;
  } finally {
    span.end();
  }
}
