// Tone Consistency Metric
// Checks if the output maintains a consistent tone
import { ToneConsistencyMetric } from '@mastra/evals/nlp';
import { z } from 'zod';

export const ToneConsistencyOptionsSchema = z.object({
  scale: z.number().optional().default(1),
});

export type ToneConsistencyOptions = z.infer<typeof ToneConsistencyOptionsSchema>;

export const MetricResultSchema = z.object({
  score: z.number(),
  info: z.object({
    reason: z.string(),
  }),
});

export type MetricResult = z.infer<typeof MetricResultSchema>;

export const ToneConsistencyInputSchema = z.object({
  reference: z.string(),
  output: z.string(),
});
export type ToneConsistencyInput = z.infer<typeof ToneConsistencyInputSchema>;

/**
 * Evaluates the tone consistency between reference and output texts.
 *
 * @param {LanguageModel} model - The language model used for evaluation.
 * @param {ToneConsistencyInput} input - The input data containing reference and output texts.
 * @param {ToneConsistencyOptions} [options] - Optional configuration for the metric.
 * @returns {Promise<MetricResult>} A promise that resolves to the metric result,
 *                                   including the tone consistency score and reasoning.
 *
 * @example
 * 
 * import { google } from "@ai-sdk/google";
 * import { evaluateToneConsistency } from "./toneConsistency";
 * import { LanguageModel } from "@mastra/core/llm";
 *
 * const model = google("models/gemini-pro") as LanguageModel;
 *
 * const reference = "Thank you for your inquiry. We appreciate your interest in our services and will respond promptly.";
 * const output = "Thanks for asking! We're excited about your interest and will get back to you soon.";
 *
 * async function main() {
 *   const result = await evaluateToneConsistency(model, { reference, output });
 *   console.log("Tone Consistency Score:", result.score);
 *   console.log("Reason:", result.info.reason);
 * }
 *
 * main();
 * 
 */
export async function evaluateToneConsistency(
  input: ToneConsistencyInput,
): Promise<MetricResult> {
  const validatedInput = ToneConsistencyInputSchema.parse(input);
  const { reference, output } = validatedInput;

  const metric = new ToneConsistencyMetric();
  const result = await metric.measure(reference, output);
  return MetricResultSchema.parse(result);
}
