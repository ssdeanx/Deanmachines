import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { runHyperAgentTask } from "../services/hyperbrowser";

const rawInputSchema = z.object({
  task: z.string().describe("The browser automation task to perform"),
});

const rawOutputSchema = z.object({
  output: z.unknown().describe("The result of the browser automation task."),
  error: z.string().optional().describe("Error message if the task failed."),
});

export const hyperAgentTool = createTool({
  id: "hyper-agent-task",
  description: "Executes a browser automation task using HyperAgent (Google Gemini LLM + Hyperbrowser cloud).",
  inputSchema: rawInputSchema,
  outputSchema: rawOutputSchema,
  async execute({ context }) {
    try {
      const output = await runHyperAgentTask(context.task);
      return { output };
    } catch (error) {
      return {
        output: undefined,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
