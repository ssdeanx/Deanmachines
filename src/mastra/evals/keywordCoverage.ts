// Keyword Coverage Metric
// Checks if output covers required keywords
import { KeywordCoverageMetric } from '@mastra/evals/nlp';
import { z } from 'zod';

export const KeywordCoverageOptionsSchema = z.object({
  scale: z.number().optional().default(1),
});

export type KeywordCoverageOptions = z.infer<typeof KeywordCoverageOptionsSchema>;

export const MetricResultSchema = z.object({
  score: z.number(),
  info: z.object({
    totalKeywords: z.number(),
    matchedKeywords: z.number(),
  }),
});

export type MetricResult = z.infer<typeof MetricResultSchema>;

export const KeywordCoverageInputSchema = z.object({
  input: z.string(),
  output: z.string(),
});
export type KeywordCoverageInput = z.infer<typeof KeywordCoverageInputSchema>;

/**
 * Evaluates the keyword coverage for a given input and output.
 *
 * @param {KeywordCoverageInput} input - The input data containing input text and output text.
 * @param {KeywordCoverageOptions} [options] - Optional configuration for the metric.
 * @returns {Promise<MetricResult>} A promise that resolves to the metric result,
 *                                   including the coverage score and keyword match info.
 *
 * @example
 * 
 * import { evaluateKeywordCoverage } from "./keywordCoverage";
 *
 * const inputText = "Write about machine learning algorithms including neural networks and decision trees";
 * const outputText = "Machine learning encompasses various algorithms. Neural networks are powerful tools for pattern recognition. Decision trees provide interpretable models for classification tasks.";
 *
 * async function main() {
 *   const result = await evaluateKeywordCoverage({ 
 *     input: inputText, 
 *     output: outputText 
 *   });
 *   console.log("Keyword Coverage Score:", result.score);
 *   console.log("Total Keywords:", result.info.totalKeywords);
 *   console.log("Matched Keywords:", result.info.matchedKeywords);
 * }
 *
 * main();
 * 
 */
export async function evaluateKeywordCoverage(
  input: KeywordCoverageInput,
): Promise<MetricResult> {
  const validatedInput = KeywordCoverageInputSchema.parse(input);
  const { input: inputText, output: outputText } = validatedInput;

  const metric = new KeywordCoverageMetric();
  const result = await metric.measure(inputText, outputText);
  return MetricResultSchema.parse(result);
}
