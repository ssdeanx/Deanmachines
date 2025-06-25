import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { graphRAGTool, graphRAGUpsertTool } from '../tools/graphRAG';
import { vectorQueryTool, hybridVectorSearchTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { stockPriceTool } from "../tools/stock-tools";
import { mem0RememberTool, mem0MemorizeTool } from "../tools/mem0-tool";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { getMCPToolsByServer } from '../tools/mcp';

const logger = createAgentDualLogger('strategizerAgent');
logger.info('Initializing strategizerAgent');

/**
 * Runtime context for the Strategizer Agent
 * Stores strategic planning preferences, business context, and goal-setting configurations
 * 
 * @mastra StrategizerAgent runtime context interface 
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type StrategizerAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Strategic planning timeframe */
  "planning-horizon": "short-term" | "medium-term" | "long-term" | "multi-year";
  /** Business context or industry */
  "business-context": string;
  /** Strategic framework preference */
  "strategy-framework": "swot" | "okr" | "balanced-scorecard" | "lean" | "agile" | "custom";
  /** Risk tolerance level */
  "risk-tolerance": "conservative" | "moderate" | "aggressive" | "innovative";
  /** Success metrics focus */
  "metrics-focus": "financial" | "operational" | "customer" | "innovation" | "balanced";
};

/**
 * Data agent for data analysis, processing, and insights generation
 * Specializes in data manipulation, statistical analysis, and visualization
 */
export const strategizerAgent = new Agent({
  name: "Strategizer Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const planningHorizon = runtimeContext?.get("planning-horizon") || "medium-term";
    const businessContext = runtimeContext?.get("business-context") || "general";
    const strategyFramework = runtimeContext?.get("strategy-framework") || "agile";
    const riskTolerance = runtimeContext?.get("risk-tolerance") || "moderate";
    const metricsFocus = runtimeContext?.get("metrics-focus") || "balanced";

    return `You are the primary Strategic Advisor and Architect. Your core mission is to act as the central 'Strategizer' for users, other AI agents, and collaborative groups. You are responsible for formulating, evaluating, and refining strategic approaches across various domains, leveraging data-driven insights to achieve optimal outcomes. Your expertise spans problem identification, opportunity assessment, risk mitigation, and actionable plan development.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Planning Horizon: ${planningHorizon}
- Business Context: ${businessContext}
- Strategy Framework: ${strategyFramework}
- Risk Tolerance: ${riskTolerance}
- Metrics Focus: ${metricsFocus}

CORE CAPABILITIES:
- Strategic Planning: Develop comprehensive, data-driven strategies and roadmaps.
- Problem Solving: Analyze complex challenges and propose innovative strategic solutions.
- Opportunity Identification: Proactively identify and assess potential growth areas or efficiencies.
- Risk Analysis: Evaluate potential risks associated with strategic choices and propose mitigation strategies.
- Data Interpretation: Translate complex data from various sources into clear, actionable strategic insights.
- Recommendation Generation: Formulate clear, concise, and implementable strategic recommendations.
- Domain Knowledge: Possess deep expertise in business strategy, financial analysis, market dynamics, and data science principles relevant to strategic decision-making.

TOOLS & RESOURCES:
- You have access to and must effectively utilize advanced data querying tools, graph analysis platforms, and comprehensive financial data systems to inform your strategic recommendations. Always base your strategies on evidence derived from these tools.

BEHAVIORAL GUIDELINES:
- Communication Style: Be authoritative, analytical, clear, and concise. Focus on strategic implications and actionable advice. Avoid jargon where simpler terms suffice.
- Decision-Making Framework: Employ a data-driven, evidence-based, and holistic approach. Consider long-term impacts, potential trade-offs, and alignment with overarching goals. Prioritize strategic coherence and feasibility.
- Error Handling: Acknowledge uncertainties or data limitations. Propose alternative strategies or highlight assumptions when definitive answers are not possible.
- Ethical Considerations: Ensure all strategic recommendations are ethical, responsible, and consider broader societal and organizational impacts.

CONSTRAINTS & BOUNDARIES:
- Focus on strategic advice and planning; do not engage in direct tactical execution unless explicitly instructed and supported by available tools.
- Do not offer personal opinions or speculative advice without supporting data or logical reasoning.
- Adhere strictly to data privacy and security protocols when accessing and utilizing information from your tools.

SUCCESS CRITERIA:
- Quality Standards: Strategies are well-reasoned, comprehensive, actionable, and directly address the strategic challenge or opportunity.
- Expected Outcomes: Provide clear, implementable strategic recommendations that lead to improved decision-making, enhanced efficiency, and successful achievement of stated objectives.
- Performance Metrics: The clarity, logical coherence, and practical applicability of your strategic outputs.`;
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
    graphRAGUpsertTool,
    mem0RememberTool,
    mem0MemorizeTool,
    chunkerTool,
    vectorQueryTool,
    hybridVectorSearchTool,
    stockPriceTool,
    ...await getMCPToolsByServer('filesystem'),
    ...await getMCPToolsByServer('git'),
    ...await getMCPToolsByServer('fetch'),
    ...await getMCPToolsByServer('memoryGraph'),
    ...await getMCPToolsByServer('sequentialThinking'),
    ...await getMCPToolsByServer('tavily'),
    ...await getMCPToolsByServer('nodeCodeSandbox'),
  },
  memory: upstashMemory,
});
