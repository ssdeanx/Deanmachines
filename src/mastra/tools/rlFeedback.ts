/**
 * Reinforcement Learning Feedback Tools for Mastra AI.
 *
 * This module provides tools for collecting, analyzing, and applying
 * feedback for reinforcement learning to improve agent performance over time.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { LibSQLStore } from "@mastra/core/storage/libsql";
import { createLangSmithRun, trackFeedback } from "../services/langsmith";
import { Memory } from "@mastra/memory";
import sigNoz from "../services/signoz";
import { threadManager } from "../utils/thread-manager";
import { createVertexModel } from "../agents/config/model.utils";
import { generateText } from "ai";

// Helper function to get environment variable with fallback
const getEnvVar = (name: string, fallback: string = ''): string => {
  const value = process.env[name];
  if (!value && !fallback) {
    console.warn(`Environment variable ${name} not set`);
  }
  return value || fallback;
};

// Create a storage instance
const getStorage = (): LibSQLStore => {
  try {
    // For development, use in-memory database if env variables aren't set
    const dbUrl = getEnvVar('TURSO_DATABASE_URL', 'file:rl-feedback.db');
    const authToken = getEnvVar('TURSO_DATABASE_KEY', '');

    return new LibSQLStore({
      config: {
        url: dbUrl,
        authToken
      }
    });
  } catch (error) {
    console.error("Error initializing LibSQLStore:", error);
    // Fallback to in-memory database
    return new LibSQLStore({
      config: {
        url: ':memory:'
      }
    });
  }
};

// Initialize a Memory instance for storing RL feedback data
const memoryInstance = new Memory({
  storage: getStorage(),
});

/**
 * Types of feedback that can be collected for RL
 */
export enum FeedbackType {
  /** User explicitly rates agent response */
  EXPLICIT = "explicit",
  /** System infers quality from user behavior */
  IMPLICIT = "implicit",
  /** Model evaluates its own performance */
  SELF_CRITIQUE = "self_critique",
}

/**
 * Feedback metrics that can be tracked
 */
export interface FeedbackMetrics {
  /** Overall quality score (1-10) */
  quality: number;
  /** Accuracy of information (1-10) */
  accuracy?: number;
  /** Relevance to user request (1-10) */
  relevance?: number;
  /** Helpfulness of the response (1-10) */
  helpfulness?: number;
  /** Time taken to respond (ms) */
  latencyMs?: number;
  /** Free-form comment about the response */
  comment?: string;
}

/**
 * Tool for collecting feedback on agent responses
 */
