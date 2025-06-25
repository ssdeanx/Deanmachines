// Textual Difference Metric
// Measures difference between two texts (e.g., Levenshtein distance)
import { TextualDifferenceMetric } from '@mastra/evals/nlp';
import { z } from 'zod';

export const TextualDifferenceOptionsSchema = z.object({
  scale: z.number().optional().default(1),
});

export type TextualDifferenceOptions = z.infer<typeof TextualDifferenceOptionsSchema>;

export const MetricResultSchema = z.object({
  score: z.number(),
  info: z.object({
    reason: z.string(),
  }),
});

export type MetricResult = z.infer<typeof MetricResultSchema>;

export const TextualDifferenceInputSchema = z.object({
  reference: z.string(),
  output: z.string(),
});
export type TextualDifferenceInput = z.infer<typeof TextualDifferenceInputSchema>;

/**
 * Evaluates the textual difference between reference and output texts.
 *
 * @param {TextualDifferenceInput} input - The input data containing reference and output texts.
 * @param {TextualDifferenceOptions} [options] - Optional configuration for the metric.
 * @returns {Promise<MetricResult>} A promise that resolves to the metric result,
 *                                   including the difference score and reasoning.
 *
 * @example
 * 
 * import { evaluateTextualDifference } from "./textualDifference";
 *
 * const reference = "The quick brown fox jumps over the lazy dog";
 * const output = "The quick brown fox leaps over the lazy dog";
 *
 * async function main() {
 *   const result = await evaluateTextualDifference({ reference, output });
 *   console.log("Textual Difference Score:", result.score);
 *   console.log("Reason:", result.info.reason);
 * }
 *
 * main();
 * 
 */
export async function evaluateTextualDifference(
  input: TextualDifferenceInput,
): Promise<MetricResult> {
  const validatedInput = TextualDifferenceInputSchema.parse(input);
  const { reference, output } = validatedInput;

  const metric = new TextualDifferenceMetric();
  const result = await metric.measure(reference, output);
  return MetricResultSchema.parse(result);
}
