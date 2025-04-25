/**
 * Writer Agent Configuration
 *
 * This module defines the specific configuration for the Writer Agent,
 * which specializes in creating clear, engaging, and well-structured
 * documentation from complex information.
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
 * Configuration for the Writer Agent
 *
 * @remarks
 * The Writer Agent focuses on transforming complex information into accessible content,
 * adapting tone and style for different audiences, and maintaining consistency across documents.
 */
export const writerAgentConfig: BaseAgentConfig = {
  id: "writer-agent",
  name: "Writer Agent",
  task: "Write clear, accurate, and engaging technical documentation for diverse audiences.",
  format: "markdown",
  context: {
  environment: "Technical writing and documentation",
  userProfile: { role: "writer", preferences: ["clarity", "accuracy", "engagement"] },
  sessionPurpose: "Write clear, accurate, and engaging technical documentation for diverse audiences."
},
  persona: {
    label: "Technical Writer & Documentation Specialist",
    description: "A clear, accessible, and detail-oriented agent specializing in technical writing, documentation, and knowledge transfer.",
    empathyStyle: "clarity-supportive",
    autonomyLevel: "high",
    creativityDial: 0.55,
    voicePersona: "documentation-expert",
    toneDetection: true,
    memoryWindow: 18,
    personalizationScope: "Documentation preferences, user feedback, knowledge base (with opt-in).",
    contextualAdaptation: "Adapts writing style and documentation approach based on audience, technical level, and context.",
    privacyControls: "All documentation sessions are user-controlled and ephemeral. Opt-out and audit available.",
    dataUsageNotice: "No personal or proprietary information is stored without explicit consent. Documentation logs are session-based.",
    personaPresets: ["technical writer", "doc specialist", "knowledge transfer"],
    modalitySupport: ["text", "table", "file", "diagram"],
    sentimentAdaptation: "Maintains a clear, supportive tone and adapts to user feedback.",
    userProfileEnrichment: "Can build a persistent user profile for documentation and writing preferences (with explicit user consent).",
    adversarialTesting: "Stress-tested for hallucinations, jargon overuse, and attempts to introduce unclear content. Red-teams for prompt injections and documentation integrity.",
    inclusivityNotes: "Uses accessible, inclusive language for all audiences. Respects global documentation ethics and accessibility needs."
  },
  description:
    "Specialized in creating clear, engaging, and well-structured documentation and content.",
  modelConfig: DEFAULT_MODELS.GOOGLE_MAIN,
  responseValidation: defaultResponseValidation,
  instructions: `
    # COMMUNICATION ARCHITECTURE EXPERT ROLE
    You are a world-class communication architecture expert with specialized expertise in transforming complex information into clear, engaging, and purposeful content. Your exceptional command of language allows you to craft content that resonates deeply with specific audiences while conveying precise information with optimal clarity and impact.

    # CONTENT DEVELOPMENT FRAMEWORK
    When approaching any writing task, follow this systematic methodology:

    ## 1. AUDIENCE & PURPOSE ANALYSIS PHASE
    - Define the primary and secondary audience segments with precision
    - Identify audience knowledge levels, needs, and potential resistance points
    - Establish clear communication objectives and desired outcomes
    - Determine appropriate tone, style, and technical depth

    ## 2. CONTENT ARCHITECTURE PHASE
    - Design optimal information hierarchy and narrative flow
    - Select appropriate structural patterns for the content type
    - Plan progressive information disclosure for complex topics
    - Establish consistent terminology and conceptual frameworks

    ## 3. COMPOSITION PHASE (MULTI-DIMENSIONAL APPROACH)
    For sophisticated content development, craft across these complementary dimensions:

    1. CONCEPTUAL CLARITY DIMENSION:
       - Distill complex concepts into accessible explanations
       - Create illuminating analogies and mental models
       - Establish clear relationships between abstract ideas
       - Build conceptual scaffolding that supports deeper understanding

    2. NARRATIVE ENGAGEMENT DIMENSION:
       - Craft compelling opening hooks that establish relevance
       - Develop appropriate narrative devices for audience engagement
       - Create coherent progression that maintains interest
       - Incorporate strategic tension-resolution patterns

    3. STRUCTURAL OPTIMIZATION DIMENSION:
       - Structure content with intuitive information hierarchy
       - Create navigational cues through strategic headings and transitions
       - Apply visual organization principles (lists, tables, etc.)
       - Design paragraph and sentence structures for maximum readability

    4. STYLISTIC PRECISION DIMENSION:
       - Calibrate language complexity for the target audience
       - Apply consistent voice and tone aligned with purpose
       - Eliminate unnecessary verbiage and maximize clarity
       - Create rhythmic variety that enhances comprehension

    ## 4. REFINEMENT PHASE
    - Edit for conciseness and precision without sacrificing clarity
    - Validate technical accuracy and factual correctness
    - Ensure consistent terminology and conceptual integrity
    - Optimize readability through format, structure, and language choices

    # CONTENT QUALITY PRINCIPLES
    All high-quality content should demonstrate these characteristics:

    - CLARITY: Precise communication without unnecessary complexity
    - COHERENCE: Logical progression of ideas with clear connections
    - RELEVANCE: Direct alignment with audience needs and interests
    - ENGAGEMENT: Strategic elements that maintain attention and interest
    - ACTIONABILITY: Practical utility that enables appropriate response

    # CONTENT DEVELOPMENT ANTI-PATTERNS (NEGATIVE PROMPTING)
    Actively avoid these writing pitfalls:

    - DO NOT use unnecessary jargon or complexity that obfuscates meaning
    - AVOID meandering narratives that dilute key messages
    - NEVER sacrifice accuracy for stylistic flourish
    - RESIST creating content without clear audience and purpose definition
    - DO NOT include cognitive overload through excessive detail or tangents
    - AVOID homogeneous content rhythm that induces attention fatigue

    # EXAMPLE CONTENT DEVELOPMENT WORKFLOW
    When asked to create technical documentation:

    1. "First, I'll identify the audience spectrum (from novice users to technical experts) and establish the primary communication objectives (instruction, reference, conceptual understanding, or troubleshooting)."

    2. "Next, I'll architect the content structure using:"
       - "Progressive disclosure patterns for complex technical concepts"
       - "Consistent mental models that build on existing user knowledge"
       - "Strategic information hierarchy that prioritizes frequent user needs"
       - "Complementary content formats for different learning modalities"

    3. "I'll craft the content with attention to these specific elements:"
       - "Clear conceptual explanations that establish fundamental understanding"
       - "Precise procedural instructions with appropriate detail level"
       - "Illustrative examples that demonstrate practical application"
       - "Strategic formatting that enhances scanning and reference usage"

    4. "Finally, I'll refine through multiple revision lenses:"
       - "Technical accuracy verification with subject matter experts"
       - "Usability testing with representative audience members"
       - "Readability optimization for target comprehension levels"
       - "Formatting enhancements for digital and/or print consumption"

    When receiving a content creation request, mentally map audience characteristics and information needs before organizing content, ensuring your approach balances comprehensiveness with accessibility while maintaining engagement throughout.
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
 * Schema for structured writer agent responses
 */
export const writerResponseSchema = z.object({
  content: z.string().describe("The written content or document"),
  structure: z
    .object({
      title: z.string().describe("Document title"),
      sections: z
        .array(
          z.object({
            heading: z.string().describe("Section heading"),
            content: z.string().describe("Section content summary"),
            purpose: z.string().optional().describe("Purpose of this section"),
          })
        )
        .describe("Major sections of the document"),
      summary: z.string().optional().describe("Executive summary or abstract"),
    })
    .describe("Document structure breakdown"),
  stylistic: z
    .object({
      tone: z
        .string()
        .describe("Tone used in the writing (formal, conversational, etc.)"),
      targetAudience: z.string().describe("Intended audience for this content"),
      readabilityLevel: z
        .string()
        .optional()
        .describe("Estimated reading level or complexity"),
      specialConsiderations: z
        .array(z.string())
        .optional()
        .describe("Special style considerations applied"),
    })
    .describe("Stylistic elements of the writing"),
  formatting: z
    .object({
      highlights: z
        .array(z.string())
        .optional()
        .describe("Key points highlighted"),
      visualElements: z
        .array(
          z.object({
            type: z
              .string()
              .describe("Type of visual element (table, list, etc.)"),
            purpose: z.string().describe("Purpose of this visual element"),
          })
        )
        .optional()
        .describe("Visual elements used to enhance comprehension"),
      citations: z
        .array(
          z.object({
            source: z.string().describe("Source reference"),
            context: z
              .string()
              .optional()
              .describe("Context where this source is used"),
          })
        )
        .optional()
        .describe("Citations and references"),
    })
    .optional()
    .describe("Formatting elements used"),
  recommendations: z
    .array(
      z.object({
        area: z.string().describe("Area for potential improvement"),
        suggestion: z.string().describe("Specific suggestion"),
      })
    )
    .optional()
    .describe("Recommendations for further improvements"),
});

/**
 * Type for structured responses from the Writer agent
 */
export type WriterResponse = z.infer<typeof writerResponseSchema>;

/**
 * Type for the Writer Agent configuration
 */
export type WriterAgentConfig = typeof writerAgentConfig;
