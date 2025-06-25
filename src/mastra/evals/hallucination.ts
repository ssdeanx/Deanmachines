// Hallucination Metric
// Checks for hallucinated (unsupported) content in output
import { LanguageModel } from '@mastra/core/llm';
import { HallucinationMetric } from '@mastra/evals/llm';
import { z } from 'zod';

export const HallucinationOptionsSchema = z.object({
  scale: z.number().optional().default(1),
  context: z.array(z.string()),
});

export type HallucinationOptions = z.infer<typeof HallucinationOptionsSchema>;

export const MetricResultSchema = z.object({
  score: z.number(),
  info: z.object({
    reason: z.string(),
  }),
});

export type MetricResult = z.infer<typeof MetricResultSchema>;

export const HallucinationInputSchema = z.object({
  query: z.string(),
  response: z.string(),
  context: z.array(z.string()),
});
export type HallucinationInput = z.infer<typeof HallucinationInputSchema>;

/**
 * Evaluates the hallucination for a given query, response, and context.
 *
 * @param {LanguageModel} model - The language model used for evaluation.
 * @param {HallucinationInput} input - The input data containing query, response, and context.
 * @param {Omit<HallucinationOptions, 'context'>} [options] - Optional configuration for the metric.
 * @returns {Promise<MetricResult>} A promise that resolves to the metric result,
 *                                   including the hallucination score and reasoning.
 *
 * @example
 * 
 * import { google } from "@ai-sdk/google";
 * import { evaluateHallucination } from "./hallucination";
 * import { LanguageModel } from "@mastra/core/llm";
 *
 * const model = google("models/gemini-pro") as LanguageModel;
 *
 * const query = "What is the population of Tokyo?";
 * const response = "Tokyo has a population of approximately 14 million people in the metropolitan area.";
 * const context = [
 *   "Tokyo is the capital of Japan.",
 *   "The Greater Tokyo Area is the most populous metropolitan area in the world.",
 *   "Tokyo's metropolitan area has around 37-38 million residents.",
 * ];
 *
 * async function main() {
 *   const result = await evaluateHallucination(model, { query, response, context });
 *   console.log("Hallucination Score:", result.score);
 *   console.log("Reason:", result.info.reason);
 * }
 *
 * main();
 * 
 */
export async function evaluateHallucination(
  model: LanguageModel,
  input: HallucinationInput,
  options?: Omit<HallucinationOptions, 'context'>
): Promise<MetricResult> {
  const validatedInput = HallucinationInputSchema.parse(input);
  const { query, response, context } = validatedInput;

  const metric = new HallucinationMetric(model, { ...options, context });
  const result = await metric.measure(query, response);
  return MetricResultSchema.parse(result);
}
