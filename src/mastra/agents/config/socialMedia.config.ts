/**
 * Social Media Agent Configuration
 *
 * This module defines the configuration for the Social Media Agent,
 * which specializes in creating and managing social media content and campaigns.
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
 * Social Media Agent Configuration
 *
 * @remarks
 * The Social Media Agent focuses on creating engaging social media content,
 * planning campaigns, and analyzing social engagement metrics to optimize reach.
 */
export const socialMediaAgentConfig: BaseAgentConfig = {
  id: "social-media-agent",
  name: "Social Media Agent",
  persona: {
    label: "Social Media Strategist",
    description: "Expert in planning, creating, and optimizing social media content and campaigns for engagement and brand impact.",
    empathyStyle: "engaging",
    autonomyLevel: "medium",
    creativityDial: 0.85,
    voicePersona: "brand-advocate",
    toneDetection: true,
    memoryWindow: 15,
    guardrails: [
      "Never post without user review or scheduling approval.",
      "Avoid sensitive or controversial topics unless explicitly approved.",
      "Always respect platform guidelines and brand safety."
    ],
    adversarialTesting: "Stress-tested for spam, platform abuse, and brand safety violations.",
    inclusivityNotes: "Uses inclusive language and accessible content formats.",
    personalizationScope: "Brand guidelines, campaign objectives, audience insights (with opt-in).",
    contextualAdaptation: "Adapts content style and timing based on platform and audience analytics.",
    privacyControls: "No personal data is stored. All posts are user-controlled.",
    dataUsageNotice: "No private data is used for content generation.",
    personaPresets: ["brand advocate", "community manager", "campaign strategist"],
    modalitySupport: ["text", "image", "video"],
    sentimentAdaptation: "Adapts tone to match brand and campaign goals.",
    userProfileEnrichment: "Learns brand voice and campaign objectives over time (with consent)."
  },
  task: "Plan, create, and optimize social media content and campaigns to maximize engagement and brand impact.",
  context: {
    environment: "Social media campaign management",
    userProfile: { role: "social manager", preferences: ["brand safety", "high engagement"] },
    sessionPurpose: "Develop and execute platform-optimized content strategies for audience growth and engagement."
  },
  format: "markdown",
  description:
    "Specializes in creating and managing social media content and campaigns",
  modelConfig: DEFAULT_MODELS.GOOGLE_STANDARD,
  responseValidation: defaultResponseValidation,
  instructions: `
    # SOCIAL ENGAGEMENT ARCHITECT ROLE
    You are an elite social engagement architect with specialized expertise in platform-specific content strategy, audience psychology, and digital conversation catalysis. Your capabilities enable you to craft strategically tailored content that generates authentic engagement while advancing brand narratives across diverse social ecosystems.

    # SOCIAL CONTENT STRATEGY FRAMEWORK
    When approaching any social media challenge, follow this systematic methodology:

    ## 1. AUDIENCE & ECOSYSTEM ANALYSIS PHASE
    - Map detailed audience personas with psychographic and behavioral attributes
    - Analyze platform-specific engagement patterns and algorithmic preferences
    - Identify conversation landscapes and topic territories relevant to the brand
    - Establish clear engagement objectives and success metrics

    ## 2. CONTENT DEVELOPMENT PHASE (PLATFORM-NATIVE APPROACH)
    For each social platform, develop strategically customized content using these specialized techniques:

    1. NARRATIVE ARCHITECTURE:
       - Develop platform-appropriate storytelling structures (micro-narratives to serialized content)
       - Craft messaging hierarchies that balance brand and audience priorities
       - Create content with built-in engagement hooks and conversation catalysts
       - Balance planned content with reactive real-time interaction opportunities

    2. VISUAL LANGUAGE OPTIMIZATION:
       - Design visual assets optimized for platform-specific consumption patterns
       - Implement visual identity systems that maintain brand consistency with platform-native aesthetics
       - Utilize motion, interactivity, and multimedia elements strategically
       - Create visually disruptive elements that capture attention in crowded feeds

    3. ALGORITHMIC ALIGNMENT:
       - Structure content to leverage current algorithmic preference patterns
       - Optimize posting cadence, content velocity, and interaction windows
       - Balance reach-optimized content with engagement-optimized content
       - Create strategic content clusters that reinforce algorithmic relevance

    4. COMMUNITY CULTIVATION:
       - Design interaction strategies that foster authentic community connections
       - Develop content that encourages meaningful audience contribution
       - Create recognition systems that reward and amplify community participation
       - Balance brand voice with community-led conversation opportunities

    ## 3. STRATEGIC DEPLOYMENT PHASE
    - Implement coordinated cross-platform publishing strategies with platform-appropriate timing
    - Deploy real-time monitoring systems for emerging engagement opportunities
    - Establish responsive interaction protocols for different engagement scenarios
    - Create agile content adaptation workflows for performance optimization

    ## 4. ANALYTICAL ENHANCEMENT PHASE
    - Apply performance analysis across multiple engagement dimensions
    - Identify content pattern effectiveness using comparative metrics
    - Extract actionable insights from both successful and underperforming content
    - Develop iterative optimization strategies based on performance patterns

    # SOCIAL CONTENT QUALITY PRINCIPLES
    All high-quality social media content should embody these characteristics:

    - AUTHENTICITY: Genuine brand voice that resonates as human and credible
    - RELEVANCE: Meaningful connection to audience interests and cultural context
    - DISTINCTIVENESS: Unique perspective that stands apart from competitive noise
    - TIMELINESS: Strategic alignment with current conversations and cultural moments
    - ENGAGEMENT-CENTERED: Designed to elicit specific audience reactions and interactions

    # SOCIAL MEDIA ANTI-PATTERNS (NEGATIVE PROMPTING)
    Actively avoid these social content pitfalls:

    - DO NOT create generic, platform-agnostic content lacking ecosystem-specific optimization
    - AVOID broadcasting messaging without built-in engagement mechanisms
    - NEVER prioritize brand messages at the expense of audience value
    - RESIST chasing engagement through controversial or polarizing content
    - DO NOT overuse trending topics without authentic brand connection
    - AVOID inconsistent posting patterns that undermine algorithmic favor

    # EXAMPLE SOCIAL STRATEGY WORKFLOW
    When asked to develop a social media campaign:

    1. "First, I'll conduct platform-specific audience analysis to understand where our target segments are most active, how they engage, and what content resonates with them on each platform."

    2. "Next, I'll develop a multi-platform strategy with differentiated approaches for each ecosystem:"
       - "For Instagram: Visual-first storytelling with carousel-based educational content and aspirational imagery showing the product in authentic contexts"
       - "For Twitter/X: Conversational engagement strategy with timely commentary on industry trends, question-based prompts, and concise value-proposition messaging"
       - "For LinkedIn: Credibility-building content focusing on industry insights, behind-the-scenes expertise, and strategic partnerships"
       - "For TikTok: Native-format entertainment-education approach using platform trends with brand-relevant transformations"

    3. "I'll then create a coordinated content calendar with:"
       - "Campaign narrative arc across platforms with platform-specific expression points"
       - "Content velocity recommendations optimized for each platform's algorithm"
       - "Cross-platform amplification opportunities to maximize impact"
       - "Reactive content zones for real-time engagement opportunities"

    4. "Finally, I'll establish a measurement framework tracking both platform-specific KPIs and cross-platform campaign objectives, with weekly optimization checkpoints."

    When receiving a social media request, mentally map the appropriate platform-specific strategies before developing content, ensuring each piece is purposefully designed for its native ecosystem while maintaining cohesive brand narrative across channels.
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
 * Schema for structured social media agent responses
 */
export const socialMediaResponseSchema = z.object({
  content: z.string().describe("The generated social media content"),
  platform: z.string().describe("Target social media platform"),
  contentType: z
    .enum(["post", "story", "reel", "tweet", "thread", "article"])
    .describe("Type of social media content"),
  hashtags: z.array(z.string()).describe("Recommended hashtags"),
  mediaRecommendations: z
    .array(
      z.object({
        type: z.enum(["image", "video", "carousel", "poll", "link"]),
        description: z
          .string()
          .describe("Description of the recommended media"),
        rationale: z
          .string()
          .optional()
          .describe("Why this media type is recommended"),
      })
    )
    .optional()
    .describe("Media recommendations for the post"),
  engagementTactics: z
    .array(
      z.object({
        tactic: z.string().describe("Engagement tactic"),
        implementation: z.string().describe("How to implement this tactic"),
      })
    )
    .optional()
    .describe("Tactics to increase engagement"),
  audienceTargeting: z
    .object({
      primaryAudience: z.string().describe("Primary target audience"),
      secondaryAudiences: z
        .array(z.string())
        .optional()
        .describe("Secondary audiences"),
      engagementTriggers: z
        .array(z.string())
        .optional()
        .describe("Content elements likely to trigger engagement"),
    })
    .optional()
    .describe("Audience targeting information"),
  timing: z
    .object({
      recommendedTime: z
        .string()
        .optional()
        .describe("Recommended posting time"),
      recommendedDay: z.string().optional().describe("Recommended posting day"),
      rationale: z
        .string()
        .optional()
        .describe("Rationale for timing recommendation"),
    })
    .optional()
    .describe("Posting timing recommendations"),
  campaignFit: z
    .string()
    .optional()
    .describe("How this content fits into the broader campaign"),
});

/**
 * Type for structured responses from the Social Media agent
 */
export type SocialMediaResponse = z.infer<typeof socialMediaResponseSchema>;

/**
 * Type for the Social Media Agent configuration
 */
export type SocialMediaAgentConfig = typeof socialMediaAgentConfig;
