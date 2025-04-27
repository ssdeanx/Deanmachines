import { aiFunction, AIFunctionsProvider, AIFunctionSet } from "@agentic/core";
import { createMastraTools } from "@agentic/mastra";
import { createAISDKTools } from "./ai-sdk";
import { createGenkitTools } from "./genkit";
import type { Genkit } from "genkit";
import { z } from "zod";
import { create, all } from "mathjs";

const math = create(all);

/**
 * CalculatorConfig allows you to control retry and timeout logic for the calculator tool.
 * - maxRetries: Number of times to retry a failed calculation.
 * - timeout: Maximum milliseconds to allow for a calculation before aborting.
 */
export interface CalculatorConfig {
  maxRetries?: number;
  timeout?: number;
}

export class CalculatorClient extends AIFunctionsProvider {
  private maxRetries: number;
  private timeout: number;

  constructor(config: CalculatorConfig = {}) {
    super();
    this.maxRetries = config.maxRetries ?? 0;
    this.timeout = config.timeout ?? 0;
  }

  /**
   * Evaluate a mathematical expression with retry and timeout logic.
   * @param expression The math expression to evaluate.
   */
  @aiFunction({
    name: "calculator",
    description: "Performs advanced mathematical calculations (arithmetic, algebra, functions, constants, etc.) and returns a human-readable answer.",
    inputSchema: z.object({
      expression: z.string().describe("Mathematical expression to evaluate. Supports arithmetic, functions, constants, parentheses, etc."),
    }),
  })
  async evaluate({ expression }: { expression: string }) {
    let attempts = 0;
    const maxRetries = this.maxRetries;
    const timeout = this.timeout;
    let lastError: unknown;
    while (attempts <= maxRetries) {
      attempts++;
      try {
        const result = await (timeout > 0
          ? Promise.race([
              this._doEvaluate(expression),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Calculation timed out")), timeout)),
            ])
          : this._doEvaluate(expression)
        );
        return result;
      } catch (error) {
        lastError = error;
        if (attempts > maxRetries) break;
      }
    }
    const message = lastError instanceof Error ? lastError.message : "Unknown error";
    return {
      result: NaN,
      answer: `Sorry, I couldn't calculate that expression. (${message})`,
      error: message,
    };
  }

  /**
   * Internal method to actually perform the math evaluation and step extraction.
   */
  private async _doEvaluate(expression: string) {
    const result = math.evaluate(expression);
    let steps: string[] = [];
    try {
      const node = math.parse(expression);
      if (["OperatorNode", "ParenthesisNode", "FunctionNode"].includes(node.type)) {
        steps.push(`Parsed: ${node.toString()}`);
        steps.push(`LaTeX: ${node.toTex()}`);
        if (node.type === "OperatorNode" && Array.isArray((node as any).args) && (node as any).args.length === 2) {
          steps.push(`Left: ${(node as any).args[0].toString()}`);
          steps.push(`Right: ${(node as any).args[1].toString()}`);
        }
      }
    } catch {}
    const answer = `The result of ${expression} is ${result}.`;
    return { result, answer, steps };
  }
}


/**
 * Returns Mastra-compatible calculator tools with config applied.
 * @param config CalculatorConfig for retries/timeouts
 */
export function createMastraCalculatorTools(config: CalculatorConfig = {}) {
  const client = new CalculatorClient(config);
  return createMastraTools(...client.functions);
}

/**
 * Returns an AIFunctionSet for the calculator, for advanced scenarios (e.g., pick/omit/map).
 */
export function getCalculatorFunctionSet(config: CalculatorConfig = {}) {
  const client = new CalculatorClient(config);
  // Robust: handle single function, array, or iterable
  let fns: any[] = [];
  if (Array.isArray(client.functions)) {
    fns = client.functions;
  } else if (typeof client.functions === 'object' && typeof client.functions[Symbol.iterator] === 'function') {
    fns = Array.from(client.functions);
  } else {
    fns = [client.functions];
  }
  return new AIFunctionSet(...fns);
}

/**
 * Returns Vercel AI SDK-compatible calculator tools with config applied.
 * @param config CalculatorConfig for retries/timeouts
 */
export function createAISDKCalculatorTools(config: CalculatorConfig = {}) {
  const client = new CalculatorClient(config);
  return createAISDKTools(...client.functions);
}

/**
 * Returns Genkit-compatible calculator tools with config applied.
 * @param genkit Genkit instance
 * @param config CalculatorConfig for retries/timeouts
 */
export function createGenkitCalculatorTools(genkit: Genkit, config: CalculatorConfig = {}) {
  const client = new CalculatorClient(config);
  return createGenkitTools(genkit, ...client.functions);
}
