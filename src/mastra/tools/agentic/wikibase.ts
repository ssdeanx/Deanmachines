import {
  aiFunction,
  AIFunctionsProvider,
  assert,
  getEnv,
  throttleKy,
} from "@agentic/core";
import { createMastraTools } from "@agentic/mastra";
import defaultKy, { type KyInstance } from "ky";
import pThrottle from "p-throttle";
import { z } from "zod";
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'wikipedia', level: 'info' });

// Allow up to 200 requests per second by default.
export const wikipediaThrottle = pThrottle({
  limit: 200,
  interval: 1000,
});

export interface WikipediaSearchOptions {
  query: string;
  limit?: number;
}

export interface WikipediaPageSearchResponse {
  pages: WikipediaPage[];
}

export interface WikipediaPage {
  id: number;
  key: string;
  title: string;
  matched_title: null;
  excerpt: string;
  description: null | string;
  thumbnail: WikipediaThumbnail | null;
}

export interface WikipediaThumbnail {
  url: string;
  width: number;
  height: number;
  mimetype: string;
  duration: null;
}

export interface WikipediaPageSummaryOptions {
  title: string;
  redirect?: boolean;
  acceptLanguage?: string;
}

export interface WikipediaPageSummaryResponse {
  ns?: number;
  index?: number;
  type: string;
  title: string;
  displaytitle: string;
  namespace: { id: number; text: string };
  wikibase_item: string;
  titles: { canonical: string; normalized: string; display: string };
  pageid: number;
  thumbnail: {
    source: string;
    width: number;
    height: number;
  };
  originalimage: {
    source: string;
    width: number;
    height: number;
  };
  lang: string;
  dir: string;
  revision: string;
  tid: string;
  timestamp: string;
  description: string;
  description_source: string;
  content_urls: {
    desktop: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
    mobile: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
  };
  extract: string;
  extract_html: string;
  normalizedtitle?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

// --- Zod Output Schemas for Wikipedia Tools (SCHEMA-WIKI-SEARCH, SCHEMA-WIKI-SUMMARY) ---
export const WikipediaThumbnailSchema = z.object({
  mimetype: z.string().optional(),
  size: z.number().int().nullable().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().nullable().optional(),
  url: z.string().url(),
}).nullable().optional();

export const WikipediaPageResultSchema = z.object({
  id: z.number().int(),
  key: z.string(),
  title: z.string(),
  excerpt: z.string(),
  matched_title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  thumbnail: WikipediaThumbnailSchema,
});

export const WikipediaSearchSchema = z.array(WikipediaPageResultSchema)
  .describe("Schema for the array of Wikipedia search results based on MediaWiki REST API");

const WikipediaImageSchema = z.object({
  source: z.string().url(),
  width: z.number().int(),
  height: z.number().int(),
}).optional();

const WikipediaContentUrlsSchema = z.object({
  page: z.string().url(),
  revisions: z.string().url(),
  edit: z.string().url(),
  talk: z.string().url(),
}).optional();

export const WikipediaSummarySchema = z.object({
  type: z.string().optional(),
  title: z.string(),
  displaytitle: z.string().optional(),
  namespace: z.object({ id: z.number().int(), text: z.string() }).optional(),
  wikibase_item: z.string().optional(),
  titles: z.object({ canonical: z.string(), normalized: z.string(), display: z.string() }).optional(),
  pageid: z.number().int().optional(),
  thumbnail: WikipediaImageSchema,
  originalimage: WikipediaImageSchema,
  lang: z.string().optional(),
  dir: z.string().optional(),
  revision: z.string().optional(),
  tid: z.string().optional(),
  timestamp: z.string().optional(),
  description: z.string().optional(),
  description_source: z.string().optional(),
  content_urls: z.object({
    desktop: WikipediaContentUrlsSchema,
    mobile: WikipediaContentUrlsSchema,
  }).optional(),
  extract: z.string(),
  extract_html: z.string().optional(),
  normalizedtitle: z.string().optional(),
  coordinates: z.object({ lat: z.number(), lon: z.number() }).optional(),
}).describe("Schema for Wikipedia page summary based on MediaWiki REST API");

/**
 * Basic Wikipedia API client for searching wiki pages and resolving page data.
 *
 * @see https://www.mediawiki.org/wiki/API
 */
export class WikipediaClient extends AIFunctionsProvider {
  protected readonly ky: KyInstance;
  protected readonly apiBaseUrl: string;
  protected readonly apiUserAgent: string;

