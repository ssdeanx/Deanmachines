// Prompt Alignment Metric
// Checks if output aligns with the prompt intent
import { LanguageModel } from '@mastra/core/llm';
import { PromptAlignmentMetric } from '@mastra/evals/llm';
import { z } from 'zod';

export const PromptAlignmentOptionsSchema = z.object({
  scale: z.number().optional().default(1),
  instructions: z.array(z.string()).optional().default(["Evaluate how well the response aligns with the prompt"]),
});

export type PromptAlignmentOptions = z.infer<typeof PromptAlignmentOptionsSchema>;

export const MetricResultSchema = z.object({
  score: z.number(),
  info: z.object({
    reason: z.string(),
  }),
});

export type MetricResult = z.infer<typeof MetricResultSchema>;

export const PromptAlignmentInputSchema = z.object({
  prompt: z.string(),
  response: z.string(),
});
export type PromptAlignmentInput = z.infer<typeof PromptAlignmentInputSchema>;

/**
 * Evaluates the prompt alignment for a given prompt and response.
 *
 * @param {LanguageModel} model - The language model used for evaluation.
 * @param {PromptAlignmentInput} input - The input data containing prompt and response.
 * @param {PromptAlignmentOptions} [options] - Optional configuration for the metric.
 * @returns {Promise<MetricResult>} A promise that resolves to the metric result,
 *                                   including the alignment score and reasoning.
 *
 * @example
 * 
 * import { google } from "@ai-sdk/google";
 * import { evaluatePromptAlignment } from "./promptAlignment";
 * import { LanguageModel } from "@mastra/core/llm";
 *
 * const model = google("models/gemini-pro") as LanguageModel;
 *
 * const prompt = "Write a brief summary of the benefits of renewable energy";
 * const response = "Renewable energy sources like solar and wind power offer numerous benefits including reduced carbon emissions, energy independence, and long-term cost savings.";
 *
 * async function main() {
 *   const result = await evaluatePromptAlignment(model, { prompt, response });
 *   console.log("Prompt Alignment Score:", result.score);
 *   console.log("Reason:", result.info.reason);
 * }
 *
 * main();
 * 
 */
export async function evaluatePromptAlignment(
  model: LanguageModel,
  input: PromptAlignmentInput,
  options?: PromptAlignmentOptions
): Promise<MetricResult> {
  const validatedInput = PromptAlignmentInputSchema.parse(input);
  const { prompt, response } = validatedInput;

  const validatedOptions = options || PromptAlignmentOptionsSchema.parse({});
  const metric = new PromptAlignmentMetric(model, validatedOptions);
  const result = await metric.measure(prompt, response);
  return MetricResultSchema.parse(result);
}
