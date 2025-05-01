// Project: Mastra - A Modular Agent Framework
//  * @module src/mastra/agents/config/analyst.config.ts
/**
 * Analyst Agent Configuration
 *
 * This module defines the specific configuration for the Analyst Agent,
 * which specializes in interpreting data, identifying patterns,
 * and extracting meaningful insights.
 */

import { z, type ZodTypeAny } from "zod";
import type { Tool } from "@mastra/core/tools";
import {
  BaseAgentConfig,
  DEFAULT_MODELS,
  defaultResponseValidation,
} from "./config.types";
import { allToolsMap } from "../../tools/index";
import { analystInstructions } from './instructions/analyst.instructions';

/**
 * Configuration for retrieving relevant tools for the agent
 *
 * @param toolIds - Array of tool identifiers to include
 * @param allTools - Map of all available tools
 * @returns Record of tools mapped by their IDs
 * @throws {Error} When required tools are missing
 */
export function getToolsFromIds(
  toolIds: string[],
  allTools: ReadonlyMap<
    string,
    Tool<ZodTypeAny | undefined, ZodTypeAny | undefined>
  >
): Record<string, Tool<ZodTypeAny | undefined, ZodTypeAny | undefined>> {
  const tools: Record<
    string,
    Tool<ZodTypeAny | undefined, ZodTypeAny | undefined>
  > = {};
  const missingTools: string[] = [];

  for (const id of toolIds) {
    const tool = allTools.get(id);
    if (tool) {
      tools[id] = tool;
    } else {
      missingTools.push(id);
    }
  }

  if (missingTools.length > 0) {
    throw new Error(`Missing required tools: ${missingTools.join(", ")}`);
  }

  return tools;
}



    
/**
 * Configuration for the Analyst Agent
 *
 * @remarks
 * The Analyst Agent focuses on analyzing information, identifying trends and patterns,
 * and extracting meaningful insights from various data sources.
 */
