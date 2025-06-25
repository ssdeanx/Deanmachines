// Faithfulness Metric
// Checks if output is faithful to the reference
import { LanguageModel } from '@mastra/core/llm';
import { FaithfulnessMetric } from '@mastra/evals/llm';
import { z } from 'zod';

export const FaithfulnessOptionsSchema = z.object({
  scale: z.number().optional().default(1),
  context: z.array(z.string()),
});

export type FaithfulnessOptions = z.infer<typeof FaithfulnessOptionsSchema>;

export const MetricResultSchema = z.object({
  score: z.number(),
  info: z.object({
    reason: z.string(),
  }),
});

export type MetricResult = z.infer<typeof MetricResultSchema>;

export const FaithfulnessInputSchema = z.object({
  query: z.string(),
  response: z.string(),
  context: z.array(z.string()),
});
export type FaithfulnessInput = z.infer<typeof FaithfulnessInputSchema>;

/**
 * Evaluates the faithfulness for a given query, response, and context.
 *
 * @param {LanguageModel} model - The language model used for evaluation.
 * @param {FaithfulnessInput} input - The input data containing query, response, and context.
 * @param {Omit<FaithfulnessOptions, 'context'>} [options] - Optional configuration for the metric.
 * @returns {Promise<MetricResult>} A promise that resolves to the metric result,
 *                                   including the faithfulness score and reasoning.
 *
 * @example
 * 
 * import { google } from "@ai-sdk/google";
 * import { evaluateFaithfulness } from "./faithfulness";
 * import { LanguageModel } from "@mastra/core/llm";
 *
 * const model = google("models/gemini-pro") as LanguageModel;
 *
 * const query = "What is the capital of France?";
 * const response = "The capital of France is Paris.";
 * const context = [
 *   "Paris is the capital and most populous city of France.",
 *   "France is a country in Western Europe.",
 * ];
 *
 * async function main() {
 *   const result = await evaluateFaithfulness(model, { query, response, context });
 *   console.log("Faithfulness Score:", result.score);
 *   console.log("Reason:", result.info.reason);
 * }
 *
 * main();
 * 
 */
export async function evaluateFaithfulness(
  model: LanguageModel,
  input: FaithfulnessInput,
  options?: Omit<FaithfulnessOptions, 'context'>
): Promise<MetricResult> {
  const validatedInput = FaithfulnessInputSchema.parse(input);
  const { query, response, context } = validatedInput;

  const metric = new FaithfulnessMetric(model, { ...options, context });
  const result = await metric.measure(query, response);
  return MetricResultSchema.parse(result);
}
