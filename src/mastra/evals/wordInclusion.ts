// Word Inclusion Metric
// Checks if required words/phrases are present in the output
import { Metric, type MetricResult } from '@mastra/core/eval';
import { z } from 'zod';

interface WordInclusionResult extends MetricResult {
  score: number;
  info: {
    totalWords: number;
    matchedWords: number;
  };
}

export const WordInclusionOptionsSchema = z.object({
  words: z.array(z.string()),
  caseSensitive: z.boolean().optional().default(false),
});

export type WordInclusionOptions = z.infer<typeof WordInclusionOptionsSchema>;

export const WordInclusionInputSchema = z.object({
  input: z.string(),
  output: z.string(),
  words: z.array(z.string()),
});
export type WordInclusionInput = z.infer<typeof WordInclusionInputSchema>;

export class WordInclusionMetric extends Metric {
  private referenceWords: Set<string>;

  constructor(words: string[]) {
    super();
    this.referenceWords = new Set(words);
  }

  async measure(input: string, output: string): Promise<WordInclusionResult> {
    const matchedWords = [...this.referenceWords].filter((k) =>
      output.includes(k),
    );
    const totalWords = this.referenceWords.size;
    const coverage = totalWords > 0 ? matchedWords.length / totalWords : 0;

    return {
      score: coverage,
      info: {
        totalWords: this.referenceWords.size,
        matchedWords: matchedWords.length,
      },
    };
  }

  public async evaluate(input: WordInclusionInput): Promise<WordInclusionResult> {
    const validatedInput = WordInclusionInputSchema.parse(input);
    const { input: inputText, output: outputText, words } = validatedInput;

    // Create a new instance with the provided words
    const metric = new WordInclusionMetric(words);
    return metric.measure(inputText, outputText);
  }
}