export const collectFeedbackTool = createTool({
  id: "collect-feedback",
  description: "Collects user or system feedback for reinforcement learning",
  inputSchema: z.object({
    agentId: z.string().describe("ID of the agent being evaluated"),
    interactionId: z.string().describe("Unique identifier for the interaction"),
    feedback: z.object({
      type: z
        .enum([
          FeedbackType.EXPLICIT,
          FeedbackType.IMPLICIT,
          FeedbackType.SELF_CRITIQUE,
        ])
        .describe("Source of the feedback"),
      metrics: z.object({
        quality: z
          .number()
          .min(1)
          .max(10)
          .describe("Overall quality score (1-10)"),
        accuracy: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .describe("Accuracy of information (1-10)"),
        relevance: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .describe("Relevance to user request (1-10)"),
        helpfulness: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .describe("Helpfulness of the response (1-10)"),
        latencyMs: z.number().optional().describe("Time taken to respond (ms)"),
        comment: z.string().optional().describe("Comment about the response"),
      }),
      inputContext: z
        .string()
        .optional()
        .describe("User input that triggered the response"),
      outputResponse: z
        .string()
        .optional()
        .describe("Agent's response being evaluated"),
    }),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    feedbackId: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const span = sigNoz.createSpan("rlFeedback.collectFeedback", { tool: "collect-feedback" });
    const startTime = performance.now();
    const runId = await createLangSmithRun("collect-feedback", [
      "rl",
      "feedback",
    ]);

    try {
      // Generate a unique ID for this feedback
      const feedbackId = `feedback_${context.agentId}_${Date.now()}`;

      // Instead of using the LibSQLStore directly, use Memory API to store feedback
      // First, create or get an existing thread for the agent's RL feedback
      const threadId = `rl_feedback_${context.agentId}`;

      try {
        await memoryInstance.getThreadById({ threadId });
      } catch (e) {
        // Thread doesn't exist yet, create it
        await memoryInstance.createThread({
          resourceId: context.agentId,
          threadId,
          title: `RL Feedback for Agent ${context.agentId}`,
          metadata: {
            type: "rl_feedback_thread"
          }
        });
      }

      // Format the feedback data as a system message
      const feedbackData = {
        interactionId: context.interactionId,
        feedbackType: context.feedback.type,
        metrics: context.feedback.metrics,
        context: context.feedback.inputContext || "",
        response: context.feedback.outputResponse || "",
        timestamp: new Date().toISOString(),
      };

      // Add a message to the thread with the feedback content
      // Include metadata in the content as the addMessage method doesn't support metadata directly
      const messageContent = JSON.stringify({
        ...feedbackData,
        feedbackId,
        type: "rl_feedback",
        metrics: context.feedback.metrics
      });

      await memoryInstance.addMessage({
        threadId,
        resourceId: context.agentId, // Add the resourceId
        role: "assistant", // Changed from "system" to "assistant" as Mastra only supports "user" or "assistant"
        content: messageContent,
        type: "text"
      });

      // Mark thread as read after feedback is collected
      threadManager.markThreadAsRead(threadId);

      // Track in LangSmith as well if available
      await trackFeedback(runId, {
        score: context.feedback.metrics.quality / 10, // Normalize to 0-1
        comment: context.feedback.metrics.comment,
        key: `${context.feedback.type}_feedback`,
        value: {
          metrics: context.feedback.metrics,
          agentId: context.agentId,
        },
      });

      sigNoz.recordMetrics(span, { latencyMs: performance.now() - startTime, status: "success" });
      span.end();
      return {
        success: true,
        feedbackId,
      };
    } catch (error) {
      console.error("Error collecting feedback:", error);

      // Track failure in LangSmith
      await trackFeedback(runId, {
        score: 0,
        comment: error instanceof Error ? error.message : "Unknown error",
        key: "feedback_collection_failure",
      });

      sigNoz.recordMetrics(span, { latencyMs: performance.now() - startTime, status: "error", errorMessage: error instanceof Error ? error.message : String(error) });
      span.end();
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error collecting feedback",
      };
    }
  },
});

/**
 * Tool for analyzing collected feedback to derive insights
 */
