// Summarization Metric
// Checks if output is a good summary of the reference
import { LanguageModel } from '@mastra/core/llm';
import { SummarizationMetric } from '@mastra/evals/llm';
import { z } from 'zod';

export const SummarizationOptionsSchema = z.object({
  scale: z.number().optional().default(1),
});

export type SummarizationOptions = z.infer<typeof SummarizationOptionsSchema>;

export const MetricResultSchema = z.object({
  score: z.number(),
  info: z.object({
    reason: z.string(),
  }),
});

export type MetricResult = z.infer<typeof MetricResultSchema>;

export const SummarizationInputSchema = z.object({
  reference: z.string(),
  summary: z.string(),
});
export type SummarizationInput = z.infer<typeof SummarizationInputSchema>;

/**
 * Evaluates the summarization quality for a given reference and summary.
 *
 * @param {LanguageModel} model - The language model used for evaluation.
 * @param {SummarizationInput} input - The input data containing reference and summary.
 * @param {SummarizationOptions} [options] - Optional configuration for the metric.
 * @returns {Promise<MetricResult>} A promise that resolves to the metric result,
 *                                   including the summarization score and reasoning.
 *
 * @example
 * 
 * import { google } from "@ai-sdk/google";
 * import { evaluateSummarization } from "./summarization";
 * import { LanguageModel } from "@mastra/core/llm";
 *
 * const model = google("models/gemini-pro") as LanguageModel;
 *
 * const reference = "Climate change refers to long-term shifts in global temperatures and weather patterns. While climate variations are natural, human activities have been the main driver of climate change since the 1800s, primarily through burning fossil fuels like coal, oil and gas.";
 * const summary = "Climate change involves long-term temperature and weather shifts, primarily caused by human fossil fuel use since the 1800s.";
 *
 * async function main() {
 *   const result = await evaluateSummarization(model, { reference, summary });
 *   console.log("Summarization Score:", result.score);
 *   console.log("Reason:", result.info.reason);
 * }
 *
 * main();
 * 
 */
export async function evaluateSummarization(
  model: LanguageModel,
  input: SummarizationInput,
  options?: SummarizationOptions
): Promise<MetricResult> {
  const validatedInput = SummarizationInputSchema.parse(input);
  const { reference, summary } = validatedInput;

  const metric = new SummarizationMetric(model, options);
  const result = await metric.measure(reference, summary);
  return MetricResultSchema.parse(result);
}
