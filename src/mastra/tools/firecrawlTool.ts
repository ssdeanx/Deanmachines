import { aiFunction, AIFunctionsProvider, getEnv } from "@agentic/core";
import { createMastraTools } from "./mastra";
import { z } from "zod";

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
 * Firecrawl client for web scraping, crawling, and data extraction.
 * Provides tools for converting websites into LLM-ready data.
 */
export class FirecrawlClient extends AIFunctionsProvider {
  private apiKey?: string;

  constructor(config: { apiKey?: string } = {}) {
    super();
    this.apiKey = config.apiKey;
  }

  @aiFunction({
    name: "firecrawl_scrape",
    description: "Scrape a single web page and convert it to LLM-ready formats like markdown or HTML.",
    inputSchema: z.object({
      url: z.string().describe("The URL to scrape"),
      formats: z.array(z.enum(["markdown", "html"])).optional()
        .default(["markdown"]).describe("Output formats to return"),
    }),
  })
  async scrapeWebpage({ url, formats }: { 
    url: string; 
    formats?: ("markdown" | "html")[];
  }) {
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey || getEnv("FIRECRAWL_API_KEY")}`,
        },
        body: JSON.stringify({
          url,
          formats: formats || ["markdown"],
        }),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Failed to scrape webpage",
      };
    }
  }

  @aiFunction({
    name: "firecrawl_crawl",
    description: "Crawl an entire website and all its subpages, converting content to LLM-ready formats.",
    inputSchema: z.object({
      url: z.string().describe("The website URL to crawl"),
      limit: z.number().int().min(1).max(100).optional()
        .default(10).describe("Maximum number of pages to crawl"),
      formats: z.array(z.enum(["markdown", "html"])).optional()
        .default(["markdown"]).describe("Output formats to return"),
    }),
  })
  async crawlWebsite({ url, limit, formats }: { 
    url: string; 
    limit?: number; 
    formats?: ("markdown" | "html")[];
  }) {
    try {
      // Submit the crawl job
      const submitResponse = await fetch("https://api.firecrawl.dev/v1/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey || getEnv("FIRECRAWL_API_KEY")}`,
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
        return {
          success: false,
          error: "Failed to start crawl job",
          details: jobData,
        };
      }

      // Poll for job completion (simplified polling strategy)
      const jobId = jobData.id;
      let jobComplete = false;
      let result;
      let attempts = 0;
      
      while (!jobComplete && attempts < 10) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        const statusResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${jobId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey || getEnv("FIRECRAWL_API_KEY")}`,
          },
        });
        
        result = await statusResponse.json();
        
        if (result.status === "completed" || result.status === "error") {
          jobComplete = true;
        }
      }
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Failed to crawl website",
      };
    }
  }

  @aiFunction({
    name: "firecrawl_map",
    description: "Get a map of all URLs on a website.",
    inputSchema: z.object({
      url: z.string().describe("The website URL to map"),
      search: z.string().optional().describe("Optional search term to filter URLs"),
    }),
  })
  async mapWebsite({ url, search }: { url: string; search?: string }) {
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey || getEnv("FIRECRAWL_API_KEY")}`,
        },
        body: JSON.stringify({
          url,
          ...(search && { search }),
        }),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      return {
        status: "error",
        error: error?.message || "Failed to map website",
        links: [],
      };
    }
  }

  @aiFunction({
    name: "firecrawl_extract",
    description: "Extract structured data from web pages using a schema or prompt.",
    inputSchema: z.object({
      urls: z.array(z.string()).describe("The URLs to extract data from (can include wildcards like domain.com/*)"),
      prompt: z.string().optional().describe("A prompt describing what data to extract"),
      schema: z.record(z.any()).optional().describe("JSON schema defining the structure of data to extract"),
    }),
  })
  async extractData({ urls, prompt, schema }: { 
    urls: string[]; 
    prompt?: string; 
    schema?: Record<string, any>; 
  }) {
    try {
      if (!prompt && !schema) {
        return {
          success: false,
          error: "Either prompt or schema must be provided",
        };
      }

      // Submit the extract job
      const submitResponse = await fetch("https://api.firecrawl.dev/v1/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey || getEnv("FIRECRAWL_API_KEY")}`,
        },
        body: JSON.stringify({
          urls,
          ...(prompt && { prompt }),
          ...(schema && { schema }),
        }),
      });

      const jobData = await submitResponse.json();
      
      if (!jobData.success || !jobData.id) {
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
      
      while (!jobComplete && attempts < 10) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        const statusResponse = await fetch(`https://api.firecrawl.dev/v1/extract/${jobId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey || getEnv("FIRECRAWL_API_KEY")}`,
          },
        });
        
        result = await statusResponse.json();
        
        if (result.status === "completed" || result.status === "error") {
          jobComplete = true;
        }
      }
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Failed to extract data",
      };
    }
  }
}

/**
 * Returns Firecrawl functions.
 * @param config Configuration including optional API key
 */
export function createFirecrawlTool(config: { apiKey?: string } = {}) {
  const client = new FirecrawlClient(config);
  return client.functions;
}

/**
 * Returns Mastra-compatible Firecrawl tools.
 * @param config Configuration including optional API key
 */
export function createMastraFirecrawlTools(config: { apiKey?: string } = {}) {
  const client = new FirecrawlClient(config);
  const mastraTools = createMastraTools(...client.functions);
  
  // Attach output schemas
  if (mastraTools.firecrawl_scrape) {
    (mastraTools.firecrawl_scrape as any).outputSchema = FirecrawlScrapeSchema;
  }
  if (mastraTools.firecrawl_crawl) {
    (mastraTools.firecrawl_crawl as any).outputSchema = FirecrawlCrawlSchema;
  }
  if (mastraTools.firecrawl_map) {
    (mastraTools.firecrawl_map as any).outputSchema = FirecrawlMapSchema;
  }
  if (mastraTools.firecrawl_extract) {
    (mastraTools.firecrawl_extract as any).outputSchema = FirecrawlExtractSchema;
  }
  
  return mastraTools;
}

export { createMastraTools };