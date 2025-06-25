// Context Position Metric
// Checks if context appears in the correct position in output
import { z } from 'zod';
import { ContextPositionMetric } from '@mastra/evals/llm';
import { LanguageModel } from '@mastra/core/llm';

// Zod schema for validating ContextPositionMetric inputs
export const ContextPositionMetricInputSchema = z.object({
  context: z.array(z.string()).describe('Array of context strings to evaluate'),
  query: z.string().describe('The query or question being answered'),
  response: z.string().describe('The response to evaluate'),
  llm: z.any().describe('Language model instance for evaluation'),
});

export type ContextPositionMetricInput = z.infer<typeof ContextPositionMetricInputSchema>;

// Zod schema for ContextPositionMetric outputs
export const ContextPositionMetricOutputSchema = z.object({
  score: z.number().min(0).max(1).describe('Position accuracy score between 0 and 1'),
  reason: z.string().describe('Explanation of the evaluation result'),
});

export type ContextPositionMetricOutput = z.infer<typeof ContextPositionMetricOutputSchema>;

// Function to create and use ContextPositionMetric directly
export async function evaluateContextPosition(
  llm: LanguageModel,
  context: string[],
  query: string,
  response: string
): Promise<ContextPositionMetricOutput> {
  // Create the Mastra metric instance
  const metric = new ContextPositionMetric(llm, { context });
  
  // Evaluate using the metric
  const result = await metric.measure(query, response);
  
  return {
    score: result.score,
    reason: result.info.reason || 'No specific reason provided by the metric.',
  };
}