export const analyzeFeedbackTool = createTool({
  id: "analyze-feedback",
  description:
    "Analyzes collected feedback to derive insights for agent improvement",
  inputSchema: z.object({
    agentId: z.string().describe("ID of the agent to analyze feedback for"),
    startDate: z
      .string()
      .optional()
      .describe("Start date for feedback analysis (ISO format)"),
    endDate: z
      .string()
      .optional()
      .describe("End date for feedback analysis (ISO format)"),
    metricName: z.string().optional().describe("Specific metric to analyze"),
    limit: z
      .number()
      .optional()
      .default(100)
      .describe("Maximum number of feedback items to analyze"),
  }),
  outputSchema: z.object({
    insights: z.array(
      z.object({
        metric: z.string(),
        averageScore: z.number(),
        trend: z.string(),
        improvementSuggestions: z.array(z.string()),
      })
    ),
    sampleSize: z.number(),
    timeRange: z.object({
      start: z.string(),
      end: z.string(),
    }),
  }),
  execute: async ({ context }) => {
    const span = sigNoz.createSpan("rlFeedback.analyzeFeedback", { tool: "analyze-feedback" });
    const startTime = performance.now();
    const runId = await createLangSmithRun("analyze-feedback", [
      "rl",
      "analysis",
    ]);

    try {
      // Query parameters for feedback retrieval
      const startDate = context.startDate
        ? new Date(context.startDate)
        : new Date(0);
      const endDate = context.endDate ? new Date(context.endDate) : new Date();

      // Retrieve feedback for analysis
      // Note: In a real implementation, you would query by date range and agent ID
      // This is a simplified version that would need to be adapted to your specific
      // LibSQLStore implementation details

      // For demonstration, we'll generate sample feedback data
      const sampleFeedback = generateSampleFeedback(
        context.agentId,
        startDate,
        endDate,
        context.limit || 100
      );

      // Use LLM to generate insights from feedback data
      const model = createVertexModel("models/gemini-2.0-pro");

      // Aggregate metrics
      const metrics = aggregateMetrics(sampleFeedback);

      // Generate insights using LLM
      const result = await generateText({
        model,
        messages: [
          { role: "user", content: `Analyze the following performance metrics for an AI agent and provide insights:\n\n${JSON.stringify(metrics, null, 2)}\n\nFor each metric, provide:\n1. The current average score\n2. The trend (improving, declining, stable)\n3. 2-3 specific suggestions for improvement\n\nReturn ONLY a valid JSON array with this structure:\n[\n  {\n    \"metric\": \"quality\",\n    \"averageScore\": 7.5,\n    \"trend\": \"improving\",\n    \"improvementSuggestions\": [\"suggestion 1\", \"suggestion 2\"]\n  },\n  ...\n]` }
        ]
      });
      const insightsText = result.text;

      let insights: Array<{
        metric: string;
        averageScore: number;
        trend: string;
        improvementSuggestions: string[];
      }> = [];

      try {
        // Extract JSON from the response
        const jsonMatch = insightsText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
        }
      } catch (jsonError) {
        console.error("Error parsing insights result:", jsonError);
        insights = metrics.map((m) => ({
          metric: m.name,
          averageScore: m.average,
          trend: determineTrend(m.values),
          improvementSuggestions: [
            "Improve prompt clarity and specificity",
            "Enhance error handling and edge cases",
          ],
        }));
      }

      // Track success in LangSmith
      await trackFeedback(runId, {
        score: 1,
        comment: `Successfully analyzed ${sampleFeedback.length} feedback entries`,
        key: "feedback_analysis_success",
      });

      sigNoz.recordMetrics(span, { latencyMs: performance.now() - startTime, status: "success" });
      span.end();
      return {
        insights,
        sampleSize: sampleFeedback.length,
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
    } catch (error) {
      console.error("Error analyzing feedback:", error);

      // Track failure in LangSmith
      await trackFeedback(runId, {
        score: 0,
        comment: error instanceof Error ? error.message : "Unknown error",
        key: "feedback_analysis_failure",
      });

      sigNoz.recordMetrics(span, { latencyMs: performance.now() - startTime, status: "error", errorMessage: error instanceof Error ? error.message : String(error) });
      span.end();
      return {
        insights: [],
        sampleSize: 0,
        timeRange: {
          start: context.startDate || new Date(0).toISOString(),
          end: context.endDate || new Date().toISOString(),
        },
      };
    }
  },
});

/**
 * Tool for applying RL insights to improve agent performance
 */
