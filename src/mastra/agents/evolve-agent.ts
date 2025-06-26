import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { graphRAGTool } from '../tools/graphRAG';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';

const logger = createAgentDualLogger('EvolveAgent');
logger.info('Initializing EvolveAgent');

/**
 * Runtime context for the Evolve Agent
 * Stores evolution preferences, learning configurations, and improvement tracking
 * 
 * @mastra EvolveAgent runtime context interface
 * [EDIT: 2025-06-18] [BY: SSD]
 */
export type EvolveAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Evolution target focus */
  "evolution-target": "performance" | "capabilities" | "efficiency" | "accuracy" | "adaptability";
  /** Learning approach preference */
  "learning-approach": "incremental" | "experimental" | "data-driven" | "feedback-based" | "hybrid";
  /** Improvement scope */
  "improvement-scope": "individual" | "team" | "system" | "network" | "platform";
  /** Change tolerance level */
  "change-tolerance": "conservative" | "moderate" | "progressive" | "revolutionary";
  /** Success measurement criteria */
  "success-criteria": string;
};

/**
 * Data agent for data analysis, processing, and insights generation
 * Specializes in data manipulation, statistical analysis, and visualization
 */
export const evolveAgent = new Agent({
  name: "Evolve Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const evolutionTarget = runtimeContext?.get("evolution-target") || "efficiency";
    const learningApproach = runtimeContext?.get("learning-approach") || "hybrid";
    const improvementScope = runtimeContext?.get("improvement-scope") || "individual";
    const changeTolerance = runtimeContext?.get("change-tolerance") || "moderate";
    const successCriteria = runtimeContext?.get("success-criteria") || "performance improvement";

    return `You are a specialized evolve agent that specializes in system evolution, learning, and improvement strategies. Your primary focus is on enhancing system capabilities, adapting to new challenges, and optimizing performance through continuous learning and evolution.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Evolution Target: ${evolutionTarget}
- Learning Approach: ${learningApproach}
- Improvement Scope: ${improvementScope}
- Change Tolerance: ${changeTolerance}
- Success Criteria: ${successCriteria}
    
Your primary functions include:
- evolve the system
- learn from data patterns
- adapt strategies based on insights
- optimize processes through analysis
- generate insights for decision making
- identify trends and anomalies
- provide recommendations for improvement
- analyze complex datasets

When responding:
- Apply relevant strategies based on the evolution target and learning approach.
- Consider the improvement scope and change tolerance when making recommendations.
- Use success criteria to measure progress and adjust strategies accordingly.

Use available tools for data querying, graph analysis, and financial data.`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),  
  tools: {
    graphRAGTool,
    vectorQueryTool,
    chunkerTool,
    ...mcpTools.filesystem,
    ...mcpTools.git,
    ...mcpTools.tavily,
    ...mcpTools.memoryGraph,
  },
  memory: upstashMemory,
});
