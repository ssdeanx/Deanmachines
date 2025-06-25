// Contextual Recall Metric
// Checks if output recalls relevant context
import { LanguageModel } from '@mastra/core/llm';
import { ContextualRecallMetric } from '@mastra/evals/llm';
import { z } from 'zod';

/**
 * Schema for the options to configure the ContextualRecallMetric.
 */
export const ContextualRecallOptionsSchema = z.object({
  scale: z.number().optional().default(1),
  context: z.array(z.string()),
});

export type ContextualRecallOptions = z.infer<typeof ContextualRecallOptionsSchema>;

/**
 * Schema for the result of a metric measurement.
 */
export const MetricResultSchema = z.object({
  score: z.number(),
  info: z.object({
    reason: z.string(),
  }),
});

export type MetricResult = z.infer<typeof MetricResultSchema>;

/**
 * Input schema for the ContextualRecallMetric's evaluate method.
 */
export const ContextualRecallInputSchema = z.object({
  query: z.string(),
  response: z.string(),
  context: z.array(z.string()),
});
export type ContextualRecallInput = z.infer<typeof ContextualRecallInputSchema>;

/**
 * Evaluates the contextual recall for a given query, response, and context.
 *
 * @param {LanguageModel} model - The language model used for evaluation.
 * @param {ContextualRecallInput} input - The input data containing query, response, and context.
 * @param {Omit<ContextualRecallOptions, 'context'>} [options] - Optional configuration for the metric.
 * @returns {Promise<MetricResult>} A promise that resolves to the metric result,
 *                                   including the recall score and reasoning.
 *
 * @example
 * 
 * import { google } from "@ai-sdk/google";
 * import { evaluateContextualRecall } from "./contextualRecall";
 * import { LanguageModel } from "@mastra/core/llm";
 *
 * const model = google("models/gemini-pro") as LanguageModel;
 *
 * const query = "What are the benefits of exercise?";
 * const response = "Exercise improves cardiovascular health and builds muscle strength.";
 * const context = [
 *   "Regular exercise strengthens the heart and improves circulation.",
 *   "Physical activity helps build and maintain muscle mass.",
 *   "Exercise can improve mental health and reduce stress.",
 * ];
 *
 * async function main() {
 *   const result = await evaluateContextualRecall(model, { query, response, context });
 *   console.log("Contextual Recall Score:", result.score);
 *   console.log("Reason:", result.info.reason);
 * }
 *
 * main();
 * 
 */
export async function evaluateContextualRecall(
  model: LanguageModel,
  input: ContextualRecallInput,
  options?: Omit<ContextualRecallOptions, 'context'>
): Promise<MetricResult> {
  const validatedInput = ContextualRecallInputSchema.parse(input);
  const { query, response, context } = validatedInput;

  const metric = new ContextualRecallMetric(model, { ...options, context });
  const result = await metric.measure(query, response);
  return MetricResultSchema.parse(result);
}