export const applyRLInsightsTool = createTool({
  id: "apply-rl-insights",
  description:
    "Applies reinforcement learning insights to improve agent performance",
  inputSchema: z.object({
    agentId: z.string().describe("ID of the agent to improve"),
    insights: z
      .array(
        z.object({
          metric: z.string(),
          averageScore: z.number(),
          trend: z.string(),
          improvementSuggestions: z.array(z.string()),
        })
      )
      .describe("Insights derived from feedback analysis"),
    currentInstructions: z.string().describe("Current agent instructions"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    improvedInstructions: z.string(),
    changes: z.array(
      z.object({
        metric: z.string(),
        change: z.string(),
      })
    ),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const span = sigNoz.createSpan("rlFeedback.applyRLInsights", { tool: "apply-rl-insights" });
    const startTime = performance.now();
    const runId = await createLangSmithRun("apply-rl-insights", [
      "rl",
      "improvement",
    ]);

    try {
      // Use LLM to generate improved instructions based on insights
      const model = createVertexModel("models/gemini-2.0-pro");

      const result = await generateText({
        model,
        messages: [
          { role: "user", content: `You are an AI instruction optimizer. Your task is to improve these agent instructions:\n\nCURRENT INSTRUCTIONS:\n${context.currentInstructions}\n\nBased on these performance insights:\n${JSON.stringify(context.insights, null, 2)}\n\nProvide improved instructions that address the issues identified in the insights.\nThe new instructions should maintain the original intent and style while enhancing areas\nthat need improvement according to feedback.\n\nIMPROVED INSTRUCTIONS:` }
        ]
      });
      const improvedInstructions = result.text;

      // Generate summary of changes
      const changeResult = await generateText({
        model,
        messages: [
          { role: "user", content: `Summarize the key changes made to these instructions:\n\nORIGINAL:\n${context.currentInstructions}\n\nIMPROVED:\n${improvedInstructions}\n\nFor each of these metrics that was improved, describe the specific change made:\n${context.insights.map((i) => i.metric).join(", ")}\n\nReturn ONLY a valid JSON array with this structure:\n[\n  {\n    \"metric\": \"quality\",\n    \"change\": \"Added more specific guidance on response formatting\"\n  },\n  ...\n]` }
        ]
      });
      const changesText = changeResult.text;

      let changes: Array<{
        metric: string;
        change: string;
      }> = [];

      try {
        // Extract JSON from the response
        const jsonMatch = changesText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          changes = JSON.parse(jsonMatch[0]);
        }
      } catch (jsonError) {
        console.error("Error parsing changes result:", jsonError);
        changes = context.insights.map((insight) => ({
          metric: insight.metric,
          change: "Improved instructions based on feedback",
        }));
      }

      // Track success in LangSmith
      await trackFeedback(runId, {
        score: 1,
        comment: `Successfully applied insights to improve agent instructions`,
        key: "rl_application_success",
        value: { changeCount: changes.length },
      });

      sigNoz.recordMetrics(span, { latencyMs: performance.now() - startTime, status: "success" });
      span.end();
      return {
        success: true,
        improvedInstructions,
        changes,
      };
    } catch (error) {
      console.error("Error applying RL insights:", error);

      // Track failure in LangSmith
      await trackFeedback(runId, {
        score: 0,
        comment: error instanceof Error ? error.message : "Unknown error",
        key: "rl_application_failure",
      });

      sigNoz.recordMetrics(span, { latencyMs: performance.now() - startTime, status: "error", errorMessage: error instanceof Error ? error.message : String(error) });
      span.end();
      return {
        success: false,
        improvedInstructions: context.currentInstructions,
        changes: [],
        error:
          error instanceof Error
            ? error.message
            : "Unknown error applying insights",
      };
    }
  },
});

/**
 * Helper function to generate sample feedback data for testing
 *
 * @param agentId - ID of the agent
 * @param startDate - Start date for generated data
 * @param endDate - End date for generated data
 * @param count - Number of feedback entries to generate
 * @returns Array of simulated feedback entries
 */
function generateSampleFeedback(
  agentId: string,
  startDate: Date,
  endDate: Date,
  count: number
): Array<{
  agentId: string;
  interactionId: string;
  feedbackType: FeedbackType;
  metrics: FeedbackMetrics;
  timestamp: string;
}> {
  const feedback: Array<{
    agentId: string;
    interactionId: string;
    feedbackType: FeedbackType;
    metrics: FeedbackMetrics;
    timestamp: string;
  }> = [];
  const timeRange = endDate.getTime() - startDate.getTime();

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startDate.getTime() + Math.random() * timeRange);

    feedback.push({
      agentId,
      interactionId: `interaction_${i}_${Date.now()}`,
      feedbackType:
        Math.random() > 0.7
          ? FeedbackType.EXPLICIT
          : Math.random() > 0.5
            ? FeedbackType.IMPLICIT
            : FeedbackType.SELF_CRITIQUE,
      metrics: {
        quality: Math.floor(Math.random() * 10) + 1,
        accuracy: Math.floor(Math.random() * 10) + 1,
        relevance: Math.floor(Math.random() * 10) + 1,
        helpfulness: Math.floor(Math.random() * 10) + 1,
        latencyMs: Math.floor(Math.random() * 2000) + 100,
      },
      timestamp: timestamp.toISOString(),
    });
  }

  // Sort by timestamp
  feedback.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return feedback;
}

