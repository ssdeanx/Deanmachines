import {
  type AIFunctionLike,
  AIFunctionSet,
  asAgenticSchema,
  isZodSchema,
} from "@agentic/core";
import { createMastraTools } from "@agentic/mastra";
import { jsonSchema, tool } from "ai";

/**
 * Converts a set of Agentic stdlib AI functions to an object compatible with
 * the Vercel AI SDK's `tools` parameter.
 *
 * Note: This function returns AI SDK-compatible tools that should be wrapped with
 * `createMastraTools` from @agentic/mastra when added to extraTools in index.ts.
 *
 * @param aiFunctionLikeTools - Agentic functions to convert
 * @returns An object with AI SDK compatible tools
 */
export function createAISDKTools(...aiFunctionLikeTools: AIFunctionLike[]) {
  const fns = new AIFunctionSet(aiFunctionLikeTools);

  return Object.fromEntries(
    fns.map((fn) => [
      fn.spec.name,
      tool({
        description: fn.spec.description,
        parameters: isZodSchema(fn.inputSchema)
          ? fn.inputSchema
          : jsonSchema(asAgenticSchema(fn.inputSchema).jsonSchema),
        execute: fn.execute,
      }),
    ])
  );
}

/**
 * Helper function to create Mastra-compatible AI SDK tools
 *
 * @param aiFunctionLikeTools - Agentic functions to convert and adapt
 * @returns An array of Mastra-compatible tools
 */
export function createMastraAISDKTools(
  ...aiFunctionLikeTools: AIFunctionLike[]
) {
  // createMastraTools expects AIFunctionLike arguments directly
  return createMastraTools(...aiFunctionLikeTools);
}

// Export adapter for convenience
export { createMastraTools };
