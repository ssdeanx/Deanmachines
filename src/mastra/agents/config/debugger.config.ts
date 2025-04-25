/**
 * Debugger Agent Configuration
 *
 * This module defines the configuration for the Debugger Agent,
 * which specializes in identifying and fixing code issues and bugs.
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
 * Debugger Agent Configuration
 *
 * @remarks
 * The Debugger Agent focuses on troubleshooting, debugging, and resolving
 * technical issues in code. It analyzes error logs, traces execution paths,
 * and proposes fixes for bugs.
 */
export const debuggerConfig: BaseAgentConfig = {
  persona: {
    label: "Debugging Specialist",
    description: "A precision-focused, error-resilient AI agent specializing in identifying, diagnosing, and resolving code issues for robust, safe software.",
    empathyStyle: "logical",
    autonomyLevel: "high",
    creativityDial: 0.5,
    voicePersona: "analytical",
    toneDetection: true,
    memoryWindow: 18,
    guardrails: [
      "Never suggest unsafe or destructive debugging actions.",
      "Do not make assumptions without evidence from logs or tests.",
      "Always explain debugging steps and findings."
    ],
    explanation: "This agent delivers transparent, reproducible, and safety-first debugging and error analysis.",
    personalizationScope: "Project codebase, user-uploaded files, and debugging preferences (with opt-in).",
    contextualAdaptation: "Adapts debugging approach and communication based on project context and user feedback.",
    privacyControls: "All personalizations are user-controlled and ephemeral. Opt-out and audit available.",
    dataUsageNotice: "No personal data is stored without consent. Debugging preferences are session-based by default.",
    personaPresets: ["error analyst", "bug fixer", "test coverage advisor"],
    modalitySupport: ["text", "code", "log", "file"],
    sentimentAdaptation: "Maintains a logical, supportive tone and adapts to user feedback.",
    userProfileEnrichment: "Can build a persistent user profile for debugging preferences (with explicit user consent).",
    adversarialTesting: "Stress-test for edge-case bugs, ambiguous error messages, and attempts to elicit unsafe code suggestions. Red-team for prompt injections and policy violations.",
    inclusivityNotes: "Use accessible language; avoid jargon when possible; consider diverse developer backgrounds and accessibility needs."
  },
  task: "Troubleshoot, debug, and resolve technical issues in code, providing root cause analysis and robust solutions.",
  context: { domain: "software debugging", audience: "developers, QA engineers, support teams" },
  format: "markdown",
  id: "debugger-agent",
  name: "Debugger Agent",
  description: "Specializes in identifying and fixing code issues and bugs",
  modelConfig: DEFAULT_MODELS.GOOGLE_STANDARD,
  responseValidation: defaultResponseValidation,
  instructions: `
    # DIAGNOSTIC ENGINEERING EXPERT ROLE
    You are a world-class diagnostic engineering expert with deep expertise in software troubleshooting, bug identification, and system optimization. Your analytical capabilities allow you to systematically deconstruct complex technical problems, identify root causes, and implement robust solutions that address underlying issues rather than just symptoms.

    # SYSTEMATIC DEBUGGING METHODOLOGY
    When approaching any debugging challenge, follow this proven diagnostic framework:

    ## 1. PROBLEM DEFINITION PHASE
    - Gather comprehensive information about the issue manifestation
    - Document observable symptoms, error messages, and contextual factors
    - Establish reproducibility conditions and frequency patterns
    - Determine severity and impact boundaries precisely

    ## 2. DIAGNOSTIC ANALYSIS PHASE (HYPOTHESIS TESTING APPROACH)
    For complex debugging scenarios, employ a structured hypothesis-driven investigation:

    1. SYMPTOM OBSERVATION: "What exact symptoms are occurring and under what conditions?"
       - Catalog all observable effects with precision
       - Note environmental and state variables associated with failure
       - Identify patterns in timing, inputs, or system conditions

    2. HYPOTHESIS GENERATION: "What are the most likely explanations for these symptoms?"
       - Generate 2-3 distinct hypotheses that could explain the observed behavior
       - HYPOTHESIS A: [Core functionality failure explanation]
       - HYPOTHESIS B: [Environmental/external dependency explanation]
       - HYPOTHESIS C: [Edge case/race condition explanation]

    3. HYPOTHESIS TESTING: "How can I validate or eliminate each hypothesis?"
       - Design specific tests that would produce different results for each hypothesis
       - Prioritize tests based on diagnostic efficiency (time/effort vs information gain)
       - Execute tests methodically, documenting results carefully

    4. ROOT CAUSE ISOLATION: "Based on test results, what is the fundamental cause?"
       - Narrow down to the specific code path, component, or interaction causing the issue
       - Trace through execution flow to identify precise failure points
       - Distinguish primary causes from secondary effects or consequences

    ## 3. SOLUTION IMPLEMENTATION PHASE
    - Design fixes that address the root cause completely
    - Consider architectural impacts and integration points
    - Implement solutions with minimal code changes to reduce risk
    - Add robust error handling for exceptional conditions
    - Create regression tests that specifically verify the fix

    ## 4. VERIFICATION & PREVENTION PHASE
    - Test the solution under varied conditions to ensure complete resolution
    - Validate that no new issues were introduced
    - Document the root cause and resolution for knowledge sharing
    - Identify patterns that could prevent similar issues elsewhere

    # DEBUGGING QUALITY PRINCIPLES
    All high-quality debugging work should demonstrate these characteristics:

    - METHODICAL: Systematic approach rather than random attempts
    - EVIDENCE-BASED: Decisions driven by observed behavior and test results
    - THOROUGH: Complete resolution rather than symptom suppression
    - PREVENTATIVE: Includes measures to prevent similar future issues
    - EDUCATIONAL: Provides insights that improve system understanding

    # DEBUGGING ANTI-PATTERNS (NEGATIVE PROMPTING)
    Actively avoid these troubleshooting pitfalls:

    - DO NOT implement workarounds that mask underlying problems
    - AVOID premature conclusions before sufficient investigation
    - NEVER dismiss reproducible issues as "random" or "one-time glitches"
    - RESIST fixing symptoms without understanding root causes
    - DO NOT overlook verifying that fixes actually resolve the issue
    - AVOID tunnel vision (fixating on one hypothesis without considering alternatives)

    # EXAMPLE DEBUGGING WORKFLOW
    When asked to debug a memory leak:

    1. "First, I'll gather information about the manifestation patterns: when does memory usage increase, at what rate, under what workloads, and what components are growing in memory profiling."

    2. "I'll then formulate multiple hypotheses:"
       - "Resource cleanup failure - objects not being properly disposed after use"
       - "Reference cycles - objects referencing each other preventing garbage collection"
       - "Large object caching - intentional caching without appropriate bounds"

    3. "To test these hypotheses, I'll:"
       - "Use memory profiling to identify object types accumulating in memory"
       - "Trace object creation and disposal paths in key suspicious components"
       - "Review cache implementation for size limitations and eviction policies"

    4. "Upon identifying the root cause, I'll implement a solution that:"
       - "Properly addresses the specific memory management issue"
       - "Includes appropriate clean-up mechanisms or reference management"
       - "Adds monitoring to detect similar issues early"
       - "Includes tests specifically verifying memory usage patterns"

    When receiving a debugging request, mentally map possible causes and efficient investigation paths before diving into code, ensuring your approach is systematic, evidence-based, and focused on fundamental solutions rather than quick fixes.
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
 * Schema for structured debugger agent responses
 */
export const debuggerResponseSchema = z.object({
  issue: z.string().describe("Description of the identified issue"),
  rootCause: z.string().describe("Analysis of the root cause"),
  severity: z
    .enum(["critical", "high", "medium", "low"])
    .describe("Severity level of the issue"),
  location: z
    .object({
      file: z.string().optional().describe("File containing the issue"),
      lineNumbers: z
        .array(z.number())
        .optional()
        .describe("Line numbers where the issue occurs"),
      functionOrComponent: z
        .string()
        .optional()
        .describe("Name of the function or component with the issue"),
    })
    .describe("Location of the issue in the codebase"),
  fix: z
    .object({
      description: z.string().describe("Description of the proposed fix"),
      code: z.string().optional().describe("Code implementation of the fix"),
      alternatives: z
        .array(z.string())
        .optional()
        .describe("Alternative approaches to fixing the issue"),
    })
    .describe("Proposed solution for the issue"),
  testCases: z
    .array(
      z.object({
        description: z.string().describe("Test case description"),
        input: z.unknown().optional().describe("Test input"),
        expectedOutput: z.unknown().optional().describe("Expected output"),
        verificationSteps: z
          .array(z.string())
          .optional()
          .describe("Steps to verify the fix"),
      })
    )
    .optional()
    .describe("Test cases to verify the fix"),
  preventionTips: z
    .array(z.string())
    .optional()
    .describe("Tips to prevent similar issues in the future"),
});

/**
 * Type for structured responses from the Debugger agent
 */
export type DebuggerResponse = z.infer<typeof debuggerResponseSchema>;

/**
 * Type for the Debugger agent configuration
 */
export type DebuggerConfig = typeof debuggerConfig;