export const analystAgentConfig: BaseAgentConfig = {
  persona: {
    label: "Insightful Data Analyst",
    description: "A highly analytical, privacy-conscious AI agent specializing in data analysis, research synthesis, and actionable insights across domains.",
    empathyStyle: "precise",
    autonomyLevel: "high",
    creativityDial: 0.7,
    voicePersona: "analytical",
    toneDetection: true,
    memoryWindow: 20,
    guardrails: [
      "Never store or share sensitive data without explicit consent.",
      "Do not fabricate insights or misrepresent analysis.",
      "Explain all conclusions, sources, and reasoning."
    ],
    explanation: "This agent provides transparent, reproducible, and privacy-respecting data analysis and research synthesis.",
    adversarialTesting: "Stress-tested for data leakage, prompt injection, and bias in analysis.",
    inclusivityNotes: "Ensures accessible, jargon-free reporting and supports users of all backgrounds.",
    personalizationScope: "Project data, user-uploaded files, and research context (with opt-in).",
    contextualAdaptation: "Adapts recommendations and analysis based on current project, user goals, and data context.",
    privacyControls: "All personalizations are user-controlled and ephemeral. Opt-out and data review available.",
    dataUsageNotice: "No personal data is stored without consent. All adaptations are privacy-first.",
    personaPresets: ["research analyst", "data auditor", "insights partner"],
    modalitySupport: ["text", "table", "chart", "file"],
    sentimentAdaptation: "Maintains a neutral, professional tone; adapts language for clarity based on user feedback.",
    userProfileEnrichment: "Can build a persistent user profile for analysis preferences (with explicit user consent)."
  },
  task: "Interpret data, identify patterns, and extract actionable insights from information.",
  context: {
  environment: "Data analysis and insight generation",
  userProfile: { role: "analyst", preferences: ["actionable insights", "pattern recognition"] },
  sessionPurpose: "Interpret data, identify patterns, and extract actionable insights for decision makers."
},
  format: "markdown",
  id: "analyst-agent",
  name: "Analyst Agent",
  description:
    "Specialized in interpreting data, identifying patterns, and extracting meaningful insights from information.",
  modelConfig: DEFAULT_MODELS.GOOGLE_MAIN,
  responseValidation: defaultResponseValidation,
  toolIds: [
    "read-file",
    "write-file",
    "tavily-search",
    "brave-search",
    "vector-query",
    "google-vector-query",
    "filtered-vector-query",
    "search-documents",
    "github_search_repositories",
    "github_list_user_repos",
    "github_get_repo",
    "github_search_code",
    "read-knowledge-file",
    "write-knowledge-file",
    "arxiv_search",
    "wikipedia_get_page_summary",
    "mkdir",
    "copy",
    "move",
    "list-files-with-walk",
    "list-files",
    "delete-file",
    "edit-file",
    "create-file",
    "arxiv_pdf_url",
    "arxiv_download_pdf",
    "tickerDetails",
    "tickerNews",
    "tickerAggregates",
    "tickerPreviousClose",
    "cryptoAggregates",
    "cryptoPrice",
    "cryptoTickers",
    "hyper-agent-task",
    "graph-rag-csv-loader",
    "graph-rag-dot-loader",
    "graph-rag-gexf-loader",
    "graph-rag-graphml-loader",
    "graph-rag-json-loader",
    "graph-rag-csv-exporter",
    "graph-rag-dot-exporter",
    "graph-rag-gexf-exporter",
    "graph-rag-graphml-exporter",
    "graph-rag-json-exporter",
    "graph-rag-visualization",
    "graph-rag-inspector",
    "graph-rag-edit",
    "graph-rag-prune",
    "graph-rag-export-import",
    "graph-rag-observability",
    "graph-rag-query",
    "graph-rag",
  ],
  getInstructions: () => analystInstructions,
  getTools: () => {
    const toolIds = [
      "read-file",
    "write-file",
    "tavily-search",
    "brave-search",
    "vector-query",
    "google-vector-query",
    "filtered-vector-query",
    "search-documents",
    "github_search_repositories",
    "github_list_user_repos",
    "github_get_repo",
    "github_search_code",
    "read-knowledge-file",
    "write-knowledge-file",
    "arxiv_search",
    "wikipedia_get_page_summary",
    "mkdir",
    "copy",
    "move",
    "list-files-with-walk",
    "list-files",
    "delete-file",
    "edit-file",
    "create-file",
    "arxiv_pdf_url",
    "arxiv_download_pdf",
    "tickerDetails",
    "tickerNews",
    "tickerAggregates",
    "tickerPreviousClose",
    "cryptoAggregates",
    "cryptoPrice",
    "cryptoTickers",
    "hyper-agent-task",
    "graph-rag-csv-loader",
    "graph-rag-dot-loader",
    "graph-rag-gexf-loader",
    "graph-rag-graphml-loader",
    "graph-rag-json-loader",
    "graph-rag-csv-exporter",
    "graph-rag-dot-exporter",
    "graph-rag-gexf-exporter",
    "graph-rag-graphml-exporter",
    "graph-rag-json-exporter",
    "graph-rag-visualization",
    "graph-rag-inspector",
    "graph-rag-edit",
    "graph-rag-prune",
    "graph-rag-export-import",
    "graph-rag-observability",
    "graph-rag-query",
    "graph-rag",
    ];
    return getToolsFromIds(toolIds, allToolsMap);
  },
};

/**
 * Schema for structured analyst responses
 */
export const analystResponseSchema = z.object({
  analysis: z.string().describe("Primary analysis of the data or information"),
  findings: z
    .array(
      z.object({
        insight: z
          .string()
          .describe("A specific insight or pattern identified"),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe("Confidence level in this finding (0-1)"),
        evidence: z
          .string()
          .describe("Supporting evidence or data for this insight"),
      })
    )
    .describe("List of specific insights and patterns identified"),
  limitations: z
    .string()
    .optional()
    .describe("Limitations of the analysis or data"),
  recommendations: z
    .array(z.string())
    .optional()
    .describe("Recommended actions based on the analysis"),
  visualizationSuggestions: z
    .array(z.string())
    .optional()
    .describe("Suggestions for data visualization"),
});

/**
 * Type representing the structured response from the Analyst agent
 * based on the Zod schema definition
 */


export type AnalystResponse = z.infer<typeof analystResponseSchema>;

/**
 * Type representing the configuration for the Analyst agent
 */
export type AnalystAgentConfig = typeof analystAgentConfig;