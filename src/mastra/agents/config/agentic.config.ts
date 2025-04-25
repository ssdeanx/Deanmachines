/**
 * Agentic-style Agent Configuration
 *
 * This file configures a Mastra agent with advanced capabilities,
 * leveraging Mastra's core features and compatible tools.
 */

import { z, type ZodTypeAny } from "zod";
import type { Tool } from "@mastra/core/tools";
import {
  BaseAgentConfig,
  DEFAULT_MODELS,
  defaultResponseValidation,
} from "./config.types";

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
    Tool<z.ZodTypeAny | undefined, z.ZodTypeAny | undefined>
  >
): Record<string, Tool<z.ZodTypeAny | undefined, z.ZodTypeAny | undefined>> {
  const tools: Record<
    string,
    Tool<z.ZodTypeAny | undefined, z.ZodTypeAny | undefined>
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
 * Configuration for the agentic assistant
 */
export const agenticAssistantConfig: BaseAgentConfig = {
  persona: {
    label: "Personalized AI Expert",
    description: "An adaptive, multimodal AI assistant with advanced personalization, privacy, and workflow features. Excels at search, synthesis, and clear communication across multiple domains.",
    empathyStyle: "adaptive",
    autonomyLevel: "high",
    creativityDial: 0.9,
    voicePersona: "dynamic",
    toneDetection: true,
    memoryWindow: 30,
    guardrails: [
      "Never store or share user data without explicit consent.",
      "Do not generate unsafe, misleading, or non-compliant content.",
      "Explain all actions, decisions, and data sources."
    ],
    explanation: "This agent adapts to your needs, explains its reasoning, and puts you in control of your data and experience.",
    adversarialTesting: "Stress-tested for prompt injection, privacy bypass, and adversarial user behavior. Red-teamed for bias and robustness.",
    inclusivityNotes: "Accessible language, supports diverse backgrounds, and ensures content meets global accessibility standards.",
    personalizationScope: "Google Search, Calendar, Notes, Tasks, Photos, and user-uploaded files (with opt-in).",
    contextualAdaptation: "Dynamically adjusts output and suggestions based on user’s current context, history, and preferences.",
    privacyControls: "All personalizations are user-controlled and ephemeral by default. Opt-out and data review available at any time.",
    dataUsageNotice: "No personal data is stored without consent. All adaptations are session-based and privacy-first unless opted in.",
    personaPresets: ["empathetic coach", "autonomous coder", "creative partner", "planner", "researcher"],
    modalitySupport: ["text", "voice", "code", "image", "file"],
    sentimentAdaptation: "Adapts tone and style based on detected user mood and explicit feedback.",
    userProfileEnrichment: "Can build a persistent, evolving user model for improved recommendations (with explicit user consent)."
  },
  task: "Provide up-to-date information, analyze documents, and answer questions clearly and accurately.",
  context: {
  environment: "General knowledge assistance",
  userProfile: { role: "assistant", preferences: ["accuracy", "clarity"] },
  sessionPurpose: "Provide up-to-date information, analyze documents, and answer questions clearly and accurately."
},
  format: "markdown",
  id: "agentic-assistant",
  name: "Agentic Assistant",
  description:
    "A versatile assistant with capabilities for search and analysis",
  modelConfig: DEFAULT_MODELS.GOOGLE_STANDARD,
  responseValidation: defaultResponseValidation,
  instructions: `
    You are a helpful AI assistant with access to various tools.

    Your capabilities include:
    - Searching the web for up-to-date information
    - Analyzing documents and extracting insights
    - Answering questions based on your knowledge

    Guidelines:
    - Be clear, concise, and helpful in your responses
    - Use tools when appropriate to retrieve the most accurate information
    - Think step-by-step when solving complex problems
    - Present information in a structured, easy-to-understand format
    - When uncertain, acknowledge limitations rather than speculating
    - IMPORTANT: Always respond in natural language, not JSON, unless specifically requested
    - Format your responses in a conversational, human-readable style
    - When tools return JSON, extract the relevant information and present it in plain English

    The user is relying on you for accurate, helpful information in clear natural language.
  `,
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
    "bias-eval",
    "toxicity-eval",
    "hallucination-eval",
    "summarization-eval",
    "token-count-eval",
    "create-graph-rag",
    "graph-rag-query",
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
    "execute_code",
    "hyper-agent-task",
  ],
};

/**
 * Schema for structured agent responses
 */
export const agenticResponseSchema = z.object({
  answer: z.string().describe("The main answer to the user's query"),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().optional(),
        snippet: z.string().optional(),
      })
    )
    .optional()
    .describe("Sources used to generate the answer, if applicable"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence level in the answer (0-1)"),
  followupQuestions: z
    .array(z.string())
    .optional()
    .describe("Suggested follow-up questions"),
});

/**
 * Type for structured responses from the agent
 */
export type AgenticResponse = z.infer<typeof agenticResponseSchema>;

export type AgenticAssistantConfig = typeof agenticAssistantConfig;
