import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { BraveSearchClient } from "@agentic/brave-search";
import { env } from "process";
import { createMastraTools } from "@agentic/mastra";
/**
 * Configuration for Brave search
 */
interface BraveSearchConfig {
  apiKey?: string;
  maxResults?: number;
  timeout?: number;
}

/**
 * Creates a configured Brave search tool
 *
 * Note: This function returns a standard Mastra tool that should be wrapped with
 * `createMastraTools` from @agentic/mastra when added to extraTools in index.ts.
 *
 * @param config - Configuration options for the Brave search
 * @returns A Mastra tool that should be wrapped with createMastraTools
 */
export function createBraveSearchTool(config: BraveSearchConfig = {}) {
  const braveSearch = new BraveSearchClient({
    apiKey: config.apiKey ?? env.BRAVE_API_KEY,
  });

  return createTool({
    id: "brave-search",
    description: "Performs web searches using Brave Search API",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      maxResults: z
        .number()
        .optional()
        .default(10)
        .describe("Maximum number of results"),
    }),
    outputSchema: z.object({
      results: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          description: z.string(),
          score: z.number().optional(),
        })
      ),
    }),
    execute: async ({ context }) => {
      try {
        // BraveSearchClient.search only accepts query string
        const response = await braveSearch.search(context.query);

        // Filter results after receiving them
        const results = (response.web?.results || [])
          .slice(0, context.maxResults)
          .map((result) => ({
            title: result.title || "",
            url: result.url || "",
            description: result.description || "",
            // score is optional and not directly provided by this API result structure
          }));

        return { results };
      } catch (error) {
        console.error("Brave search error:", error);
        throw new Error(
          `Brave search failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
  });
}
