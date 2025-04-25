import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { create, all } from "mathjs";

const math = create(all);

export interface CalculatorConfig {
  maxRetries?: number;
  timeout?: number;
}

const calculatorTool = createTool({
  id: "calculator",
  description: "Performs advanced mathematical calculations (arithmetic, algebra, functions, constants, etc.) and returns a human-readable answer.",
  inputSchema: z.object({
    expression: z.string().describe("Mathematical expression to evaluate. Supports arithmetic, functions, constants, parentheses, etc."),
  }),
  outputSchema: z.object({
    result: z.number().or(z.string()),
    answer: z.string().describe("A human-readable answer to present to the user."),
    steps: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { expression } = context;
      const result = math.evaluate(expression);
      let steps: string[] = [];
      try {
        const node = math.parse(expression);
        // Use node.type for type checks
        if (["OperatorNode", "ParenthesisNode", "FunctionNode"].includes(node.type)) {
          steps.push(`Parsed: ${node.toString()}`);
          steps.push(`LaTeX: ${node.toTex()}`);
          // For simple binary operations, show left/right
          if (node.type === "OperatorNode" && Array.isArray((node as any).args) && (node as any).args.length === 2) {
            steps.push(`Left: ${(node as any).args[0].toString()}`);
            steps.push(`Right: ${(node as any).args[1].toString()}`);
          }
        }
      } catch {}
      const answer = `The result of ${expression} is ${result}.`;
      return {
        result,
        answer,
        steps,
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        result: NaN,
        answer: `Sorry, I couldn't calculate that expression. (${errorMsg})`,
        error: errorMsg,
      };
    }
  },
});

// Export the tool directly for registration
export { calculatorTool as calculator };
