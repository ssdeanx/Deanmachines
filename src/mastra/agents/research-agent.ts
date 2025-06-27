import { Agent } from "@mastra/core/agent";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { agentMemory } from '../agentMemory';
import { upstashMemory } from '../upstashMemory';
import { graphRAGTool } from '../tools/graphRAG';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';
import { PinoLogger } from "@mastra/loggers";

import { z } from 'zod';
import { UPSTASH_PROMPT } from "@mastra/upstash";


/**
 * Runtime context type for the Research Agent
 * Stores research preferences and source filtering context
 * 
 * @mastra ResearchAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type ResearchAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Research depth level */
  "research-depth": "surface" | "detailed" | "comprehensive";
  /** Source types to include */
  "source-types": string[];
  /** Maximum sources to gather */
  "max-sources": number;
  /** Include academic sources */
  "include-academic": boolean;
  /** Language preferences for sources */
  "language-filter": string[];
  /** Research focus area */
  "focus-area": string;
};

const logger = new PinoLogger({ name: 'ResearchAgent', level: 'info' });
logger.info('Initializing ResearchAgent');

const researchAgentInputSchema = z.object({
  query: z.string().min(1).describe("Research query or topic"),
  depth: z.enum(["surface", "detailed", "comprehensive"]).optional(),
  sources: z.array(z.string()).optional(),
  maxResults: z.number().positive().optional(),
});

const researchAgentOutputSchema = z.object({
  findings: z.string().describe("Research findings and insights"),
  sources: z.array(z.string()).describe("Sources used in research"),
  confidence: z.number().min(0).max(1).describe("Confidence score"),
  methodology: z.string().describe("Research methodology used"),
});

/**
 * Enhanced Research Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety
 */
const researchAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'research-depth': z.enum(["surface", "detailed", "comprehensive"]).describe('Research depth level'),
    'source-types': z.array(z.string()).describe('Source types to include'),
    'max-sources': z.number().positive().describe('Maximum sources to gather'),
    'include-academic': z.boolean().describe('Include academic sources'),
    'language-filter': z.array(z.string()).describe('Language preferences for sources'),
    'focus-area': z.string().describe('Research focus area')
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  evals: z.record(z.any()).describe('Evaluation metrics for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();


logger.info('Initializing researchAgent');

/**
 * Research agent for information gathering, analysis, and knowledge synthesis
 * Specializes in comprehensive research, fact-checking, and insight generation
 */
export const researchAgent = new Agent({
  name: "Research Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const researchDepth = runtimeContext?.get("research-depth") || "detailed";    const sourceTypes = (runtimeContext?.get("source-types") as string[]) || ["web", "academic"];
    const maxSources = runtimeContext?.get("max-sources") || 10;
    const includeAcademic = runtimeContext?.get("include-academic") || false;
    const languageFilter = (runtimeContext?.get("language-filter") as string[]) || ["en"];
    const focusArea = runtimeContext?.get("focus-area") || "general";

    return `You are a specialized research and information analysis assistant. Your expertise lies in comprehensive research, fact-checking, and insight generation. You have a strong understanding of research methodologies, information retrieval techniques, and critical analysis skills. You are proficient in gathering information from diverse sources, verifying facts, and synthesizing complex data into actionable insights.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Research Depth: ${researchDepth}
- Source Types: ${sourceTypes.join(', ')}
- Max Sources: ${maxSources}
- Include Academic: ${includeAcademic ? 'YES' : 'NO'}
- Language Filter: ${languageFilter.join(', ')}
- Focus Area: ${focusArea}

You are familiar with various research tools and can adapt to different research domains and topics.

Your primary functions include:
- Comprehensive information gathering and research
- Fact-checking and source verification
- Market research and competitive analysis
- Technical research and feasibility studies
- Literature review and academic research
- Trend analysis and forecasting
- Knowledge synthesis and insight generation
- Research methodology and approach recommendations

When responding:
- Gather information from multiple reliable sources
- Verify facts and cross-reference information
- Provide balanced and objective analysis
- Cite sources and maintain research integrity
- Structure research findings logically and clearly
- Identify knowledge gaps and areas for further investigation
- Synthesize complex information into actionable insights
- Consider both quantitative and qualitative research methods

Use available tools to access knowledge graphs and perform comprehensive searches.
${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17',  {
    responseModalities: ["TEXT"],
    thinkingConfig: {
      thinkingBudget: 512, // -1 means dynamic thinking budget
      includeThoughts: false, // Include thoughts for debugging and monitoring purposes
    },
  }),  
  tools: {
    graphRAGTool,
    vectorQueryTool,
    chunkerTool,
    ...mcpTools.filesystem,
    ...mcpTools.memgraph,
    ...mcpTools.sequentialThinking,
    ...mcpTools.github,
    ...mcpTools.puppeteer,
    ...mcpTools.fetch,
    ...mcpTools.tavily,

  }, 
  memory: upstashMemory,
});

/**
 * Validation functions for research agent operations
 * @mastra ResearchAgent validation functions with error handling
 */
export function validateResearchInput(input: unknown): z.infer<typeof researchAgentInputSchema> {
  try {
    return researchAgentInputSchema.parse(input);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Invalid research agent input', { 
      error: errorMessage, 
      input: JSON.stringify(input, null, 2)
    });
    throw error;
  }
}

export function validateResearchOutput(output: unknown): z.infer<typeof researchAgentOutputSchema> {
  try {
    return researchAgentOutputSchema.parse(output);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Invalid research agent output', { 
      error: errorMessage, 
      output: JSON.stringify(output, null, 2)
    });
    throw error;
  }
}

function validateResearchAgentConfig(config: unknown): z.infer<typeof researchAgentConfigSchema> {
  try {
    return researchAgentConfigSchema.parse(config);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Invalid research agent config', { 
      error: errorMessage, 
      config: JSON.stringify(config, null, 2)
    });
    throw error;
  }
}

export { researchAgentInputSchema, researchAgentOutputSchema, researchAgentConfigSchema, validateResearchAgentConfig };