import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { GoogleCustomSearchClient } from "@agentic/google-custom-search"; // Fixed: correct client name
import { env } from "process";
import { createMastraTools } from "@agentic/mastra";
/**
 * Configuration for Google Custom Search
 */
interface GoogleSearchConfig {
  apiKey?: string;
  searchEngineId?: string;
  maxResults?: number;
  timeout?: number;
}

/**
 * Creates a configured Google Custom Search tool
 *
 * Note: This function returns a standard Mastra tool that should be wrapped with
 * `createMastraTools` from @agentic/mastra when added to extraTools in index.ts.
 *
 * @param config - Configuration options for Google Custom Search
 * @returns A Mastra tool that should be wrapped with createMastraTools
 */
export function createGoogleSearchTool(config: GoogleSearchConfig = {}) {
  const googleSearch = new GoogleCustomSearchClient({
    apiKey: config.apiKey ?? env.GOOGLE_CSE_KEY,
    cseId: config.searchEngineId ?? env.GOOGLE_CSE_ID, // Fixed: property name is cseId
  });

  return createTool({
    id: "google-search",
    description: "Performs web searches using Google Custom Search API",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      maxResults: z.number().optional().describe("Maximum number of results"),
      safeSearch: z.enum(["off", "medium", "high"]).optional(),
    }),
    outputSchema: z.object({
      results: z.array(
        z.object({
          title: z.string(),
          link: z.string(),
          snippet: z.string(),
          image: z.string().optional(),
        })
      ),
    }),
    execute: async ({ context }) => {
      try {
        // Updated to match correct search parameters - search method expects only query
        // Options like num and safe might need to be handled post-retrieval or
        // might not be directly supported by this client's search method signature.
        const results = await googleSearch.search(context.query);

        // Manually limit results if maxResults is provided
        const limitedItems = context.maxResults
          ? results.items.slice(0, context.maxResults)
          : results.items;

        // Note: Safe search filtering needs to be configured in the CSE control panel
        // or handled by filtering results if the API/client doesn't support it directly.

        return { results: limitedItems };
      } catch (error) {
        throw new Error(
          `Google search failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
  });
}
