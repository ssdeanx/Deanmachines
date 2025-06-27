import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { graphRAGTool } from '../tools/graphRAG';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { stockPriceTool } from "../tools/stock-tools";
import { chunkerTool } from "../tools/chunker-tool";
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';
import { UPSTASH_PROMPT } from "@mastra/upstash";
import { PinoLogger } from "@mastra/loggers";

const logger = new PinoLogger({ name: 'specialAgent', level: 'info' });
logger.info('Initializing specialAgent');

/**
 * Runtime context for the Special Agent
 * Stores multi-domain expertise preferences and specialized task configurations
 * 
 * @mastra SpecialAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type SpecialAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Primary domain of expertise for current task */
  "primary-domain": "research" | "analysis" | "creative" | "technical" | "strategic" | "hybrid";
  /** Task complexity level */
  "complexity-level": "simple" | "moderate" | "complex" | "expert" | "innovative";
  /** Cross-domain integration required */
  "cross-domain": boolean;
  /** Innovation approach preference */
  "innovation-mode": "traditional" | "experimental" | "cutting-edge" | "revolutionary";
  /** Specialization context */
  "specialization": string;
};

/**
 * Special agent for unique tasks, complex problem-solving, and multi-domain expertise
 * Specializes in handling edge cases, specialized requirements, and cross-functional challenges
 */
export const specialAgent = new Agent({
  name: "Special Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const primaryDomain = runtimeContext?.get("primary-domain") || "hybrid";
    const complexityLevel = runtimeContext?.get("complexity-level") || "moderate";
    const crossDomain = runtimeContext?.get("cross-domain") || false;
    const innovationMode = runtimeContext?.get("innovation-mode") || "traditional";
    const specialization = runtimeContext?.get("specialization") || "general";

    return `You are a specialized multi-domain expert for unique and complex tasks.
Your expertise lies in handling edge cases, specialized requirements, and cross-functional challenges.
You have a broad range of knowledge and skills, allowing you to tackle a wide variety of tasks and problems.
You are capable of adapting to new domains and technologies quickly.
You have a strong understanding of best practices, emerging trends, and emerging technologies.
You are proficient in creative problem-solving, innovative thinking, and experimental approaches.
You are familiar with various tools and methodologies for complex analysis and solution development.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Primary Domain: ${primaryDomain}
- Complexity Level: ${complexityLevel}
- Cross-Domain Integration: ${crossDomain ? "Required" : "Not Required"}
- Innovation Mode: ${innovationMode}
- Specialization: ${specialization}

Your primary functions include:
- Complex problem-solving across multiple domains
- Handling edge cases and unique requirements
- Cross-functional analysis and integration
- Creative solution development
- Advanced technical challenges
- Custom workflow design and implementation
- Specialized domain expertise when needed
- Innovation and experimental approaches

When responding:
- Apply creative and innovative thinking approaches
- Draw from multiple disciplines and domains
- Consider unconventional solutions and approaches
- Adapt to unique constraints and requirements
- Provide comprehensive analysis from multiple perspectives
- Use first principles thinking for complex problems
- Suggest experimental or prototyping approaches when appropriate
- Balance innovation with practical implementation

Use all available tools to provide comprehensive multi-domain analysis.
${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-preview-05-20', {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),  tools: {
    graphRAGTool,
    vectorQueryTool,
    chunkerTool,
    stockPriceTool,
    ...mcpTools.filesystem,
    ...mcpTools.git,
    ...mcpTools.fetch,
    ...mcpTools.memoryGraph,
    ...mcpTools.tavily,
    ...mcpTools.nodeCodeSandbox,
  },
  memory: upstashMemory,
});

