import { createTool } from "@mastra/core/tools";
import { z } from 'zod';
import { TavilyClient } from "@agentic/tavily";
import { env } from "process";
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'tavily', level: 'info' });

/**
 * Configuration for Tavily search
 */
interface TavilyConfig {
  apiKey?: string;
}

/**
 * Creates a configured Tavily search tool
 *
 * Note: This function returns a standard Mastra tool that should be wrapped with
 * `createMastraTools` from @agentic/mastra when added to extraTools in index.ts.
 *
 * @param config - Configuration options for Tavily search
 * @returns A Mastra tool that should be wrapped with createMastraTools
 */
export function createTavilySearchTool(config: TavilyConfig = {}) {
  const tavily = new TavilyClient({
    apiKey: config.apiKey ?? env.TAVILY_API_KEY,
  });

  return createTool({
    id: "tavily-search",
    description: "Performs web searches using Tavily API",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
    }),
    outputSchema: z.object({
      results: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          content: z.string(),
        })
      ),
    }),
    execute: async ({ context }) => {
      logger.info('Starting Tavily search', { 
        query: context.query 
      });

      try {
        logger.debug('Calling Tavily API', { query: context.query });
        
        const response = await tavily.search(context.query);
        
        logger.info('Tavily search completed successfully', { 
          query: context.query,
          resultCount: response.results.length 
        });

        return { results: response.results };
      } catch (error) {
        logger.error('Tavily search failed', { 
          query: context.query,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });

        throw new Error(
          `Tavily search failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
  });
}
