import { aiFunction, AIFunctionsProvider } from "@agentic/core";
import { z } from "zod";
import { createMastraTools } from "@agentic/mastra";
import { createLogger } from "@mastra/core/logger";

import {
  searchWeb,
  searchWithFilters,
  searchForRAG,
  type ExaSearchResult,
  type ExaSearchConfig as ExaConfig
} from "../services/exasearch";

// Export types for consumers
export type { ExaConfig as ExaSearchConfig, ExaSearchResult as ExaSearchResult };
const logger = createLogger({ name: "exa", level: "info" });


const ExaSearchInputSchema = z.object({
  query: z.string().describe("The search query to execute"),
  numResults: z.number().optional().default(5),
  filters: z
    .object({
      site: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      recentOnly: z.boolean().optional(),
    })
    .optional(),
  useRAG: z.boolean().optional().default(false),
});

export const ExaSearchOutputSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      text: z.string(),
      highlights: z.array(z.string()).optional(),
      score: z.number().optional(),
      published: z.string().optional(),
    })
  ),
  error: z.string().optional(),
});

type ExaSearchInput = z.infer<typeof ExaSearchInputSchema>;

/**
 * Provides Exa search functionality as an AI function provider.
 */
export class ExaSearchProvider extends AIFunctionsProvider {
  private readonly apiKey?: string;

  /**
   * Initializes the ExaSearchProvider.
   * @param {object} [config] - Configuration options.
   * @param {string} [config.apiKey] - The Exa API key. If not provided, it might be sourced from environment variables within the service layer.
   */
  constructor(config?: { apiKey?: string }) {
    super();
    this.apiKey = config?.apiKey;
  }

  /**
   * Performs web searches using the Exa search API with various filtering options.
   * @param input - The search parameters.
   * @returns An object containing the search results or an error message.
   */
  @aiFunction({
    name: "exa_search",
    description:
      "Performs web searches using Exa search API with various filtering options",
    inputSchema: ExaSearchInputSchema,
  })
  async search(
    input: ExaSearchInput
  ): Promise<{ results: ExaSearchResult[]; error?: string }> {
    const serviceConfig: ExaConfig = {
      apiKey: this.apiKey,
      numResults: input.numResults,
      useHighlights: input.useRAG,
    };
    try {
      let results: ExaSearchResult[];
      if (input.useRAG) {
        const ragText = await searchForRAG(input.query, serviceConfig);
        results = [{ title: "RAG Result", url: "", text: ragText }];
      } else if (input.filters) {
        results = await searchWithFilters(
          input.query,
          input.filters,
          serviceConfig
        );
      } else {
        results = await searchWeb(input.query, serviceConfig);
      }
      return { results };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error during search";
      logger.error(`[ExaSearch] Error in search: ${errorMessage}`, error);
      return {
        results: [],
        error: errorMessage,
      };
    }
  }
}

/**
 * Creates an instance of the ExaSearchProvider.
 *
 * @param {object} [config] - Optional configuration parameters.
 * @param {string} [config.apiKey] - The API key for Exa search.
 * @returns {ExaSearchProvider} An instance of ExaSearchProvider.
 */
export function createExaSearchProvider(config?: { apiKey?: string }): ExaSearchProvider {
  return new ExaSearchProvider(config);
}

/**
 * Helper function to create Mastra-compatible Exa search tools.
 *
 * This function creates an Exa search provider and wraps it with `createMastraTools`
 * to ensure compatibility with the Mastra framework, then patches the output schema.
 *
 * @returns {ReturnType<typeof createMastraTools>} An array of Mastra-compatible tools
 */
export function createMastraExaSearchTools(config?: { apiKey?: string }) {
  logger.info("[ExaSearch] Creating Mastra Exa search tools...");
  const exaSearchProvider = createExaSearchProvider(config);
  const mastraTools = createMastraTools(exaSearchProvider);
  logger.debug("[ExaSearch] Tools created by createMastraTools:", Object.keys(mastraTools));

  const toolToPatch = mastraTools?.exa_search;

  if (toolToPatch) {
    logger.info("[ExaSearch] Found 'exa_search' tool. Patching outputSchema...");
    (toolToPatch as any).outputSchema = ExaSearchOutputSchema;
    logger.debug("[ExaSearch] 'exa_search' outputSchema patched successfully.");
  } else {
    logger.warn("[ExaSearch] Could not find 'exa_search' tool in the object returned by createMastraTools. Output schema not patched.");
  }

  return mastraTools;
}

// Export adapter for convenience
export { createMastraTools };

// Default export for easier importing
export default createExaSearchProvider;
