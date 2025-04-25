import {
  aiFunction,
  AIFunctionsProvider,
  pruneEmpty,
  sanitizeSearchParams,
} from "@agentic/core";
import { XMLParser } from "fast-xml-parser";
import defaultKy, { type KyInstance } from "ky";
import { z } from "zod";
import fs from "fs-extra";
import path from "path";

import { castArray, getProp } from "./utils";
import { createMastraTools } from "@agentic/mastra";

export namespace arxiv {
  export const API_BASE_URL = "https://export.arxiv.org/api";

  export const SortType = {
    RELEVANCE: "relevance",
    LAST_UPDATED_DATE: "lastUpdatedDate",
    SUBMITTED_DATE: "submittedDate",
  } as const;

  export const SortOrder = {
    ASCENDING: "ascending",
    DESCENDING: "descending",
  } as const;

  export const FilterType = {
    ALL: "all",
    TITLE: "title",
    AUTHOR: "author",
    ABSTRACT: "abstract",
    COMMENT: "comment",
    JOURNAL_REFERENCE: "journal_reference",
    SUBJECT_CATEGORY: "subject_category",
    REPORT_NUMBER: "report_number",
  } as const;

  export type ValueOf<T extends NonNullable<unknown>> = T[keyof T];
  export const FilterTypeMapping: Record<ValueOf<typeof FilterType>, string> = {
    all: "all",
    title: "ti",
    author: "au",
    abstract: "abs",
    comment: "co",
    journal_reference: "jr",
    subject_category: "cat",
    report_number: "rn",
  };

  export const Separators = {
    AND: "+AND+",
    OR: "+OR+",
    ANDNOT: "+ANDNOT+",
  } as const;

  export interface ArXivResponse {
    totalResults: number;
    startIndex: number;
    itemsPerPage: number;
    entries: {
      id: string;
      title: string;
      summary: string;
      published: string;
      updated: string;
      authors: { name: string; affiliation: string[] }[];
      doi: string;
      comment: string;
      journalReference: string;
      primaryCategory: string;
      categories: string[];
      links: string[];
    }[];
  }

  export const extractId = (value: string) =>
    value
      .replace("https://arxiv.org/abs/", "")
      .replace("https://arxiv.org/pdf/", "")
      .replace(/v\d$/, "");

  const EntrySchema = z.object({
    field: z.nativeEnum(FilterType).default(FilterType.ALL),
    value: z.string().min(1),
  });

  export const SearchParamsSchema = z
    .object({
      ids: z.array(z.string().min(1)).optional(),
      searchQuery: z
        .union([
          z.string(),
          z.object({
            include: z
              .array(EntrySchema)
              .nonempty()
              .describe("Filters to include results."),
            exclude: z
              .array(EntrySchema)
              .optional()
              .describe("Filters to exclude results."),
          }),
        ])
        .optional(),
      start: z.number().int().min(0).default(0),
      maxResults: z.number().int().min(1).max(100).default(5),
    })
    .describe("Sorting by date is not supported.");
  export type SearchParams = z.infer<typeof SearchParamsSchema>;
}

/**
 * Lightweight wrapper around ArXiv for academic / scholarly research articles.
 *
 * @see https://arxiv.org
 */
export class ArXivClient extends AIFunctionsProvider {
  protected readonly ky: KyInstance;
  protected readonly apiBaseUrl: string;

  constructor({
    apiBaseUrl = arxiv.API_BASE_URL,
    ky = defaultKy,
  }: {
    apiKey?: string;
    apiBaseUrl?: string;
    ky?: KyInstance;
  }) {
    super();

    this.apiBaseUrl = apiBaseUrl;

    this.ky = ky.extend({
      prefixUrl: this.apiBaseUrl,
    });
  }

