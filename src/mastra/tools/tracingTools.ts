import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import signoz from "../services/signoz";
import { initOpenTelemetry } from "../services/tracing";

// Tool: Start a new AI operation tracing span (SigNoz)
export const startAISpanTool = createTool({
  id: "start-ai-span",
  description: "Start a new AI operation tracing span (SigNoz)",
  inputSchema: z.object({
    name: z.string().describe("Name of the operation"),
    attributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  }),
  outputSchema: z.object({
    spanId: z.string().optional(),
    traceId: z.string().optional(),
  }),
  async execute({ context }) {
    const { name, attributes } = context;
    const span = signoz.createSpan(name, attributes);
    const spanContext = span.spanContext();
    return {
      spanId: spanContext.spanId,
      traceId: spanContext.traceId,
    };
  },
});

// Tool: Record LLM metrics on a span
export const recordLlmMetricsTool = createTool({
  id: "record-llm-metrics",
  description: "Record LLM token usage and latency on a span (SigNoz)",
  inputSchema: z.object({
    spanId: z.string().optional().describe("Span ID to record metrics on (not used, for compatibility)"),
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    totalTokens: z.number().optional(),
    latencyMs: z.number().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  async execute() {
    // Use OpenTelemetry API to get the current active span
    const { trace, context } = await import("@opentelemetry/api");
    const span = trace.getSpan(context.active());
    if (!span) return { success: false };
    signoz.recordLlmMetrics(span, {
      promptTokens: arguments[0]?.context?.promptTokens,
      completionTokens: arguments[0]?.context?.completionTokens,
      totalTokens: arguments[0]?.context?.totalTokens,
    }, arguments[0]?.context?.latencyMs);
    return { success: true };
  },
});

// Tool: Shutdown SigNoz tracing
export const shutdownTracingTool = createTool({
  id: "shutdown-tracing",
  description: "Gracefully shut down SigNoz tracing",
  inputSchema: z.object({}),
  outputSchema: z.object({ success: z.boolean() }),
  async execute() {
    await signoz.shutdown();
    return { success: true };
  },
});

// Tool: Initialize OpenTelemetry (calls tracing service)
export const initOpenTelemetryTool = createTool({
  id: "init-opentelemetry",
  description: "Initialize OpenTelemetry tracing (calls tracing service)",
  inputSchema: z.object({
    serviceName: z.string().optional(),
    environment: z.string().optional(),
    endpoint: z.string().optional(),
    enabled: z.boolean().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  async execute({ context }) {
    initOpenTelemetry({
      serviceName: context.serviceName || process.env.OTEL_SERVICE_NAME || "deanmachines-ai",
      environment: context.environment || process.env.NODE_ENV || "development",
      endpoint: context.endpoint,
      enabled: context.enabled !== false,
    });
    return { success: true };
  },
});

// Export all tracing tools as an array for registration
export const tracingTools = [
  startAISpanTool,
  recordLlmMetricsTool,
  shutdownTracingTool,
  initOpenTelemetryTool,
];
