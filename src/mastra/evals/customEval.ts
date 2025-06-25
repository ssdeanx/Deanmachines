// Custom Eval Metric using @mastra/evals
import { MastraAgentJudge } from '@mastra/evals/judge';
import { z } from 'zod';
import { type LanguageModel } from '@mastra/core/llm';

// Example: Custom instructions and prompts (replace with your own logic)
export const CUSTOM_INSTRUCTIONS = `You are a domain expert evaluating custom criteria.`;

export const generateCustomPrompt = ({ output }: { output: string }) => `Evaluate the following output according to your custom criteria.\n\nOutput:\n${output}\n\nReturn your response in this format:\n{\n  \"score\": number,\n  \"reason\": string\n}`;

export class CustomEvalJudge extends MastraAgentJudge {
  constructor(model: LanguageModel) {
    super('Custom Eval', CUSTOM_INSTRUCTIONS, model);
  }

  async evaluate(output: string): Promise<{ score: number; reason: string }> {
    const prompt = generateCustomPrompt({ output });
    const result = await this.agent.generate(prompt, {
      output: z.object({
        score: z.number(),
        reason: z.string(),
      }),
    });
    return result.object;
  }
}

// Metric interface for use with agents
export class CustomEvalMetric {
  private judge: CustomEvalJudge;
  constructor(model: LanguageModel) {
    this.judge = new CustomEvalJudge(model);
  }

  async measure(output: string): Promise<{ score: number; info: { reason: string } }> {
    const { score, reason } = await this.judge.evaluate(output);
    return {
      score,
      info: { reason },
    };
  }
}

