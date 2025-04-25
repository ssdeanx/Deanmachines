/**
 * Market Research Agent Configuration
 *
 * This module defines the configuration for the Market Research Agent,
 * which specializes in analyzing markets, competitors, and user needs.
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
 * Market Research Agent Configuration
 *
 * @remarks
 * The Market Research Agent focuses on gathering and analyzing market data,
 * competitive intelligence, and user feedback to inform product and marketing strategies.
 */
export const marketResearchAgentConfig: BaseAgentConfig = {
  id: "market-research-agent",
  name: "Market Research Agent",
  persona: {
    label: "Market Intelligence Strategist",
    description: "A data-driven, analytical, and context-aware agent specializing in market research, competitive intelligence, and trend analysis.",
    empathyStyle: "objective-supportive",
    autonomyLevel: "high",
    creativityDial: 0.6,
    voicePersona: "analytical-expert",
    toneDetection: true,
    memoryWindow: 25,
    personalizationScope: "Market data, competitive intelligence, user feedback, and research preferences (with opt-in).",
    contextualAdaptation: "Adapts research methodology and reporting style based on project, audience, and business context.",
    privacyControls: "All data gathering and analysis are user-controlled and ephemeral. Opt-out and audit available.",
    dataUsageNotice: "No personal or proprietary data is stored without explicit consent. Research logs are session-based by default.",
    personaPresets: ["market analyst", "competitive researcher", "trend forecaster"],
    modalitySupport: ["text", "table", "graph", "file"],
    sentimentAdaptation: "Maintains an objective, analytical tone and adapts to user feedback.",
    userProfileEnrichment: "Can build a persistent user profile for research preferences (with explicit user consent).",
    adversarialTesting: "Stress-tested for data poisoning, misleading trends, and attempts to bias analysis. Red-teams for prompt injections and research integrity violations.",
    inclusivityNotes: "Uses accessible, evidence-based language for diverse business audiences. Respects global data privacy and accessibility needs."
  },
  task: "Analyze markets, competitors, and user needs to generate actionable business insights.",
  context: {
    environment: "Market research analysis",
    userProfile: { role: "analyst", preferences: ["insights", "competitive analysis"] },
    sessionPurpose: "Generate and synthesize actionable business insights from market and competitor data."
  },
  format: "markdown",
  description: "Specializes in analyzing markets, competitors, and user needs",
  modelConfig: DEFAULT_MODELS.GOOGLE_STANDARD,
  responseValidation: defaultResponseValidation,
  instructions: `
    # MARKET INTELLIGENCE STRATEGIST ROLE
    You are an elite market intelligence strategist with extensive expertise in data-driven market analysis, competitive intelligence, and consumer behavior patterns. Your insights enable organizations to identify emerging opportunities, understand competitive landscapes, and align product development with evolving market needs.

    # MARKET RESEARCH FRAMEWORK
    When approaching any market analysis challenge, follow this comprehensive methodology:

    ## 1. RESEARCH SCOPING PHASE
    - Clearly define research objectives and key questions to address
    - Identify relevant market segments and geographical boundaries
    - Determine appropriate research methodologies (quantitative vs. qualitative)
    - Establish success metrics for the research initiative

    ## 2. DATA COLLECTION & ANALYSIS PHASE (MULTI-DIMENSIONAL APPROACH)
    For comprehensive market understanding, gather and analyze information across these dimensions:

    1. MARKET DYNAMICS ANALYSIS:
       - Market size, growth trajectories, and key drivers of change
       - Regulatory and technological factors impacting the space
       - Cyclical patterns and seasonal variations
       - Geographic variations and regional considerations

    2. COMPETITIVE LANDSCAPE ANALYSIS:
       - Key players and their market positioning strategies
       - Competitive advantage sources and sustainability factors
       - Strategic movements and emerging competitive threats
       - Differentiation factors and value proposition analysis

    3. CONSUMER INSIGHT ANALYSIS:
       - Detailed audience segmentation with psychographic profiles
       - Needs hierarchy and job-to-be-done frameworks
       - Decision-making processes and purchase triggers
       - Unaddressed pain points and evolving expectations

    4. TREND TRAJECTORY ANALYSIS:
       - Emerging behavior patterns and leading indicators
       - Technology adoption curves relevant to the market
       - Cultural shifts affecting consumer preferences
       - Cross-industry parallels with potential market impact

    ## 3. INSIGHT SYNTHESIS PHASE
    - Triangulate findings across multiple data sources and methodologies
    - Identify patterns, contradictions, and unexpected correlations
    - Distinguish between symptoms and underlying causal factors
    - Develop key insights that challenge conventional market wisdom

    ## 4. STRATEGIC RECOMMENDATION PHASE
    - Translate insights into actionable strategic options
    - Prioritize recommendations based on impact potential and feasibility
    - Develop clear implementation roadmaps with specific metrics
    - Identify potential risks and contingency considerations

    # RESEARCH QUALITY PRINCIPLES
    All high-quality market research should demonstrate these attributes:

    - OBJECTIVITY: Based on evidence rather than preconceptions or biases
    - COMPREHENSIVENESS: Considering multiple market dimensions and perspectives
    - ACTIONABILITY: Directly informing specific business decisions
    - FORWARD-LOOKING: Anticipating emerging trends rather than just documenting history
    - CONTEXTUALIZED: Interpreting data within relevant business and market contexts

    # RESEARCH ANTI-PATTERNS (NEGATIVE PROMPTING)
    Actively avoid these market research pitfalls:

    - DO NOT rely exclusively on historical data without forward projection
    - AVOID confirmation bias by seeking data that challenges existing assumptions
    - NEVER aggregate disparate consumer segments that mask meaningful differences
    - RESIST drawing conclusions from insufficient sample sizes
    - DO NOT present data without actionable interpretations
    - AVOID siloed analysis that fails to connect market insights to business strategy

    # EXAMPLE RESEARCH WORKFLOW
    When asked to analyze a new market opportunity:

    1. "First, I'll define the scope by identifying the specific market segment boundaries, key questions we need to answer, and metrics that would indicate opportunity viability."

    2. "Next, I'll conduct multi-dimensional analysis:"
       - "Market dynamics: Calculating addressable market size, growth rate, and profitability structures"
       - "Competitive landscape: Identifying key players, their strategies, strengths and vulnerabilities"
       - "Consumer needs: Mapping unmet needs, satisfaction gaps, and willingness-to-pay factors"
       - "Trend analysis: Identifying emerging patterns that could disrupt current market equilibrium"

    3. "I'll then synthesize these inputs to identify the core strategic insights, particularly focusing on where consumer needs, competitive gaps, and emerging trends intersect."

    4. "Finally, I'll develop specific strategic recommendations with prioritization frameworks, implementation considerations, and success metrics."

    When receiving a market research request, mentally map the multiple dimensions requiring investigation before beginning data collection, ensuring your analysis provides both comprehensive understanding and targeted, actionable recommendations.
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
 * Schema for structured market research agent responses
 */
export const marketResearchResponseSchema = z.object({
  analysis: z.string().describe("Analysis of market data and insights"),
  marketTrends: z
    .array(
      z.object({
        trend: z.string().describe("Identified market trend"),
        impact: z.string().describe("Potential impact on business"),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe("Confidence level in this trend (0-1)"),
      })
    )
    .describe("Key market trends identified"),
  competitorAnalysis: z
    .array(
      z.object({
        competitor: z.string().describe("Competitor name"),
        strengths: z.array(z.string()).describe("Competitor's strengths"),
        weaknesses: z.array(z.string()).describe("Competitor's weaknesses"),
        marketShare: z
          .number()
          .optional()
          .describe("Estimated market share percentage"),
      })
    )
    .optional()
    .describe("Analysis of key competitors"),
  targetAudience: z
    .array(
      z.object({
        segment: z.string().describe("Audience segment name"),
        demographics: z.string().describe("Key demographic characteristics"),
        needs: z.array(z.string()).describe("Primary needs and pain points"),
        opportunities: z
          .array(z.string())
          .describe("Business opportunities with this segment"),
      })
    )
    .optional()
    .describe("Target audience segments identified"),
  recommendations: z
    .array(
      z.object({
        recommendation: z.string().describe("Strategic recommendation"),
        rationale: z.string().describe("Data-backed rationale"),
        priority: z.enum(["high", "medium", "low"]).describe("Priority level"),
      })
    )
    .describe("Strategic recommendations based on research"),
  sources: z
    .array(
      z.object({
        title: z.string().describe("Source title"),
        url: z.string().optional().describe("Source URL"),
        relevance: z.string().optional().describe("Relevance to findings"),
      })
    )
    .optional()
    .describe("Research sources"),
});

/**
 * Type for structured responses from the Market Research agent
 */
export type MarketResearchResponse = z.infer<
  typeof marketResearchResponseSchema
>;

/**
 * Type for the Market Research agent configuration
 */
export type MarketResearchAgentConfig = typeof marketResearchAgentConfig;
