// Answer Relevancy Metric using @mastra/evals
// import { openai } from '@ai-sdk/openai'; // Remove OpenAI import
import { AnswerRelevancyMetric } from '@mastra/evals/llm';
import { z } from 'zod';
import { type LanguageModel } from '@mastra/core/llm'; // Import LanguageModel

export const answerRelevancySchema = z.object({
  output: z.string(),
  question: z.string(),
  model: z.custom<LanguageModel>(), // Add model to schema
});

// Configure the metric with model and options (see Mastra docs)
// const metric = new AnswerRelevancyMetric(openai('gpt-4o-mini'), {
//   uncertaintyWeight: 0.3, // Weight for 'unsure' verdicts
//   scale: 1, // Scale for the final score
// });

/**
 * Evaluate the relevancy of an output to a question using Mastra's AnswerRelevancyMetric.
 * Returns a score (0-1) and a reason string.
 */
export async function answerRelevancy({ output, question, model }: { output: string; question: string; model: LanguageModel }) {
  // Instantiate the metric with the provided model
  const metric = new AnswerRelevancyMetric(model, {
    uncertaintyWeight: 0.3, // Default, can be customized
    scale: 1, // Default, can be customized
  });
  return metric.measure(question, output);
}

