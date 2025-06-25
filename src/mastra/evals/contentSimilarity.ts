// Content Similarity Metric
// Measures similarity between output and reference
import { z } from 'zod';
import { ContentSimilarityMetric } from '@mastra/evals/nlp';
// import { LanguageModel } from '@mastra/core/llm'; // Not used in this basic version

// Define the schema for the input to the content similarity metric
export const ContentSimilarityMetricInputSchema = z.object({
  output: z.string().describe("The generated output string to be evaluated."),
  reference: z.string().describe("The reference string to compare against."),
});

export type ContentSimilarityMetricInput = z.infer<typeof ContentSimilarityMetricInputSchema>;

// Define the schema for the output of the content similarity metric
// Based on Mastra example: { score: number, info: { similarity: number } }
export const ContentSimilarityMetricOutputSchema = z.object({
  score: z.number().min(0).max(1).describe("A score between 0 and 1, representing the similarity."),
  // Mastra's `info.similarity` seems to be the same as `score` in their example.
  // We can simplify or keep it if there's a nuanced difference in other scenarios.
  similarity: z.number().min(0).max(1).describe("The calculated similarity value, often identical to the score."),
});

export type ContentSimilarityMetricOutput = z.infer<typeof ContentSimilarityMetricOutputSchema>;

/**
 * Defines the structure for an evaluation result.
 */
export interface MetricEvaluation<InputType, OutputType> {
  metricName: string;
  input: InputType;
  output: OutputType;
  score: number;
  reasoning?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Mastra Content Similarity Metric Wrapper
 *
 * This class wraps Mastra's ContentSimilarityMetric.
 * It measures the textual similarity between an output string and a reference string.
 *
 * @example
 * const metric = new CustomContentSimilarityMetric();
 * const result = await metric.evaluate({
 *   output: "The quick brown fox jumps over the lazy dog.",
 *   reference: "A quick brown fox jumped over a lazy dog."
 * });
 * console.log(result.score); // Example: 0.77...
 * console.log(result.output.similarity); // Example: 0.77...
 */
export class CustomContentSimilarityMetric {
  private mastraMetric: ContentSimilarityMetric;

  constructor() {
    this.mastraMetric = new ContentSimilarityMetric();
  }

  async evaluate(input: ContentSimilarityMetricInput): Promise<MetricEvaluation<ContentSimilarityMetricInput, ContentSimilarityMetricOutput>> {
    ContentSimilarityMetricInputSchema.parse(input); // Validate input

    const { output, reference } = input;

    // Call Mastra's measure method
    const mastraResult = await this.mastraMetric.measure(reference, output);
    // mastraResult is { score: number, info: { similarity: number, ... } }

    const score = mastraResult.score;
    // Assuming mastraResult.info.similarity is the primary similarity value we want.
    const similarity = mastraResult.info.similarity !== undefined ? mastraResult.info.similarity : score;

    const resultOutput: ContentSimilarityMetricOutput = {
      score,
      similarity,
    };

    return {
      metricName: 'ContentSimilarity',
      input,
      output: resultOutput,
      score,
      reasoning: `Similarity calculated using Mastra ContentSimilarityMetric. Score: ${score.toFixed(4)}. Raw similarity from Mastra: ${similarity.toFixed(4)}.`,
    };
  }
}