  constructor({
    apiBaseUrl = getEnv("WIKIPEDIA_API_BASE_URL") ??
      "https://en.wikipedia.org/api/rest_v1",
    apiUserAgent = getEnv("WIKIPEDIA_API_USER_AGENT") ??
      "Agentic (https://github.com/transitive-bullshit/agentic)",
    throttle = true,
    ky = defaultKy,
  }: {
    apiBaseUrl?: string;
    apiUserAgent?: string;
    throttle?: boolean;
    ky?: KyInstance;
  } = {}) {
    assert(apiBaseUrl, 'WikipediaClient missing required "apiBaseUrl"');
    assert(apiUserAgent, 'WikipediaClient missing required "apiUserAgent"');
    super();

    this.apiBaseUrl = apiBaseUrl;
    this.apiUserAgent = apiUserAgent;

    const throttledKy = throttle ? (throttleKy(ky, wikipediaThrottle) as typeof ky) : ky;

    this.ky = throttledKy.extend({
      headers: {
        "api-user-agent": apiUserAgent,
      },
    });
  }

  /**
   * Searches Wikipedia for pages matching the given query. */
  @aiFunction({
    name: "wikipedia_search",
    description: "Searches Wikipedia for pages matching the given query.",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
    }),
  })
  async search({ query, ...opts }: WikipediaSearchOptions) {
    logger.info('Starting Wikipedia search', { 
      query, 
      limit: opts.limit 
    });

    try {
      logger.debug('Calling Wikipedia search API', { query });
      
      const result = await this.ky
        .get("https://en.wikipedia.org/w/rest.php/v1/search/page", {
          searchParams: { q: query, ...opts },
        })
        .json<WikipediaPageSearchResponse>();
      
      logger.info('Wikipedia search completed successfully', { 
        query,
        resultCount: result.pages.length,
        limit: opts.limit 
      });

      return result;
    } catch (error: unknown) {
      logger.error('Wikipedia search failed', { 
        query,
        limit: opts.limit,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }

  /**
   * Gets a summary of the given Wikipedia page.
   */
  @aiFunction({
    name: "wikipedia_get_page_summary",
    description: "Gets a summary of the given Wikipedia page.",
    inputSchema: z.object({
      title: z.string().describe("Wikipedia page title"),
      acceptLanguage: z
        .string()
        .optional()
        .default("en-us")
        .describe("Locale code for the language to use."),
    }),
  })
  async getPageSummary({
    title,
    acceptLanguage = "en-us",
    redirect = true,
    ...opts
  }: WikipediaPageSummaryOptions) {
    const originalTitle = title;
    title = title.trim().replace(/ /g, "_");

    logger.info('Starting Wikipedia page summary fetch', { 
      originalTitle,
      processedTitle: title,
      acceptLanguage,
      redirect 
    });

    try {
      logger.debug('Calling Wikipedia page summary API', { 
        title, 
        acceptLanguage 
      });

      const result = await this.ky
        .get(`page/summary/${title}`, {
          prefixUrl: this.apiBaseUrl,
          searchParams: { redirect, ...opts },
          headers: {
            "accept-language": acceptLanguage,
          },
        })
        .json<WikipediaPageSummaryResponse>();

      logger.info('Wikipedia page summary fetched successfully', { 
        originalTitle,
        processedTitle: title,
        pageId: result.pageid,
        extractLength: result.extract?.length || 0
      });

      return result;
    } catch (error: unknown) {
      logger.error('Wikipedia page summary fetch failed', { 
        originalTitle,
        processedTitle: title,
        acceptLanguage,
        redirect,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }
}

// Add interface for typing the mastra tools
interface MastraToolWithSchema {
  outputSchema?: unknown;
}

/**
 * Creates a configured Wikipedia client
 *
 * Note: This function returns a standard AIFunctionsProvider that should be
 * wrapped with `createMastraTools` from @agentic/mastra when added to extraTools in index.ts.
 *
 * @param config - Configuration options for the Wikipedia client
 * @returns A WikipediaClient instance
 */
export function createWikipediaClient(config: {
  apiBaseUrl?: string;
  apiUserAgent?: string;
  throttle?: boolean;
  ky?: KyInstance;
} = {}) {
  return new WikipediaClient(config);
}

/**
 * Helper function to create a Mastra-compatible Wikipedia client
 *
 * @param config - Configuration options for the Wikipedia client
 * @returns An array of Mastra-compatible tools
 */
export function createMastraWikipediaTools(config: {
  apiBaseUrl?: string;
  apiUserAgent?: string;
  throttle?: boolean;
  ky?: KyInstance;
} = {}) {
  const wikipediaClient = createWikipediaClient(config);
  const mastraTools = createMastraTools(wikipediaClient);
  
  // Patch outputSchema for each tool
  if (mastraTools.wikipedia_search) {
    (mastraTools.wikipedia_search as MastraToolWithSchema).outputSchema = WikipediaSearchSchema;
  }
  
  if (mastraTools.wikipedia_get_page_summary) {
    (mastraTools.wikipedia_get_page_summary as MastraToolWithSchema).outputSchema = WikipediaSummarySchema;
  }
  
  return mastraTools;
}


