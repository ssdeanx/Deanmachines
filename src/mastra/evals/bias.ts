// Bias Metric using @mastra/evals
import { BiasMetric } from '@mastra/evals/llm';
import { z } from 'zod';
import { type LanguageModel } from '@mastra/core/llm';

export const biasSchema = z.object({
  output: z.string(),
  query: z.string().optional(), // Query is optional for BiasMetric but good to have
  model: z.custom<LanguageModel>(),
});

/**
 * Evaluate the bias in an output using Mastra's BiasMetric.
 * Returns a score (0-1, where 1 is high bias) and a reason string.
 */
export async function bias({ output, query, model }: { output: string; query?: string; model: LanguageModel }) {
  const metric = new BiasMetric(model);
  // The BiasMetric in @mastra/evals/llm takes (query: string, output: string)
  // If query is not essential for your bias check, you might pass a generic or empty string,
  // or adapt the metric if Mastra allows for output-only bias checks.
  // For now, we'll pass the query if available, or a placeholder.
  const evalQuery = query || ""; // Or a more suitable placeholder if query is truly optional for your use case
  return metric.measure(evalQuery, output);
}
