// Completeness Metric
// Checks if output is complete with respect to requirements
import { z } from 'zod';
import { CompletenessMetric } from '@mastra/evals/nlp';
// import { LanguageModel } from '@mastra/core/llm'; // Not used in this basic version

// Define the schema for the input to the completeness metric
export const CompletenessMetricInputSchema = z.object({
  output: z.string().describe("The generated output string to be evaluated."),
  requirements: z.array(z.string()).describe("An array of requirement strings that the output should ideally meet."),
  // reference: z.string().describe("The reference string containing all ideal elements.") // Mastra example uses reference and text
});

export type CompletenessMetricInput = z.infer<typeof CompletenessMetricInputSchema>;

// Define the schema for the output of the completeness metric
// Based on Mastra example, the output is simpler: { score: number, info: { missingElements: string[], elementCounts: { input: number, output: number } } }
export const CompletenessMetricOutputSchema = z.object({
  score: z.number().min(0).max(1).describe("A score between 0 and 1, where 1 means all requirements are met and 0 means none are."),
  // Replicating Mastra's output structure for consistency if possible, though their example is slightly different
  // For now, sticking to a simpler interpretation based on direct requirements matching.
  metRequirements: z.array(z.string()).describe("List of requirements that were met by the output."),
  unmetRequirements: z.array(z.string()).describe("List of requirements that were not met by the output."),
});

export type CompletenessMetricOutput = z.infer<typeof CompletenessMetricOutputSchema>;

/**
 * Defines the structure for an evaluation result, commonly returned by metric evaluations.
 */
export interface MetricEvaluation<InputType, OutputType> {
  metricName: string;
  input: InputType;
  output: OutputType;
  score: number;
  reasoning?: string; // Optional reasoning for the score
  error?: string; // Optional error message if evaluation failed
  [key: string]: unknown;
}

/**
 * Mastra Completeness Metric Wrapper
 *
 * This class wraps Mastra's CompletenessMetric or provides a compatible implementation
 * if direct wrapping is complex. It evaluates if a given output string meets a set of
 * specified requirements.
 *
 * The Mastra example for CompletenessMetric uses `metric.measure(reference, text)`
 * which is slightly different from a direct `requirements` array. This implementation
 * adapts the concept to use an explicit `requirements` array.
 *
 * @example
 * const metric = new CompletenessMetric();
 * const result = await metric.evaluate({
 *   output: "The system is fast and reliable.",
 *   requirements: ["fast", "reliable", "secure"]
 * });
 * console.log(result.score); // Output: 0.66...
 * console.log(result.output.metRequirements);
 * console.log(result.output.unmetRequirements);
 */
export class CompletenessEvaluator { // Not extending BaseMetric for now, will implement evaluate directly
  private mastraMetric: CompletenessMetric;

  constructor() {
    this.mastraMetric = new CompletenessMetric();
  }

  async evaluate(input: CompletenessMetricInput): Promise<MetricEvaluation<CompletenessMetricInput, CompletenessMetricOutput>> {
    CompletenessMetricInputSchema.parse(input); // Validate input

    const { output, requirements } = input;

    // For a direct implementation based on our schema requirements:
    const metRequirements: string[] = [];
    const unmetRequirements: string[] = [];

    requirements.forEach(req => {
      if (output.includes(req)) {
        metRequirements.push(req);
      } else {
        unmetRequirements.push(req);
      }
    });

    const score = requirements.length > 0 ? metRequirements.length / requirements.length : 1;

    const resultOutput: CompletenessMetricOutput = {
      score,
      metRequirements,
      unmetRequirements,
    };

    return {
      metricName: 'Completeness',
      input,
      output: resultOutput,
      score,
      reasoning: `Met ${metRequirements.length} out of ${requirements.length} requirements. This is a simplified implementation. Mastra's native metric might offer more detailed analysis if used with its 'reference' and 'text' input structure.`,
    };
  }
}