  /**
   * Searches for research articles published on arXiv.
   */
  @aiFunction({
    name: "arxiv_search",
    description: "Searches for research articles published on arXiv.",
    inputSchema: arxiv.SearchParamsSchema,
  })
  async search(queryOrOpts: string | arxiv.SearchParams) {
    const opts =
      typeof queryOrOpts === "string"
        ? ({ searchQuery: queryOrOpts } as arxiv.SearchParams)
        : queryOrOpts;

    if (!opts.ids?.length && !opts.searchQuery) {
      throw new Error(
        `The 'searchQuery' property must be non-empty if the 'ids' property is not provided.`
      );
    }

    const searchParams = sanitizeSearchParams({
      start: opts.start,
      max_results: opts.maxResults,
      id_list: opts.ids?.map(arxiv.extractId),
      search_query: opts.searchQuery
        ? typeof opts.searchQuery === "string"
          ? opts.searchQuery
          : [
              opts.searchQuery.include
                .map(
                  (tag) => `${arxiv.FilterTypeMapping[tag.field]}:${tag.value}`
                )
                .join(arxiv.Separators.AND),
              (opts.searchQuery.exclude ?? [])
                .map(
                  (tag) => `${arxiv.FilterTypeMapping[tag.field]}:${tag.value}`
                )
                .join(arxiv.Separators.ANDNOT),
            ]
              .filter(Boolean)
              .join(arxiv.Separators.ANDNOT)
        : undefined,
      sortBy: arxiv.SortType.RELEVANCE,
      sortOrder: arxiv.SortOrder.DESCENDING,
    });

    const responseText = await this.ky.get("query", { searchParams }).text();

    const parser = new XMLParser({
      allowBooleanAttributes: true,
      alwaysCreateTextNode: false,
      attributeNamePrefix: "@_",
      attributesGroupName: false,
      cdataPropName: "#cdata",
      ignoreAttributes: true,
      numberParseOptions: { hex: false, leadingZeros: true },
      parseAttributeValue: false,
      parseTagValue: true,
      preserveOrder: false,
      removeNSPrefix: true,
      textNodeName: "#text",
      trimValues: true,
      ignoreDeclaration: true,
    });

    const parsedData = parser.parse(responseText);

    let entries: Record<string, any>[] = getProp(
      parsedData,
      ["feed", "entry"],
      []
    );
    entries = castArray(entries);

    return {
      totalResults: Math.max(
        getProp(parsedData, ["feed", "totalResults"], 0),
        entries.length
      ),
      startIndex: getProp(parsedData, ["feed", "startIndex"], 0),
      itemsPerPage: getProp(parsedData, ["feed", "itemsPerPage"], 0),
      entries: entries.map((entry) =>
        pruneEmpty({
          id: arxiv.extractId(entry.id),
          url: entry.id,
          title: entry.title,
          summary: entry.summary,
          published: entry.published,
          updated: entry.updated,
          authors: castArray(entry.author)
            .filter(Boolean)
            .map((author: any) => ({
              name: author.name,
              affiliation: castArray(author.affiliation ?? []),
            })),
          doi: entry.doi,
          comment: entry.comment,
          journalReference: entry.journal_ref,
          primaryCategory: entry.primary_category,
          categories: castArray(entry.category).filter(Boolean),
          links: castArray(entry.link).filter(Boolean),
        })
      ),
    };
  }

  /**
   * Get the direct PDF URL for a given arXiv ID.
   */
  @aiFunction({
    name: "arxiv_pdf_url",
    description: "Get the direct PDF URL for a given arXiv ID.",
    inputSchema: z.object({ id: z.string().describe("arXiv identifier, e.g. 2101.00001") }),
  })
  async arxivPdfUrl({ id }: { id: string }) {
    return { url: `https://arxiv.org/pdf/${id}.pdf` };
  }

  /**
   * Download the PDF for a given arXiv ID and save it to disk.
   * @param id arXiv identifier (e.g. 2101.00001)
   * @param filePath Local file path to save the PDF
   */
  @aiFunction({
    name: "arxiv_download_pdf",
    description: "Download the PDF for a given arXiv ID and save it to disk.",
    inputSchema: z.object({
      id: z.string().describe("arXiv identifier, e.g. 2101.00001"),
      filePath: z.string().describe("Local file path to save the PDF"),
    }),
  })
  async arxiv_download_pdf({ id, filePath }: { id: string; filePath: string; }) {
    const url = `https://arxiv.org/pdf/${id}.pdf`;
    const response = await this.ky.get(url);
    const buffer = await response.arrayBuffer();
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, Buffer.from(buffer));
    return { filePath };
  }
}

// --- Explicit output schema for arxiv_search tool ---
export const ArxivSearchEntrySchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  summary: z.string(),
  published: z.string(),
  updated: z.string(),
  authors: z.array(z.object({
    name: z.string(),
    affiliation: z.array(z.string()),
  })),
  doi: z.string().optional(),
  comment: z.string().optional(),
  journalReference: z.string().optional(),
  primaryCategory: z.string().optional(),
  categories: z.array(z.string()),
  links: z.array(z.any()),
});

export const ArxivSearchOutputSchema = z.object({
  totalResults: z.number(),
  startIndex: z.number(),
  itemsPerPage: z.number(),
  entries: z.array(ArxivSearchEntrySchema),
});

// --- Output schema for PDF tool ---
export const ArxivPdfUrlOutputSchema = z.object({
  url: z.string().url(),
});

// --- Output schema for download tool ---
export const ArxivDownloadPdfOutputSchema = z.object({
  filePath: z.string(),
});

/**
 * Creates a configured ArXiv client
 *
 * Note: The returned client should be wrapped with `createMastraTools` from
 * @agentic/mastra when added to extraTools in index.ts.
 *
 * @param config - Configuration options for the ArXiv client
 * @returns An ArXiv client instance
 */
export function createArxivClient(config: {
  apiBaseUrl?: string;
  ky?: KyInstance;
} = {}) {
  return new ArXivClient(config);
}

/**
 * Helper function to create a Mastra-wrapped ArXiv client
 *
 * @param config - Configuration options for the ArXiv client
 * @returns An array of Mastra-compatible tools
 */
export function createMastraArxivTools(config: {
  apiBaseUrl?: string;
  ky?: KyInstance;
} = {}) {
  const arxivClient = createArxivClient(config);
  const mastraTools = createMastraTools(arxivClient);
  if (mastraTools.arxiv_search) {
    (mastraTools.arxiv_search as any).outputSchema = ArxivSearchOutputSchema;
  }
  if (mastraTools.arxiv_pdf_url) {
    (mastraTools.arxiv_pdf_url as any).outputSchema = ArxivPdfUrlOutputSchema;
  }
  if (mastraTools.arxiv_download_pdf) {
    (mastraTools.arxiv_download_pdf as any).outputSchema = ArxivDownloadPdfOutputSchema;
  }
  return mastraTools;
}

// Export adapter for convenience
export { createMastraTools };
