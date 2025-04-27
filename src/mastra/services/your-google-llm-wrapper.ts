/**
 * Token Counting and Price Tracking Utility
 *
 * This module provides utility functions for logging token usage, model details,
 * and price tracking in Langfuse. It is designed to integrate seamlessly with
 * Google, OpenAI, Anthropic, and other LLM providers.
 */

import { langfuse } from "../services/langfuse";
import { getModelConfig } from "../agents/config/config.types";
import { createModelFromConfig } from "../agents/config/model.utils";
import { getProviderConfig } from "../agents/config/provider.utils";

/**
 * Logs token usage and price tracking for a model generation.
 *
 * You can extend this to include:
 * - latency (duration of the LLM call)
 * - totalTokens (prompt + completion)
 * - cost breakdown (per request, per session)
 * - tags (for experiment tracking)
 * - userId/sessionId (for user-level analytics)
 * - prompt template/version (for prompt engineering experiments)
 * - model parameters (temperature, top_p, etc.)
 * - evaluation scores (human or automated)
 * - observations (intermediate steps, warnings, etc.)
 *
 * See Langfuse docs for more: https://langfuse.com/docs
 */
/**
 * Logs token usage, cost, latency, score, and any custom metrics for a model generation to Langfuse.
 * Supports usage_details, cost_details, latencyMs, score, tags, and arbitrary custom fields.
 */
export async function logModelUsage(
  traceId: string,
  model: string,
  provider: string,
  prompt: string,
  output: string,
  promptTokens: number,
  completionTokens: number,
  promptPricePerToken: number,
  completionPricePerToken: number,
  options?: {
    latencyMs?: number;
    totalTokens?: number;
    tags?: string[];
    userId?: string;
    sessionId?: string;
    promptTemplate?: string;
    promptVersion?: string;
    temperature?: number;
    topP?: number;
    evalScore?: number;
    evalComment?: string;
    [key: string]: any;
  }
): Promise<void> {
  const price =
    promptTokens * promptPricePerToken +
    completionTokens * completionPricePerToken;
  const totalTokens = options?.totalTokens ?? (promptTokens + completionTokens);

  // Log the generation event to Langfuse
  langfuse.logGeneration("model-generation", {
    traceId,
    input: prompt,
    output,
    promptTokens,
    completionTokens,
    model,
    provider,
    usage_details: {
      input: promptTokens,
      output: completionTokens,
      total: totalTokens,
    },
    cost_details: {
      input: promptTokens * promptPricePerToken,
      output: completionTokens * completionPricePerToken,
      total: price,
    },
    latencyMs: options?.latencyMs,
    score: options?.evalScore,
    evalScore: options?.evalScore,
    evalComment: options?.evalComment,
    promptTemplate: options?.promptTemplate,
    promptVersion: options?.promptVersion,
    temperature: options?.temperature,
    topP: options?.topP,
    userId: options?.userId,
    sessionId: options?.sessionId,
    tags: options?.tags,
    metadata: {
      price,
      totalTokens,
      ...options,
    },
  });

  // Optionally, log evaluation score
  if (options?.evalScore !== undefined) {
    langfuse.createScore({
      name: "generation-quality",
      value: options.evalScore,
      traceId,
      model,
      provider,
      score: options?.score,
      latencyMs: options?.latencyMs,
      cost: options?.cost,
      evalComment: options?.evalComment,
      promptTemplate: options?.promptTemplate,
      promptVersion: options?.promptVersion,
      temperature: options?.temperature,
      topP: options?.topP,
      userId: options?.userId,
      sessionId: options?.sessionId,
      tags: ["eval", "generation", ...(options?.tags || [])],
      metadata: {
        ...options,
        model,
        provider,
      },
    });
  }

  // Optionally, log observations (intermediate steps, warnings, etc.)
  // NOTE: To log observations, you must use the returned trace/span/generation object and call .event().
  // This method no longer supports direct observation logging. See SDK docs for details.
}

/**
 * Example usage of the logModelUsage function with a Google model.
 *
 * @param prompt - The input prompt to send to the model.
 */
export async function runGoogleModel(prompt: string): Promise<void> {
  // Use the default Google model config and create the model instance
  const modelConfig = getModelConfig("GOOGLE_MAIN");
  const googleModel = createModelFromConfig(modelConfig);

  // Optionally, you can add more metadata for advanced observability:
  const start = Date.now();
  const response = await googleModel.generate({ prompt });
  const latencyMs = Date.now() - start;

  // Example prices per token (replace with actual pricing if needed)
  const promptPrice = 0.00001;
  const completionPrice = 0.00002;

  // Example: add all possible options for full observability
  await logModelUsage(
    "your-trace-id",
    response.model ?? modelConfig.modelId,
    "google",
    prompt,
    response.text,
    response.usage?.promptTokens ?? 0,
    response.usage?.completionTokens ?? 0,
    promptPrice,
    completionPrice,
    {
      latencyMs,
      totalTokens: (response.usage?.promptTokens ?? 0) + (response.usage?.completionTokens ?? 0),
      tags: ["vertex", "gemini", "experiment-1"],
      userId: "user-123",
      sessionId: "session-abc",
      promptTemplate: "default",
      promptVersion: "v1",
      temperature: modelConfig.temperature,
      topP: modelConfig.topP,
      evalScore: 0.95,
      evalComment: "High quality generation",
      observations: [
        { name: "preprocessing", value: "done", metadata: { step: 1 } },
        { name: "postprocessing", value: "done", metadata: { step: 2 } }
      ],
      // Add any other custom fields as needed
      experimentId: "exp-001",
      modelConfig,
      providerConfig: getProviderConfig("google"),
      // ...add more fields as needed for your use case
    }
  );
}