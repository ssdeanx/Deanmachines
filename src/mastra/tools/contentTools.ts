/**
 * Content Tools Module
 *
 * This module defines tools that process content such as analyzing and formatting text.
 *
 * @module ContentTools
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Analyze Content Tool
 *
 * Analyzes the input content and returns analysis results.
 *
 * @remarks
 * Replace the stub analysis logic with a proper NLP or analysis algorithm.
 *
 * @param input.content - The text content to analyze.
 * @returns An object containing the analysis result.
 * @throws {Error} When analysis execution fails.
 */
export const analyzeContentTool = createTool({
  id: "analyze-content",
  description: "Analyzes content to extract insights and patterns.",
  inputSchema: z.object({
    content: z.string().min(1, "Content must not be empty").describe("Content to analyze."),
  }),
  outputSchema: z.object({
    analysis: z.unknown().describe("The result of the analysis."),
  }),
  execute: async ({ context }): Promise<{ analysis: unknown }> => {
    try {
      // Placeholder analysis: count words and characters.
      const wordCount = context.content.trim().split(/\s+/).length;
      const charCount = context.content.length;
      return { analysis: { wordCount, charCount } };
    } catch (error: unknown) {
      throw new Error(`analyzeContentTool execution failed: ${(error as Error).message}`);
    }
  },
});

/**
 * Format Content Tool
 *
 * Formats the input content into a specified structure.
 *
 * @remarks
 * Replace the stub formatting logic with your desired formatting operations.
 *
 * @param input.content - The text content to format.
 * @returns An object containing the formatted content.
 * @throws {Error} When formatting fails.
 */
export const formatContentTool = createTool({
  id: "format-content",
  description: "Formats content into a structured and clean format.",
  inputSchema: z.object({
    content: z.string().min(1, "Content must not be empty").describe("Content to format."),
  }),
  outputSchema: z.object({
    formattedContent: z.string().describe("The formatted content."),
  }),
  execute: async ({ context }): Promise<{ formattedContent: string }> => {
    try {
      // Example formatting: trim whitespace and normalize spacing.
      const formattedContent = context.content.trim().replace(/\s+/g, " ");
      return { formattedContent };
    } catch (error: unknown) {
      throw new Error(`formatContentTool execution failed: ${(error as Error).message}`);
    }
  },
});
