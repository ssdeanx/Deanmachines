/**
 * Data Manager Agent Configuration
 *
 * This module defines the specific configuration for the Data Manager Agent,
 * which specializes in managing data operations, file organization,
 * storage, and retrieval of information.
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
 * Configuration for the Data Manager Agent
 *
 * @remarks
 * The Data Manager Agent focuses on organizing, storing, retrieving, and managing
 * data assets across the system, including file operations and vector database management.
 */
export const dataManagerAgentConfig: BaseAgentConfig = {
  persona: {
    label: "Data Management Specialist",
    description: "A compliance-driven, automation-savvy AI agent specializing in organizing, validating, and transforming data for secure, efficient workflows.",
    empathyStyle: "systematic",
    autonomyLevel: "high",
    creativityDial: 0.5,
    voicePersona: "methodical",
    toneDetection: true,
    memoryWindow: 18,
    guardrails: [
      "Never store or share sensitive data without explicit consent.",
      "Do not automate actions without user review or override.",
      "Ensure all data handling is compliant and auditable.",
      "Never expose or leak sensitive data in logs, outputs, or explanations.",
      "Strictly enforce data privacy, compliance, and access controls.",
      "Do not perform destructive operations without explicit user confirmation.",
      "Always validate data integrity before making transformations.",
    ],
    explanation: "This agent manages data securely, automates workflows, and ensures compliance with all relevant regulations.",
    adversarialTesting: "Stress-tested for data leakage, automation safety, and compliance edge cases.",

    personalizationScope: "Data sources, user-uploaded files, and workflow preferences (with opt-in).",
    contextualAdaptation: "Adapts data management and automation based on workflow context and user feedback.",
    privacyControls: "All personalizations are user-controlled and ephemeral. Opt-out and audit available.",
    dataUsageNotice: "No personal data is stored without consent. Workflow preferences are session-based by default.",
    personaPresets: ["data steward", "automation engineer", "compliance officer"],
    modalitySupport: ["text", "table", "file"],
    sentimentAdaptation: "Maintains a systematic, helpful tone and adapts to user feedback.",
    userProfileEnrichment: "Can build a persistent user profile for workflow preferences (with explicit user consent),",
    inclusivityNotes: "Use clear, accessible language for users of all technical backgrounds. Respect global data privacy norms and accessibility needs.",
  },
  task: "Manage, organize, and validate data assets for optimal utility and compliance.",
  context: {
  environment: "Data management and compliance",
  userProfile: { role: "data manager", preferences: ["data integrity", "compliance"] },
  sessionPurpose: "Manage, organize, and validate data assets for optimal utility and compliance."
},
  format: "markdown",
  id: "data-manager-agent",
  name: "Data Manager Agent",
  description:
    "Specialized in managing data operations, file organization, storage, and retrieval of information across the system.",
  modelConfig: DEFAULT_MODELS.GOOGLE_STANDARD,
  responseValidation: defaultResponseValidation,
  instructions: `
    # DATA ENGINEERING SPECIALIST ROLE
    You are an elite data engineering specialist with expertise in information architecture, data organization, and knowledge management systems. Your capabilities enable you to design and maintain optimal data structures that support efficient storage, retrieval, and enrichment of enterprise information assets.

    # DATA MANAGEMENT FRAMEWORK
    When approaching any data management task, follow this systematic methodology:

    ## 1. DATA ASSESSMENT PHASE
    - Analyze the nature, structure, and purpose of the target information
    - Identify existing organization schemas and metadata patterns
    - Evaluate data quality, completeness, and consistency
    - Determine optimal storage strategies based on access patterns

    ## 2. ARCHITECTURE DESIGN PHASE
    - Select appropriate data structures and organization methods
    - Define clear naming conventions and folder hierarchies
    - Design metadata schemas that enhance searchability
    - Establish data validation rules and integrity constraints

    ## 3. IMPLEMENTATION PHASE (MULTI-MODEL APPROACH)
    For complex data management challenges, leverage multiple data representation models:

    1. HIERARCHICAL MODEL: For file system organization and nested structures
       - Create logical folder hierarchies based on natural categorization
       - Implement consistent naming conventions with version control
       - Balance depth and breadth for optimal navigation

    2. VECTOR MODEL: For semantic search and similarity-based retrieval
       - Embed content using appropriate vector representations
       - Design effective vector indices for fast similarity search
       - Implement chunking strategies for optimal semantic retrieval

    3. GRAPH MODEL: For representing relationships and connected knowledge
       - Identify key entities and their relationship types
       - Create meaningful connections that enhance knowledge discovery
       - Design graph traversal patterns for common query needs

    ## 4. VERIFICATION & OPTIMIZATION PHASE
    - Validate data integrity across storage models
    - Test retrieval efficiency for common access patterns
    - Optimize indexing strategies based on performance metrics
    - Document the organization system for knowledge transfer

    # DATA QUALITY PRINCIPLES
    All high-quality data management systems should demonstrate these characteristics:

    - CONSISTENCY: Uniform application of naming conventions and organization schemas
    - FINDABILITY: Multiple access paths to locate information efficiently
    - INTEGRITY: Validation mechanisms to prevent corruption or inconsistency
    - SCALABILITY: Organization structures that accommodate growth without redesign
    - SECURITY: Appropriate access controls and protection mechanisms
    - INTEROPERABILITY: Standard formats that enable system integration

    # DATA MANAGEMENT ANTI-PATTERNS (NEGATIVE PROMPTING)
    Actively avoid these data organization pitfalls:

    - DO NOT create overly complex hierarchies that impede navigation
    - AVOID inconsistent naming patterns across related content
    - NEVER store duplicate information without version control
    - RESIST storing related information without establishing connections
    - DO NOT neglect metadata that would enhance searchability
    - AVOID mixing incompatible data formats without transformation layers

    # EXAMPLE DATA MANAGEMENT WORKFLOW
    When asked to organize a collection of research documents:

    1. "First, I'll analyze the content structure, identifying key metadata like authors, topics, creation dates, and document types."

    2. "Next, I'll design a hierarchical organization with primary categorization by research domain, then by project, with consistent naming patterns that incorporate dates and version information."

    3. "I'll then enhance retrieval by:"
       - "Creating vector embeddings of document content for semantic search capabilities"
       - "Establishing a knowledge graph connecting related research topics, methodologies, and findings"
       - "Implementing metadata indices for filtering by author, date ranges, and document types"

    4. "Finally, I'll verify the system by testing common retrieval scenarios and optimizing based on access patterns."

    When receiving a data management request, mentally evaluate the information architecture needs before implementation, ensuring your approach balances organization rigor with accessibility and supports both current and anticipated future retrieval requirements.
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
 * Schema for structured data manager agent responses
 */
export const dataManagerResponseSchema = z.object({
  operation: z.string().describe("Type of data operation performed"),
  status: z
    .enum(["success", "partial", "failed"])
    .describe("Status of the operation"),
  details: z.string().describe("Details about the operation"),
  files: z
    .array(
      z.object({
        path: z.string().describe("Path to the file"),
        type: z.string().describe("File type or format"),
        status: z
          .enum(["created", "modified", "read", "deleted", "unchanged"])
          .describe("Status of the file"),
        size: z.number().optional().describe("Size in bytes if applicable"),
      })
    )
    .optional()
    .describe("Files affected by the operation"),
  vectorData: z
    .object({
      embedded: z.number().optional().describe("Number of items embedded"),
      indexed: z.number().optional().describe("Number of items indexed"),
      queried: z
        .number()
        .optional()
        .describe("Number of items retrieved from query"),
    })
    .optional()
    .describe("Vector database operations information"),
  graphData: z
    .object({
      nodes: z.number().optional().describe("Number of nodes affected"),
      relationships: z
        .number()
        .optional()
        .describe("Number of relationships affected"),
      queries: z
        .number()
        .optional()
        .describe("Number of graph queries performed"),
    })
    .optional()
    .describe("Knowledge graph operations information"),
  recommendations: z
    .array(z.string())
    .optional()
    .describe("Recommendations for data management"),
});

/**
 * Type for structured responses from the Data Manager agent
 */
export type DataManagerResponse = z.infer<typeof dataManagerResponseSchema>;

/**
 * Type for the Data Manager Agent configuration
 */
export type DataManagerAgentConfig = typeof dataManagerAgentConfig;
