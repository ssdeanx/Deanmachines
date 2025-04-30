// filepath: src/mastra/tools/firecrawlTool.ts
/**
 * Firecrawl Tools Module
 *
 * This module defines tools for web scraping, crawling, and data extraction
 * using the Firecrawl API.
 *
 * @module FirecrawlTools
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "firecrawl-tools", level: process.env.LOG_LEVEL === "debug" ? "debug" : "info" });

/**
 * Output schema for Firecrawl scrape results
 */
export const FirecrawlScrapeSchema = z.object({
  success: z.boolean(),
  data: z.object({
    markdown: z.string().optional(),
    html: z.string().optional(),
    metadata: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      language: z.string().optional(),
      sourceURL: z.string().optional(),
      statusCode: z.number().optional(),
    }).optional(),
  }).optional(),
});

/**
 * Output schema for Firecrawl crawl results
 */
export const FirecrawlCrawlSchema = z.object({
  status: z.string(),
  total: z.number().optional(),
  creditsUsed: z.number().optional(),
  data: z.array(z.object({
    markdown: z.string().optional(),
    html: z.string().optional(),
    metadata: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      language: z.string().optional(),
      sourceURL: z.string().optional(),
      statusCode: z.number().optional(),
    }).optional(),
  })).optional(),
}).optional();

/**
 * Output schema for Firecrawl map results
 */
export const FirecrawlMapSchema = z.object({
  status: z.string(),
  links: z.array(z.string()),
});

/**
 * Output schema for Firecrawl extract results
 */
export const FirecrawlExtractSchema = z.object({
  success: z.boolean(),
  data: z.record(z.string(), z.any()),
});

/**
 * Helper to get the API key from environment or config
 */
function getApiKey(configApiKey?: string): string {
  const apiKey = configApiKey || process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("Firecrawl API key is required. Set FIRECRAWL_API_KEY environment variable or pass in config.");
  }
  return apiKey;
}

/**
 * Scrape Webpage Tool
 * 
 * Scrapes a single web page and converts it to LLM-ready formats like markdown or HTML.
 * 
 * @param input.url - The URL to scrape
 * @param input.formats - Output formats to return (markdown, html)
 * @returns Scraped content in requested formats
 */
export const scrapeWebpageTool = createTool({
  id: "firecrawl-scrape",
  description: "Scrape a single web page and convert it to LLM-ready formats like markdown or HTML.",
  inputSchema: z.object({
    url: z.string().describe("The URL to scrape"),
    formats: z.array(z.enum(["markdown", "html"])).optional()
      .default(["markdown"]).describe("Output formats to return"),
    apiKey: z.string().optional().describe("Optional Firecrawl API key (falls back to FIRECRAWL_API_KEY env var)"),
  }),
  execute: async ({ context }) => {
    try {
      const { url, formats, apiKey: configApiKey } = context;
      const apiKey = getApiKey(configApiKey);
      
      logger.info(`Scraping webpage: ${url}`);
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          formats: formats || ["markdown"],
        }),
      });

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      logger.error(`scrapeWebpageTool error: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error)?.message || "Failed to scrape webpage",
      };
    }
  },
});

/**
 * Crawl Website Tool
 * 
 * Crawls an entire website and all its subpages, converting content to LLM-ready formats.
 * 
 * @param input.url - The website URL to crawl
 * @param input.limit - Maximum number of pages to crawl
 * @param input.formats - Output formats to return (markdown, html)
 * @returns Crawled content from multiple pages in requested formats
 */
export const crawlWebsiteTool = createTool({
  id: "firecrawl-crawl",
  description: "Crawl an entire website and all its subpages, converting content to LLM-ready formats.",
  inputSchema: z.object({
    url: z.string().describe("The website URL to crawl"),
    limit: z.number().int().min(1).max(100).optional()
      .default(10).describe("Maximum number of pages to crawl"),
    formats: z.array(z.enum(["markdown", "html"])).optional()
      .default(["markdown"]).describe("Output formats to return"),
    apiKey: z.string().optional().describe("Optional Firecrawl API key (falls back to FIRECRAWL_API_KEY env var)"),
  }),
  execute: async ({ context }) => {
    try {
      const { url, limit, formats, apiKey: configApiKey } = context;
      const apiKey = getApiKey(configApiKey);
      
      logger.info(`Crawling website: ${url}, limit: ${limit}`);
      // Submit the crawl job
      const submitResponse = await fetch("https://api.firecrawl.dev/v1/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          limit: limit || 10,
          scrapeOptions: {
            formats: formats || ["markdown"],
          },
        }),
      });

      const jobData = await submitResponse.json();
      
      if (!jobData.success || !jobData.id) {
        logger.error(`Failed to start crawl job: ${JSON.stringify(jobData)}`);
        return {
          success: false,
          error: "Failed to start crawl job",
          details: jobData,
        };
      }

      // Poll for job completion (simplified polling strategy)
      const jobId = jobData.id;
      let jobComplete = false;
      let result: z.infer<typeof FirecrawlCrawlSchema> | undefined;
      let attempts = 0;
      
      logger.info(`Crawl job started with ID: ${jobId}, polling for completion...`);
      while (!jobComplete && attempts < 10) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        const statusResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${jobId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
        });
        
        result = await statusResponse.json();
        logger.debug(`Crawl job status (attempt ${attempts}): ${result?.status}`);
        
        if (result && (result.status === "completed" || result.status === "error")) {
          jobComplete = true;
        }
      }
      
      return result;
    } catch (error: unknown) {
      logger.error(`crawlWebsiteTool error: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error)?.message || "Failed to crawl website",
      };
    }
  },
});

