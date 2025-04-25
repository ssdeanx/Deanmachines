import {
  type AIFunctionLike,
  AIFunctionSet,
  asZodOrJsonSchema,
} from "@agentic/core";
import { createMastraTools } from "@agentic/mastra";
import { FunctionTool } from "llamaindex";
import { z } from "zod";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "llama-index-tool", level: "info" });

/**
 * Output schema for LlamaIndex query tool
 */
export const LlamaIndexQueryOutputSchema = z.object({
  result: z.string(),
  sources: z.array(z.string()).optional(),
});

/**
 * Converts a set of Agentic stdlib AI functions to an array of LlamaIndex-compatible tools.
 *
 * Note: The returned tools should be wrapped with `createMastraTools` from
 * @agentic/mastra when added to extraTools in index.ts like:
 * `extraTools.push(...createMastraTools(...llamaIndexArray));`
 *
 * @param aiFunctionLikeTools - Agentic functions to convert to LlamaIndex tools
 * @returns An array of LlamaIndex compatible tools
 */
export function createLlamaIndexTools(...aiFunctionLikeTools: AIFunctionLike[]): FunctionTool<any, any, any>[] {
  const fns = new AIFunctionSet(aiFunctionLikeTools);
  return fns.map((fn) => {
    // Ensure the input schema is properly validated before execution
    if (!fn.inputSchema) {
      throw new Error(`Input schema is missing for function: ${fn.spec.name}`);
    }
    // Async wrapper for execution with error handling and logging
    const asyncExecute = async (...args: any[]): Promise<any> => {
      const start = performance.now();
      try {
        logger.info(`[LlamaIndexTool] Executing: ${fn.spec.name}`, { args });
        fn.inputSchema.parse(args[0]);
        let output = await fn.execute(args[0]);
        if (fn.spec.name === "llamaindex_query") {
          output = LlamaIndexQueryOutputSchema.parse(output);
        }
        logger.info(`[LlamaIndexTool] Success: ${fn.spec.name}`, {
          durationMs: performance.now() - start,
          output,
        });
        return output; // <-- Patch: return schema-compatible output only
      } catch (error: unknown) {
        logger.error(`[LlamaIndexTool] Error: ${fn.spec.name}`, {
          error,
          durationMs: performance.now() - start,
        });
        throw new Error(error instanceof Error ? error.message : String(error));
      }
    };
    const tool = FunctionTool.from(asyncExecute, {
      name: fn.spec.name,
      description: fn.spec.description,
      parameters: asZodOrJsonSchema(fn.inputSchema) as any,
    });
    // Patch output schema for all tools
    (tool as any).outputSchema =
      fn.spec.name === "llamaindex_query"
        ? LlamaIndexQueryOutputSchema
        : (fn as any).outputSchema || z.any();
    return tool;
  });
}

/**
 * Helper function to create Mastra-compatible LlamaIndex tools
 *
 * @param aiFunctionLikeTools - Agentic functions to convert and adapt
 * @returns An array of Mastra-compatible tools
 */
export function createMastraLlamaIndexTools(
  ...aiFunctionLikeTools: AIFunctionLike[]
): ReturnType<typeof createMastraTools> {
  return createMastraTools(...aiFunctionLikeTools);
}

/**
 * Creates a QueryEngine tool for LlamaIndex.
 * @param queryEngine - The query engine instance.
 * @param options - Optional settings like name, description, and returnDirect flag.
 * @returns A LlamaIndex QueryEngine tool.
 */
export function createLlamaIndexQueryTool(
  queryEngine: { query: (query: string) => Promise<any> },
  options?: { name?: string; description?: string; returnDirect?: boolean }
): FunctionTool<any, any, any> {
  // Robust, observable, schema-validated wrapper for LlamaIndex query engine
  const asyncExecute = async (input: { query: string }) => {
    const start = performance.now();
    try {
      logger.info("[LlamaIndexQueryTool] Executing", { input });
      if (!input || typeof input.query !== "string") throw new Error("Missing or invalid 'query' input");
      const result = await queryEngine.query(input.query);
      const output = LlamaIndexQueryOutputSchema.parse(result);
      logger.info("[LlamaIndexQueryTool] Success", {
        durationMs: performance.now() - start,
        output,
      });
      return output; // <-- must return schema-compatible result
    } catch (error: any) {
      logger.error("[LlamaIndexQueryTool] Error", {
        error,
        durationMs: performance.now() - start,
      });
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  };
  const tool = FunctionTool.from(asyncExecute, {
    name: options?.name ?? "llamaindex_query",
    description: options?.description ?? "A query engine tool powered by LlamaIndex.",
    parameters: z.object({ query: z.string() }),
    // outputSchema: LlamaIndexQueryOutputSchema, // Uncomment if FunctionTool.from supports this
  });
  (tool as any).outputSchema = LlamaIndexQueryOutputSchema;
  return tool;
}