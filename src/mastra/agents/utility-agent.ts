import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { enhancedVectorQueryTool, hybridVectorSearchTool, vectorQueryTool } from "../tools/vectorQueryTool";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { getMCPToolsByServer } from '../tools/mcp';
import { chunkerTool } from "../tools/chunker-tool";
import { rerankTool } from "../tools/rerank-tool";
import { graphRAGTool, graphRAGUpsertTool } from "../tools/graphRAG";
import { mem0RememberTool, mem0MemorizeTool } from "../tools/mem0-tool";

const logger = createAgentDualLogger('utilityAgent');
logger.info('Initializing utilityAgent');

/**
 * Runtime context for the Utility Agent
 * Stores general utility preferences, task configurations, and helper function settings
 * 
 * @mastra UtilityAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type UtilityAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Utility function category */
  "utility-category": "data" | "file" | "network" | "text" | "math" | "date" | "general";
  /** Operation complexity preference */
  "complexity-preference": "simple" | "moderate" | "advanced" | "expert";
  /** Output format preference */
  "output-format": "json" | "text" | "csv" | "xml" | "html" | "yaml";
  /** Error handling approach */
  "error-handling": "silent" | "warning" | "strict" | "verbose";
  /** Performance optimization level */
  "optimization-level": "standard" | "memory" | "speed" | "balanced";
};

/**
 * Utility agent for general-purpose tasks, helper functions, and common operations
 * Specializes in versatile problem-solving and support functions
 */
export const utilityAgent = new Agent({
  name: "Utility Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const utilityCategory = runtimeContext?.get("utility-category") || "general";
    const complexityPreference = runtimeContext?.get("complexity-preference") || "moderate";
    const outputFormat = runtimeContext?.get("output-format") || "text";
    const errorHandling = runtimeContext?.get("error-handling") || "strict";
    const optimizationLevel = runtimeContext?.get("optimization-level") || "balanced";

    return `You are a versatile general-purpose assistant for various utility tasks.
Your expertise lies in providing practical solutions, helper functions, and general problem-solving capabilities.
You have a strong understanding of common operations, data manipulation, and task automation.
You are proficient in creating reusable functions, optimizing workflows, and simplifying complex tasks.
You are familiar with various programming languages, data formats, and utility libraries.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Utility Category: ${utilityCategory}
- Complexity Preference: ${complexityPreference}
- Output Format: ${outputFormat}
- Error Handling: ${errorHandling}
- Optimization Level: ${optimizationLevel}

Your primary functions include:
- General problem-solving and task assistance
- Text processing and manipulation
- Data formatting and conversion
- Simple calculations and computations
- File organization and management guidance
- Quick research and information lookup
- Template creation and standardization
- Helper function development

When responding:
- Provide efficient and practical solutions
- Consider reusability and modularity of solutions
- Suggest automation opportunities for repetitive tasks
- Focus on simplicity and clarity for ${complexityPreference} complexity level
- Provide step-by-step guidance when needed
- Consider edge cases and error scenarios (${errorHandling} approach)
- Recommend appropriate tools and libraries
- Optimize for ease of use and maintenance (${optimizationLevel} optimization)
- Format output as ${outputFormat} when applicable
- Target ${utilityCategory} utility operations

Use available tools to query relevant information and patterns.`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),  tools: {
    vectorQueryTool,
    hybridVectorSearchTool,
    enhancedVectorQueryTool,
    graphRAGTool,
    graphRAGUpsertTool,
    chunkerTool,
    rerankTool,
    mem0RememberTool,
    mem0MemorizeTool,
    ...await getMCPToolsByServer('filesystem'),
    ...await getMCPToolsByServer('git'),
    ...await getMCPToolsByServer('fetch'),
    ...await getMCPToolsByServer('puppeteer'),
    ...await getMCPToolsByServer('github'),
    ...await getMCPToolsByServer('memoryGraph'),
    ...await getMCPToolsByServer('neo4j'),
    ...await getMCPToolsByServer('sequentialThinking'),
    ...await getMCPToolsByServer('tavily'),
    ...await getMCPToolsByServer('nodeCodeSandbox'),
  },
  memory: upstashMemory,
});

