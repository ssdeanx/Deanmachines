// filepath: c:\Users\dm\Documents\DeanmachinesAI\src\mastra\tools\document-tools.ts
/**
 * Document Tools Module
 *
 * This module defines tools that work with documents such as searching within repositories and embedding documents. These dont work
 * csv-reader, json-reader,  docx-reader, and other document-related tools.
 *
 * @module DocumentTools
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fetch from "node-fetch";
import * as extraFs from "fs-extra";
import mammoth from "mammoth";
import Papa from "papaparse";
import * as cheerio from "cheerio";
import { createLogger } from "@mastra/core/logger";
import { createAISpan, recordMetrics } from "../services/signoz";

const logger = createLogger({ name: "document-tools", level: process.env.LOG_LEVEL === "debug" ? "debug" : "info" });

/**
 * Document interface representing a searchable document.
 */
export interface Document {
  id: string;
  title: string;
  content: string;
}

/**
 * Simulated document repository.
 *
 * In a real application, replace this in-memory array with calls to a database or external API.
 */
const documentRepository: ReadonlyArray<Document> = [
  {
    id: "1",
    title: "Introduction to Mastra",
    content: "Mastra is a powerful framework for building document-driven applications.",
  },
  {
    id: "2",
    title: "Advanced Topics",
    content: "This document covers advanced topics in document search and embedding.",
  },
  {
    id: "3",
    title: "Getting Started",
    content: "Learn how to quickly get started with our platform using concise examples.",
  },
];

/**
 * Search Documents Tool
 *
 * Searches document repositories for documents matching the query criteria.
 *
 * @remarks
 * This implementation performs a case-insensitive search over the document titles and content.
 *
 * @param input.query - The search query string.
 * @returns An object containing an array of found documents.
 * @throws {Error} When the search execution fails.
 */
export const searchDocumentsTool = createTool({
  id: "search-documents",
  description: "Searches for documents in repositories based on a query.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1, "Query cannot be empty")
      .describe("The search query string."),
  }),
  outputSchema: z.object({
    documents: z
      .array(
        z.object({
          id: z.string().describe("Document id"),
          title: z.string().describe("Document title"),
          content: z.string().describe("Document content"),
        })
      )
      .describe("Array of found documents."),
  }),
  execute: async ({ context }): Promise<{ documents: Document[] }> => {
    try {
      // Extract the query and sanitize it for case insensitive search.
      const { query } = context;
      const lowerQuery = query.toLowerCase();

      // Filter the repository for documents where either the title or content includes the query.
      const foundDocuments = documentRepository.filter(
        (doc) =>
          doc.title.toLowerCase().includes(lowerQuery) ||
          doc.content.toLowerCase().includes(lowerQuery)
      );

      return { documents: foundDocuments };
    } catch (error: unknown) {
      throw new Error(`searchDocumentsTool execution failed: ${(error as Error).message}`);
    }
  },
});

/**
 * Embed Document Tool
 *
 * Generates an embedding vector representing the document content.
 *
 * @remarks
 * Replace the stub embedding logic with an actual embedding generator (e.g., a neural network model).
 *
 * @param input.document - The text content of the document.
 * @returns An object containing the embedding vector.
 * @throws {Error} When embedding computation fails.
 */
export const embedDocumentTool = createTool({
  id: "embed-document",
  description: "Generates an embedding vector for a document.",
  inputSchema: z.object({
    document: z.string().min(1, "Document content must not be empty").describe("The document content to embed."),
  }),
  outputSchema: z.object({
    embedding: z.array(z.number()).describe("The embedding vector."),
  }),
  execute: async ({ context }): Promise<{ embedding: number[] }> => {
    try {
      // Example stub: simple transformation using character codes.
      const embedding = Array.from(context.document).map((char) => char.charCodeAt(0));
      return { embedding };
    } catch (error: unknown) {
      throw new Error(`embedDocumentTool execution failed: ${(error as Error).message}`);
    }
  },
});

/**
 * Fetch and Extract Document Tool (REMOVED: unreliable PDF extraction and platform issues)
 */
/*
export const fetchAndExtractDocumentTool = createTool({
  id: "fetch-extract-document",
  description: "(REMOVED) Fetches a document from a URL and extracts its text (PDF or HTML).",
  inputSchema: z.object({
    url: z.string().url().describe("The URL of the document (PDF or HTML)."),
  }),
  outputSchema: z.object({
    text: z.string().describe("Extracted text content from the document."),
    contentType: z.string().optional(),
  }),
  execute: async ({ context }) => {
    // This tool is removed due to unreliable PDF extraction and platform issues.
    return { text: "", contentType: undefined };
  },
});
*/

/**
 * PDF Reader Tool (DISABLED: pdf-parse issues on Windows/ENOENT)
 */