/**
 * Map Website Tool
 * 
 * Gets a map of all URLs on a website.
 * 
 * @param input.url - The website URL to map
 * @param input.search - Optional search term to filter URLs
 * @returns Map of URLs found on the website
 */
export const mapWebsiteTool = createTool({
  id: "firecrawl-map",
  description: "Get a map of all URLs on a website.",
  inputSchema: z.object({
    url: z.string().describe("The website URL to map"),
    search: z.string().optional().describe("Optional search term to filter URLs"),
    apiKey: z.string().optional().describe("Optional Firecrawl API key (falls back to FIRECRAWL_API_KEY env var)"),
  }),
  execute: async ({ context }) => {
    try {
      const { url, search, apiKey: configApiKey } = context;
      const apiKey = getApiKey(configApiKey);
      
      logger.info(`Mapping website: ${url}`);
      const response = await fetch("https://api.firecrawl.dev/v1/map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          ...(search && { search }),
        }),
      });

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      logger.error(`mapWebsiteTool error: ${(error as Error).message}`);
      return {
        status: "error",
        error: (error as Error)?.message || "Failed to map website",
        links: [],
      };
    }
  },
});

/**
 * Extract Data Tool
 * 
 * Extracts structured data from web pages using a schema or prompt.
 * 
 * @param input.urls - The URLs to extract data from (can include wildcards like domain.com/*)
 * @param input.prompt - A prompt describing what data to extract
 * @param input.schema - JSON schema defining the structure of data to extract
 * @returns Extracted structured data
 */
export const extractDataTool = createTool({
  id: "firecrawl-extract",
  description: "Extract structured data from web pages using a schema or prompt.",
  inputSchema: z.object({
    urls: z.array(z.string()).describe("The URLs to extract data from (can include wildcards like domain.com/*)"),
    prompt: z.string().optional().describe("A prompt describing what data to extract"),
    schema: z.record(z.any()).optional().describe("JSON schema defining the structure of data to extract"),
    apiKey: z.string().optional().describe("Optional Firecrawl API key (falls back to FIRECRAWL_API_KEY env var)"),
  }),
  execute: async ({ context }) => {
    try {
      const { urls, prompt, schema, apiKey: configApiKey } = context;
      const apiKey = getApiKey(configApiKey);
      
      if (!prompt && !schema) {
        return {
          success: false,
          error: "Either prompt or schema must be provided",
        };
      }

      logger.info(`Extracting data from ${urls.length} URLs`);
      // Submit the extract job
      const submitResponse = await fetch("https://api.firecrawl.dev/v1/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          urls,
          ...(prompt && { prompt }),
          ...(schema && { schema }),
        }),
      });

      const jobData = await submitResponse.json();
      
      if (!jobData.success || !jobData.id) {
        logger.error(`Failed to start extract job: ${JSON.stringify(jobData)}`);
        return {
          success: false,
          error: "Failed to start extract job",
          details: jobData,
        };
      }

      // Poll for job completion (simplified polling strategy)
      const jobId = jobData.id;
      let jobComplete = false;
      let result;
      let attempts = 0;
      
      logger.info(`Extract job started with ID: ${jobId}, polling for completion...`);
      while (!jobComplete && attempts < 10) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        const statusResponse = await fetch(`https://api.firecrawl.dev/v1/extract/${jobId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
        });
        
        result = await statusResponse.json();
        logger.debug(`Extract job status (attempt ${attempts}): ${result.status}`);
        
        if (result.status === "completed" || result.status === "error") {
          jobComplete = true;
        }
      }
      
      return result;
    } catch (error: unknown) {
      logger.error(`extractDataTool error: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error)?.message || "Failed to extract data",
      };
    }
  },
});

/**
 * Exports all Firecrawl tools as a collection.
 */
export const firecrawlTools = {
  scrapeWebpageTool,
  crawlWebsiteTool,
  mapWebsiteTool,
  extractDataTool,
};