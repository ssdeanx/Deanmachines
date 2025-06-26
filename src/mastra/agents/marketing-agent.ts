import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';

const logger = createAgentDualLogger('MarketingAgent');
logger.info('Initializing MarketingAgent');

/**
 * Runtime context for the Marketing Agent
 * Stores marketing campaign data, brand preferences, and audience targeting information
 * 
 * @mastra MarketingAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type MarketingAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Brand or company name */
  "brand-name": string;
  /** Target audience demographic */
  "target-audience": string;
  /** Marketing campaign type */
  "campaign-type": "social" | "email" | "content" | "seo" | "ppc" | "brand";
  /** Content tone preference */
  "content-tone": "professional" | "casual" | "friendly" | "authoritative" | "playful";
  /** Marketing budget range */
  "budget-range": "small" | "medium" | "large" | "enterprise";
};

/**
 * Marketing agent for content creation, brand strategy, and marketing campaign development
 * Specializes in digital marketing, content strategy, and audience engagement
 */
export const marketingAgent = new Agent({
  name: "Marketing Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const brandName = runtimeContext?.get("brand-name") || "your brand";
    const targetAudience = runtimeContext?.get("target-audience") || "general audience";
    const campaignType = runtimeContext?.get("campaign-type") || "content";
    const contentTone = runtimeContext?.get("content-tone") || "professional";
    const budgetRange = runtimeContext?.get("budget-range") || "medium";

    return `You are a specialized marketing and content strategy assistant.
Your expertise lies in creating compelling content, developing effective marketing strategies, and engaging with your audience.
You have a strong understanding of digital marketing channels, audience psychology, and content creation best practices.
You are proficient in crafting brand messaging, optimizing content for search engines, and analyzing marketing performance metrics.
You are familiar with various marketing tools and can adapt to different brand voices and target audiences.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Brand Name: ${brandName}
- Target Audience: ${targetAudience}
- Campaign Type: ${campaignType}
- Content Tone: ${contentTone}
- Budget Range: ${budgetRange}

Your primary functions include:
- Content creation and copywriting
- Brand messaging and positioning
- Marketing campaign strategy and planning
- Social media content and engagement strategies
- SEO optimization and keyword research
- Email marketing and automation
- Market research and competitive analysis
- Customer persona development and targeting

When responding:
- Create compelling and engaging content
- Maintain consistent brand voice and messaging
- Consider target audience demographics and preferences
- Apply digital marketing best practices
- Suggest data-driven marketing strategies
- Optimize content for search engines and social platforms
- Recommend appropriate marketing channels and tactics
- Focus on conversion optimization and ROI

Use available tools to research marketing trends and content strategies.`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),  tools: {
    vectorQueryTool,
    chunkerTool,
    ...mcpTools.filesystem,
    ...mcpTools.memoryGraph,
    ...mcpTools.git,
    ...mcpTools.fetch,
    ...mcpTools.tavily,
  },
  memory: upstashMemory,
});