/*
import pdfParse from "pdf-parse";
export const pdfReaderTool = createTool({
  id: "pdf-reader-disabled",
  description: "(DISABLED) Reads and extracts text and metadata from a PDF file. (pdf-parse issues on Windows)",
  inputSchema: z.object({
    filePath: z.string().describe("Path to the PDF file."),
  }),
  outputSchema: z.object({
    text: z.string().describe("Extracted text from the PDF."),
    pdf: z.any().describe("Full PDF metadata object from pdf-parse."),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    // This tool is disabled due to persistent ENOENT errors with pdf-parse on Windows.
    return { text: "", pdf: null, error: "PDF reader is disabled due to platform issues." };
  },
});
*/

/**
 * DOCX Reader Tool
 *
 * Reads and extracts text from a DOCX (Word) file.
 *
 * @param input.filePath - Path to the DOCX file.
 * @returns An object containing the extracted text.
 * @throws {Error} When reading or extraction fails.
 */
export const docxReaderTool = createTool({
  id: "docx-reader",
  description: "Reads and extracts text from a DOCX (Word) file.",
  inputSchema: z.object({
    filePath: z.string().describe("Path to the DOCX file."),
  }),
  outputSchema: z.object({
    text: z.string().describe("Extracted text from the DOCX file."),
  }),
  execute: async ({ context }) => {
    const { filePath } = context;
    if (!(await extraFs.exists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }
    const buffer = await extraFs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value };
  },
});

/**
 * CSV Reader Tool
 *
 * Reads and parses a CSV file.
 *
 * @param input.filePath - Path to the CSV file.
 * @returns An object containing the parsed CSV data.
 * @throws {Error} When reading or parsing fails.
 */
export const csvReaderTool = createTool({
  id: "csv-reader",
  description: "Reads and parses a CSV file.",
  inputSchema: z.object({
    filePath: z.string().describe("Path to the CSV file."),
  }),
  outputSchema: z.object({
    data: z.array(z.record(z.string(), z.any())).describe("Parsed CSV data as array of objects."),
  }),
  execute: async ({ context }) => {
    const { filePath } = context;
    if (!(await extraFs.exists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }
    const csvString = await extraFs.readFile(filePath, "utf8");
    const result = Papa.parse(csvString, { header: true });
    return { data: result.data as Record<string, any>[] };
  },
});

/**
 * JSON Reader Tool
 *
 * Reads and parses a JSON file.
 *
 * @param input.filePath - Path to the JSON file.
 * @returns An object containing the parsed JSON data.
 * @throws {Error} When reading or parsing fails.
 */
export const jsonReaderTool = createTool({
  id: "json-reader",
  description: "Reads and parses a JSON file.",
  inputSchema: z.object({
    filePath: z.string().describe("Path to the JSON file."),
  }),
  outputSchema: z.object({
    data: z.any().describe("Parsed JSON data."),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { filePath } = context;
    try {
      if (!(await extraFs.exists(filePath))) {
        return { data: null, error: `File not found: ${filePath}` };
      }
      const jsonString = await extraFs.readFile(filePath, "utf8");
      const data = JSON.parse(jsonString);
      return { data };
    } catch (error) {
      return { data: null, error: (error as Error).message };
    }
  },
});

/**
 * Extract HTML Text Tool
 *
 * Extracts visible text from HTML using cheerio, with tracing and logging.
 *
 * @param input.html - HTML content to extract text from.
 * @param input.url - Optional: URL to fetch HTML from.
 * @returns An object containing the extracted visible text.
 * @throws {Error} When extraction fails.
 */
export const extractHtmlTextTool = createTool({
  id: "extract-html-text",
  description: "Extracts visible text from HTML using cheerio, with tracing and logging.",
  inputSchema: z.object({
    html: z.string().describe("HTML content to extract text from."),
    url: z.string().url().optional().describe("Optional: URL to fetch HTML from."),
  }),
  outputSchema: z.object({
    text: z.string().describe("Extracted visible text from the HTML body."),
  }),
  execute: async ({ context }) => {
    const span = createAISpan("extractHtmlTextTool.execute");
    try {
      let html = context.html;
      if (!html && context.url) {
        logger.info(`Fetching HTML from URL: ${context.url}`);
        const response = await fetch(context.url);
        if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText}`);
        html = await response.text();
      }
      if (!html) throw new Error("No HTML content provided or fetched.");
      logger.info("Extracting text from HTML using cheerio");
      const $ = cheerio.load(html);
      const text = $("body").text();
      recordMetrics(span, { status: "success" });
      return { text };
    } catch (error) {
      logger.error(`extractHtmlTextTool error: ${error instanceof Error ? error.message : String(error)}`);
      recordMetrics(span, { status: "error", errorMessage: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      span.end();
    }
  },
});
