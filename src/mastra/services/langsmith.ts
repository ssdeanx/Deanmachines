/**
 * LangSmith integration service for Mastra AI.
 *
 * Provides tracing and evaluation capabilities for monitoring and
 * improving LLM interactions within Mastra agents.
 */

import { env } from "process";
import { v4 as uuidv4 } from "uuid";
import { Client as LangSmithClient } from "langsmith";
import { initializeDefaultTracing, getTracer, logWithTraceContext } from "./tracing";
import { SpanKind } from '@opentelemetry/api';
import { createLogger } from "@mastra/core/logger";
import type { LangSmithConfig } from "../services/types";

const logger = createLogger({ name: "Langsmith", level: "info" });

// Initialize OTEL tracing for LangSmith
// Destructure to consume all returned values
const { tracer: initialTracer, meterProvider, meter } = initializeDefaultTracing(
  "langsmith-service",
  "0.1.0"
);
// Prefer the OTEL tracer if present, else fall back
const tracer = initialTracer ?? getTracer();

// Log that metrics are enabled if provider exists
if (meterProvider) {
  logger.info("LangSmith metrics provider initialized");
}

// Create counters for runs and feedback
const runCounter = meter?.createCounter("langsmith_runs_total", {
  description: "Total number of LangSmith runs created",
});
const feedbackCounter = meter?.createCounter("langsmith_feedback_total", {
  description: "Total number of LangSmith feedback events recorded",
});

/** Global LangSmith client */
let langsmithClient: LangSmithClient | null = null;

export function configureLangSmithTracing(config?: LangSmithConfig): LangSmithClient | null {
  if (config?.enabled === false) return null;
  if (langsmithClient) return langsmithClient;

  try {
    const apiKey = config?.apiKey || env.LANGSMITH_API_KEY;
    const endpoint = config?.endpoint || env.LANGSMITH_ENDPOINT;
    if (!apiKey) {
      logWithTraceContext(logger as unknown as Record<string, (...args: any[]) => void>, "warn", "LangSmith API key not provided; tracing disabled");
      return null;
    }

    process.env.LANGSMITH_TRACING_V2 = env.LANGSMITH_TRACING_V2 || "true";
    process.env.LANGSMITH_ENDPOINT = endpoint || "https://api.smith.langchain.com";
    process.env.LANGSMITH_API_KEY = apiKey;
    process.env.LANGSMITH_PROJECT = config?.projectName || "DeanmachinesAI";

    langsmithClient = new LangSmithClient({ apiKey, apiUrl: endpoint });
    logWithTraceContext(logger as unknown as Record<string, (...args: any[]) => void>, "info", "LangSmith client configured");
    return langsmithClient;
  } catch (err) {
    logWithTraceContext(logger as unknown as Record<string, (...args: any[]) => void>, "error", "Failed to configure LangSmith tracing", { error: err });
    return null;
  }
}

export async function createLangSmithRun(
  name: string,
  tags?: string[]
): Promise<string> {
  // increment run counter
  runCounter?.add(1, { name });

  // GenAI semantic instrumentation
  const operation = 'tool';
  const model = name;
  const span = tracer?.startSpan(`${operation} ${model}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'gen_ai.system': 'langsmith',
      'gen_ai.operation.name': operation,
      'gen_ai.request.model': model,
    },
  });

  if (!langsmithClient) configureLangSmithTracing();

  const runId = uuidv4();
  if (!langsmithClient) return runId;

  try {
    await langsmithClient.createRun({
      id: runId,
      name,
      run_type: "tool",
      inputs: {},
      extra: { tags: tags || [], timestamp: new Date().toISOString() },
    });
    span?.end();
    return runId;
  } catch (error) {
    span?.recordException(error as Error);
    span?.end();
    logWithTraceContext(logger as unknown as Record<string, (...args: any[]) => void>, "error", "Error creating LangSmith run", {
      error,
    });
    return uuidv4();
  }
}

export async function trackFeedback(
  runId: string,
  feedback: {
    score?: number;
    comment?: string;
    key?: string;
    value?: any;
  }
): Promise<boolean> {
  // increment feedback counter
  feedbackCounter?.add(1, { runId, key: feedback.key ?? "accuracy" });

  // GenAI semantic instrumentation
  const operation = 'feedback';
  const model = feedback.key ?? 'feedback';
  const span = tracer?.startSpan(`${operation} ${model}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'gen_ai.system': 'langsmith',
      'gen_ai.operation.name': operation,
      'gen_ai.request.model': model,
      ...(typeof feedback.value === 'number' && { 'gen_ai.response.token_count': feedback.value }),
    },
  });

  if (!langsmithClient) configureLangSmithTracing();
  if (!langsmithClient) {
    logWithTraceContext(logger as unknown as Record<string, (...args: any[]) => void>, "warn", "LangSmith client not available, feedback not tracked");
    return false;
  }

  try {
    const feedbackKey = feedback.key || "accuracy";
    await langsmithClient.createFeedback(runId, feedbackKey, {
      score: feedback.score,
      comment: feedback.comment,
      value: feedback.value,
    });
    span?.end();
    return true;
  } catch (error) {
    span?.recordException(error as Error);
    span?.end();
    logWithTraceContext(logger as unknown as Record<string, (...args: any[]) => void>, "error", "Error tracking feedback", {
      runId,
      error,
    });
    return false;
  }
}

// Initialize on import
configureLangSmithTracing();