/**
 * Aggregate metrics from feedback entries
 *
 * @param feedback - Array of feedback entries
 * @returns Aggregated metrics
 */
function aggregateMetrics(
  feedback: Array<{
    metrics: FeedbackMetrics;
    timestamp: string;
  }>
): Array<{
  name: string;
  average: number;
  values: Array<{
    value: number;
    timestamp: string;
  }>;
}> {
  // Initialize result structure with known metrics
  const metrics: Record<
    string,
    {
      total: number;
      count: number;
      values: Array<{
        value: number;
        timestamp: string;
      }>;
    }
  > = {
    quality: { total: 0, count: 0, values: [] },
    accuracy: { total: 0, count: 0, values: [] },
    relevance: { total: 0, count: 0, values: [] },
    helpfulness: { total: 0, count: 0, values: [] },
  };

  // Aggregate data
  for (const entry of feedback) {
    for (const [metricName, metricValue] of Object.entries(entry.metrics)) {
      // Skip non-numeric metrics
      if (typeof metricValue !== "number") continue;

      // Initialize metric if not exists
      if (!metrics[metricName]) {
        metrics[metricName] = { total: 0, count: 0, values: [] };
      }

      metrics[metricName].total += metricValue;
      metrics[metricName].count++;
      metrics[metricName].values.push({
        value: metricValue,
        timestamp: entry.timestamp,
      });
    }
  }

  // Calculate averages and format result
  return Object.entries(metrics).map(([name, data]) => ({
    name,
    average: data.count > 0 ? data.total / data.count : 0,
    values: data.values,
  }));
}

/**
 * Determine trend from a series of values
 *
 * @param values - Array of values with timestamps
 * @returns Trend description ("improving", "declining", "stable")
 */
function determineTrend(
  values: Array<{
    value: number;
    timestamp: string;
  }>
): string {
  // Need at least 2 values to determine trend
  if (values.length < 2) return "stable";

  // Sort by timestamp
  const sorted = [...values].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Split into two halves to compare
  const halfIndex = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, halfIndex);
  const secondHalf = sorted.slice(halfIndex);

  // Calculate averages
  const firstHalfAvg =
    firstHalf.reduce((sum, v) => sum + v.value, 0) / firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((sum, v) => sum + v.value, 0) / secondHalf.length;

  // Determine trend
  const difference = secondHalfAvg - firstHalfAvg;
  if (difference > 0.5) return "improving";
  if (difference < -0.5) return "declining";
  return "stable";
}

/**
 * Helper to get unread RL feedback threads for an agent
 * @param agentId - The agent/resource ID
 * @returns Array of unread ThreadInfo
 */
export function getUnreadFeedbackThreads(agentId: string) {
  return threadManager.getUnreadThreadsByResource(agentId);
}

