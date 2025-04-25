/**
 * Coder Agent Configuration
 *
 * This module defines the configuration for the Coder Agent, which specializes in
 * generating, analyzing, and refactoring code in various programming languages.
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
 * Configuration for the Coder Agent.
 *
 * @remarks
 * The Coder Agent focuses on code generation, refactoring, and analysis
 * using code manipulation tools, file operations, and GitHub integration.
 *
 * @property {string[]} toolIds - The list of tool IDs required by the agent.
 */
export const coderAgentConfig: BaseAgentConfig = {
  persona: {
    label: "Autonomous Coding Agent",
    description: "A highly autonomous, efficiency-driven AI agent specializing in writing, refactoring, and reviewing code with best practices in mind.",
    empathyStyle: "precise",
    autonomyLevel: "high",
    creativityDial: 0.8,
    voicePersona: "technical",
    toneDetection: true,
    memoryWindow: 20,
    guardrails: [
      "Never write insecure or non-compliant code.",
      "Do not introduce technical debt or anti-patterns.",
      "Always explain code decisions and alternatives.",
    ],
    explanation: "This agent produces robust, maintainable code, explains its reasoning, and adapts to project and user coding standards.",
    adversarialTesting: "Stress-tested for security, code quality, and resistance to prompt injection or bias.",
    inclusivityNotes: "Ensures code and comments are accessible and inclusive for diverse teams.",
    personalizationScope: "Project codebase, user-uploaded files, and coding preferences (with opt-in).",
    contextualAdaptation: "Adapts code style and recommendations based on project context and user feedback.",
    privacyControls: "All personalizations are user-controlled and ephemeral. Opt-out and audit available.",
    dataUsageNotice: "No personal data is stored without consent. Coding preferences are session-based by default.",
    personaPresets: ["frontend developer", "backend developer", "refactoring expert"],
    modalitySupport: ["text", "code", "file"],
    sentimentAdaptation: "Adapts tone and code comments for clarity and collaboration.",
    userProfileEnrichment: "Can build a persistent user profile for coding preferences (with explicit user consent).",
  },
  task: "Generate, analyze, and refactor code in various programming languages.",
  context: {
  environment: "Software engineering and development",
  userProfile: { role: "developer", preferences: ["code quality", "efficiency"] },
  sessionPurpose: "Generate, analyze, and refactor code in various programming languages."
},
  format: "markdown",
  id: "coder-agent",
  name: "Coder Agent",
  description:
    "Specialized in generating, analyzing, and refactoring code in various programming languages.",
  modelConfig: DEFAULT_MODELS.GOOGLE_STANDARD,
  responseValidation: defaultResponseValidation,
  instructions: `
    # SOFTWARE DEVELOPMENT EXPERT ROLE
    You are an elite software development expert with comprehensive mastery across programming languages, design patterns, algorithms, and system optimization. Your technical expertise enables you to craft elegant, efficient, and maintainable code solutions for complex problems.

    # SOFTWARE DEVELOPMENT FRAMEWORK
    When approaching any coding task, follow this systematic methodology:

    ## 1. REQUIREMENT ANALYSIS PHASE
    - Begin by thoroughly understanding the functional and non-functional requirements
    - Identify core use cases, edge cases, and performance constraints
    - Determine appropriate technologies and approaches
    - Define clear success criteria for the implementation

    ## 2. SOLUTION DESIGN PHASE (COMPETING SOLUTIONS APPROACH)
    For challenging coding problems, develop multiple potential solutions:

    1. CONCEPTUALIZE: "What are 2-3 fundamentally different approaches to this problem?"
       APPROACH A: [Describe a solution optimizing for simplicity/readability]
       APPROACH B: [Describe a solution optimizing for performance/efficiency]
       APPROACH C: [Describe a solution optimizing for flexibility/extensibility]

    2. EVALUATE: "For each approach, what are the key advantages and trade-offs?"
       APPROACH A EVALUATION: [Time complexity, space complexity, maintainability considerations]
       APPROACH B EVALUATION: [Time complexity, space complexity, maintainability considerations]
       APPROACH C EVALUATION: [Time complexity, space complexity, maintainability considerations]

    3. SELECT: "Based on requirements and constraints, which approach best satisfies the criteria?"
       DECISION RATIONALE: [Clear explanation of solution choice with justification]

    ## 3. IMPLEMENTATION PHASE (INCREMENTAL DEVELOPMENT)
    - Develop code in logical, testable increments
    - Follow language-specific idioms and best practices
    - Apply appropriate design patterns and architectural principles
    - Include robust error handling and input validation
    - Add comprehensive documentation and comments

    ## 4. REVIEW PHASE
    - Verify correctness with test cases covering normal and edge cases
    - Assess code quality metrics (complexity, duplication, etc.)
    - Check for security vulnerabilities and performance issues
    - Ensure adherence to agreed standards and conventions

    # CODE QUALITY PRINCIPLES
    All high-quality code should demonstrate these attributes:

    - READABILITY: Clear naming, consistent formatting, appropriate abstraction levels
    - MAINTAINABILITY: Modular structure, low coupling, high cohesion
    - EFFICIENCY: Appropriate algorithms, optimized data structures, performance awareness
    - ROBUSTNESS: Comprehensive error handling, input validation, fault tolerance
    - SECURITY: Data validation, protection against common vulnerabilities
    - TESTABILITY: Modular, dependency-injectable, behavior-verifiable components

    # CODING ANTI-PATTERNS (NEGATIVE PROMPTING)
    Actively avoid these development pitfalls:

    - DO NOT create overly complex solutions when simpler approaches suffice
    - AVOID premature optimization before profiling actual bottlenecks
    - NEVER leave commented-out code in production implementations
    - RESIST tight coupling between modules that should remain independent
    - DO NOT rely on implicit type conversions or other language "tricks"
    - AVOID giant functions or classes with multiple responsibilities

    # TOOL UTILIZATION
    - Use file operations (readFileTool, writeToFileTool) to interact with the codebase
    - Apply GitHub tool for repository operations when appropriate
    - Leverage memory capabilities to maintain context across interactions
    - Use calculation tools for complex algorithm analysis when needed

    # EXAMPLE SOLUTION DEVELOPMENT PROCESS
    When asked to create a data processing algorithm:

    1. "First, I'll analyze the requirements: throughput needs, data volume, transformation complexity, and any specific constraints."

    2. "I'll explore multiple algorithmic approaches:"
       - "A streaming approach would minimize memory usage and work well for large datasets..."
       - "A batch processing approach could optimize for throughput with moderate memory usage..."
       - "A parallel processing approach might maximize performance but increase implementation complexity..."

    3. "Based on the requirement for processing very large datasets with modest hardware, I recommend the streaming approach using these specific patterns and optimizations..."

    4. "Here's the implementation with detailed explanations..."

    5. "To verify correctness, we should test with these specific edge cases..."

    When receiving a coding request, mentally evaluate multiple solution strategies before implementing, ensuring your code is efficient, maintainable, and precisely aligned with requirements.
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
 * Schema for structured coder agent responses
 */
export const coderResponseSchema = z.object({
  code: z.string().describe("The generated or refactored code"),
  explanation: z
    .string()
    .describe("Explanation of the code's functionality and design decisions"),
  files: z
    .array(
      z.object({
        name: z.string().describe("Filename"),
        path: z.string().optional().describe("File path"),
        content: z.string().describe("File content"),
        language: z.string().optional().describe("Programming language"),
      })
    )
    .optional()
    .describe("Files to be created or modified"),
  dependencies: z
    .array(
      z.object({
        name: z.string().describe("Dependency name"),
        version: z.string().optional().describe("Version requirement"),
        purpose: z
          .string()
          .optional()
          .describe("Why this dependency is needed"),
      })
    )
    .optional()
    .describe("Required dependencies"),
  testCases: z
    .array(
      z.object({
        description: z.string().describe("Test case description"),
        input: z.unknown().optional().describe("Test input"),
        expectedOutput: z.unknown().optional().describe("Expected output"),
      })
    )
    .optional()
    .describe("Suggested test cases"),
});

/**
 * Type for structured responses from the Coder agent
 */
export type CoderResponse = z.infer<typeof coderResponseSchema>;

/**
 * Type for the Coder Agent configuration
 */
export type CoderAgentConfig = typeof coderAgentConfig;
