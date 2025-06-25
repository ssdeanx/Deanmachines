// Context Precision Metric
// Checks if output is precise with respect to context
import { LanguageModel } from '@mastra/core/llm';
import { ContextPrecisionMetric } from '@mastra/evals/llm';
import { z } from 'zod';

/**
 * @file Defines the Context Precision metric, which evaluates how relevant and precise
 * the retrieved context nodes are for generating the expected output.
 * It uses a judge-based system to analyze each context piece's contribution
 * and provides weighted scoring based on position.
 *
 * @see {@link https://mastra.ai/examples/evals/context-precision | Mastra ContextPrecisionMetric Example}
 * @see {@link https://mastra.ai/reference/evals/context-precision | Mastra ContextPrecisionMetric Documentation}
 *
 * @module contextPrecision
 */

/**
 * Schema for the options to configure the ContextPrecisionMetric.
 *
 * @property {number} [scale=1] - Maximum score value.
 * @property {string[]} context - Array of context pieces in their retrieval order.
 * @see {@link https://mastra.ai/reference/evals/context-precision#contextprecisionmetricoptions | ContextPrecisionMetricOptions}
 */
export const ContextPrecisionOptionsSchema = z.object({
  scale: z.number().optional().default(1),
  context: z.array(z.string()),
});

export type ContextPrecisionOptions = z.infer<typeof ContextPrecisionOptionsSchema>;

/**
 * Schema for the result of a metric measurement.
 *
 * @property {number} score - The calculated score for the metric.
 * @property {object} info - Additional information about the score.
 * @property {string} info.reason - A detailed explanation of the score.
 */
export const MetricResultSchema = z.object({
  score: z.number(),
  info: z.object({
    reason: z.string(),
  }),
});

export type MetricResult = z.infer<typeof MetricResultSchema>;

/**
 * Input schema for the ContextPrecisionMetric's evaluate method.
 */
export const ContextPrecisionInputSchema = z.object({
  query: z.string(),
  response: z.string(),
  context: z.array(z.string()),
});
export type ContextPrecisionInput = z.infer<typeof ContextPrecisionInputSchema>;

/**
 * Evaluates the context precision for a given query, response, and context.
 *
 * @param {LanguageModel} model - The language model used for evaluation.
 * @param {ContextPrecisionInput} input - The input data containing query, response, and context.
 * @param {Omit<ContextPrecisionOptions, 'context'>} [options] - Optional configuration for the metric.
 * @returns {Promise<MetricResult>} A promise that resolves to the metric result,
 *                                   including the precision score and reasoning.
 *
 * @example
 * 
 * import { google } from "@ai-sdk/google";
 * import { evaluateContextPrecision } from "./contextPrecision";
 * import { LanguageModel } from "@mastra/core/llm";
 *
 * const model = google("models/gemini-pro") as LanguageModel;
 *
 * const query = "What is photosynthesis?";
 * const response = "Photosynthesis is the process by which plants convert sunlight into energy.";
 * const context = [
 *   "Photosynthesis is a biological process used by plants to create energy from sunlight.",
 *   "Plants need water and nutrients from the soil to grow.",
 *   "The process of photosynthesis produces oxygen as a byproduct.",
 * ];
 *
 * async function main() {
 *   const result = await evaluateContextPrecision(model, { query, response, context });
 *   console.log("Context Precision Score:", result.score);
 *   console.log("Reason:", result.info.reason);
 * }
 *
 * main();
 * 
 */
export async function evaluateContextPrecision(
  model: LanguageModel,
  input: ContextPrecisionInput,
  options?: Omit<ContextPrecisionOptions, 'context'>
): Promise<MetricResult> {
  const validatedInput = ContextPrecisionInputSchema.parse(input);
  const { query, response, context } = validatedInput;

  const metric = new ContextPrecisionMetric(model, { ...options, context });
  const result = await metric.measure(query, response);
  return MetricResultSchema.parse(result);
}
