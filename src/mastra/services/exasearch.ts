/**
 * Exa Search service for Mastra AI.
 *
 * Provides utility functions to integrate Exa search capabilities
 * with Mastra agents and workflows.
 */

import Exa from "exa-js";
import { env } from "process";

/**
 * Configuration options for Exa search
 */
export interface ExaSearchConfig {
  /** API key for Exa (defaults to environment variable) */
  apiKey?: string;
  /** Number of search results to return */
  numResults?: number;
  /** Whether to use highlights in search results */
  useHighlights?: boolean;
  /** Whether to include query in search results */
  includeQuery?: boolean;
  /** Whether to include raw content in search results */
  includeRawContent?: boolean;
}

/**
 * Search result from Exa
 */
export interface ExaSearchResult {
  /** Title of the search result */
  title: string;
  /** URL of the search result */
  url: string;
  /** Text content of the search result */
  text: string;
  /** Highlighted text snippets (if enabled) */
  highlights?: string[];
  /** Score/relevance of the result */
  score?: number;
  /** Published date of the content (if available) */
  published?: string;
}

/**
 * Creates an Exa client with the provided configuration
 *
 * @param config - Configuration options for Exa
 * @returns An initialized Exa client
 */
export function createExaClient(config: ExaSearchConfig = {}) {
  const apiKey = config.apiKey || env.EXA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Exa API key is required. Set EXA_API_KEY environment variable or provide in config."
    );
  }

  return new Exa(apiKey);
}

/**
 * Performs a web search using Exa
 *
 * @param query - The search query
 * @param config - Configuration options for the search
 * @returns Array of search results
 */
export async function searchWeb(
  query: string,
  config: ExaSearchConfig = {}
): Promise<ExaSearchResult[]> {
  const exa = createExaClient(config);

  try {
    // Use the correct method signature for search based on exa-js documentation
    const searchResults = await exa.search(query, {
      numResults: config.numResults || 5,
      // The useHighlights property is not supported in RegularSearchOptions
    });

    // Get content for each result
    const resultsWithContent = await Promise.all(
      searchResults.results.map(async (result) => {
        try {
          // Use getContents with the correct parameter (ID from the result)
          const content = await exa.getContents([result.id]);
          const resultContent = content.results?.[0] || {};

          return {
            title: result.title || "",
            url: result.url,
            text: resultContent.text || "",
            highlights: [], // Exa SearchResult type doesn't include highlights
            score: result.score,
          };
        } catch (error) {
          console.warn(`Failed to get content for ${result.url}:`, error);
          return {
            title: result.title || "",
            url: result.url,
            text: "",
            highlights: [], // Exa SearchResult type doesn't include highlights
            score: result.score,
          };
        }
      })
    );

    return resultsWithContent;
  } catch (error) {
    console.error("Error performing Exa search:", error);
    throw error;
  }
}

/**
 * Performs a search with specific filters using Exa
 *
 * @param query - The search query
 * @param filters - Filters to apply to the search (e.g., site, date)
 * @param config - Configuration options for the search
 * @returns Array of search results
 */
export async function searchWithFilters(
  query: string,
  filters: {
    site?: string;
    startDate?: string;
    endDate?: string;
    recentOnly?: boolean;
  },
  config: ExaSearchConfig = {}
): Promise<ExaSearchResult[]> {
  const exa = createExaClient(config);

  try {
    // Set up search parameters
    const searchParams: any = {
      numResults: config.numResults || 5,
      // The useHighlights property is not supported in RegularSearchOptions
    };

    // Add filters if provided
    if (filters.site) {
      searchParams.site = filters.site;
    }

    if (filters.startDate) {
      searchParams.startPublishedDate = filters.startDate;
    }

    if (filters.endDate) {
      searchParams.endPublishedDate = filters.endDate;
    }

    if (filters.recentOnly) {
      // If recentOnly is true, set startPublishedDate to 30 days ago if not already set
      if (!searchParams.startPublishedDate) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        searchParams.startPublishedDate = thirtyDaysAgo
          .toISOString()
          .split("T")[0];
      }
    }

    // Use the correct method signature for search
    const searchResults = await exa.search(query, searchParams);

    // Get content for each result
    const resultsWithContent = await Promise.all(
      searchResults.results.map(async (result) => {
        try {
          // Use getContents with the correct parameter (ID from the result)
          const content = await exa.getContents([result.id]);
          const resultContent = content.results?.[0] || {};

          return {
            title: result.title || "",
            url: result.url,
            text: resultContent.text || "",
            highlights: [], // Exa SearchResult type doesn't include highlights
            score: result.score,
          };
        } catch (error) {
          console.warn(`Failed to get content for ${result.url}:`, error);
          return {
            title: result.title || "",
            url: result.url,
            text: "",
            highlights: [],
            score: result.score,
          };
        }
      })
    );

    return resultsWithContent;
  } catch (error) {
    console.error("Error performing filtered Exa search:", error);
    throw error;
  }
}

/**
 * Performs a search and returns results formatted for RAG (Retrieval Augmented Generation)
 *
 * @param query - The search query
 * @param config - Configuration options for the search
 * @returns Formatted text for RAG
 */
export async function searchForRAG(
  query: string,
  config: ExaSearchConfig = {}
): Promise<string> {
  const results = await searchWeb(query, {
    ...config,
    numResults: config.numResults || 3,
    useHighlights: true,
  });

  if (results.length === 0) {
    return "No search results found.";
  }

  // Format results for RAG
  let formattedResults = `Search results for: "${query}"\n\n`;

  results.forEach((result, index) => {
    formattedResults += `[${index + 1}] ${result.title}\n`;
    formattedResults += `URL: ${result.url}\n`;

    if (result.highlights && result.highlights.length > 0) {
      formattedResults += "Highlights:\n";
      result.highlights.forEach((highlight) => {
        formattedResults += `- ${highlight.trim()}\n`;
      });
    } else if (result.text) {
      // If no highlights but we have text, use a snippet
      const snippet =
        result.text.substring(0, 200).trim() +
        (result.text.length > 200 ? "..." : "");
      formattedResults += `Snippet: ${snippet}\n`;
    } else {
      formattedResults += `No content available for this result.\n`;
    }

    formattedResults += "\n";
  });

  return formattedResults;
}

/**
 * Example function showing how to use the Exa search service
 *
 * @param query - The search query
 * @returns Formatted search results
 */
export async function exampleSearch(query: string): Promise<string> {
  console.log(`Performing search for: ${query}`);

  try {
    // Basic search
    const basicResults = await searchWeb(query, { numResults: 2 });
    console.log(`Found ${basicResults.length} basic results`);

    // Filtered search (last 30 days)
    const filteredResults = await searchWithFilters(
      query,
      { recentOnly: true },
      { numResults: 2 }
    );
    console.log(`Found ${filteredResults.length} filtered results`);

    // RAG-formatted results
    const ragResults = await searchForRAG(query, { numResults: 3 });

    return ragResults;
  } catch (error) {
    console.error("Error in example search:", error);
    return `Error performing search: ${error.message}`;
  }
}
