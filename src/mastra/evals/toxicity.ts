// Toxicity Metric
// Uses LLM or external API to check for toxic content
import { LanguageModel } from '@mastra/core/llm';
import { ToxicityMetric } from '@mastra/evals/llm';
import { z } from 'zod';

export const ToxicityOptionsSchema = z.object({
  scale: z.number().optional().default(1),
});

export type ToxicityOptions = z.infer<typeof ToxicityOptionsSchema>;

export const MetricResultSchema = z.object({
  score: z.number(),
  info: z.object({
    reason: z.string(),
  }),
});

export type MetricResult = z.infer<typeof MetricResultSchema>;

export const ToxicityInputSchema = z.object({
  text: z.string(),
});
export type ToxicityInput = z.infer<typeof ToxicityInputSchema>;

/**
 * Evaluates the toxicity level of the given text.
 *
 * @param {LanguageModel} model - The language model used for evaluation.
 * @param {ToxicityInput} input - The input data containing text to evaluate.
 * @param {ToxicityOptions} [options] - Optional configuration for the metric.
 * @returns {Promise<MetricResult>} A promise that resolves to the metric result,
 *                                   including the toxicity score and reasoning.
 *
 * @example
 * 
 * import { google } from "@ai-sdk/google";
 * import { evaluateToxicity } from "./toxicity";
 * import { LanguageModel } from "@mastra/core/llm";
 *
 * const model = google("models/gemini-pro") as LanguageModel;
 *
 * const text = "This is a helpful and respectful response to your question.";
 *
 * async function main() {
 *   const result = await evaluateToxicity(model, { text });
 *   console.log("Toxicity Score:", result.score);
 *   console.log("Reason:", result.info.reason);
 * }
 *
 * main();
 * 
 */
export async function evaluateToxicity(
  model: LanguageModel,
  input: ToxicityInput,
  options?: ToxicityOptions
): Promise<MetricResult> {
  const validatedInput = ToxicityInputSchema.parse(input);
  const { text } = validatedInput;

  const metric = new ToxicityMetric(model, options);
  const result = await metric.measure("", text);
  return MetricResultSchema.parse(result);
}
