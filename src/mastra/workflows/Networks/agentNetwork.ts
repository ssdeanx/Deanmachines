/**
 * @file src/mastra/workflows/Networks/agentNetwork.ts
 * @description Defines and exports various AgentNetworks for DeanmachinesAI,
 *              including specialized collaborative networks and a Mixture of Experts (MoE) network.
 * @version 1.2.0 - Added KnowledgeWorkMoENetwork, preserving original structure
 */

import { google } from "@ai-sdk/google";
import { AgentNetwork, type AgentNetworkConfig } from "@mastra/core/network";
import { createResponseHook } from "../../hooks"; // Assuming this path is correct
import agents from "../../agents"; // Central agent registry map
import { DEFAULT_MODELS } from "../../agents/config"; // Import for MoE config
import { KnowledgeWorkMoENetwork } from "./knowledgeWorkMoE.network"; // Import the MoE network class
import { createLogger } from "@mastra/core/logger";
import { configureLangSmithTracing } from "../../services/langsmith";
import { applySharedHooks, instrumentNetwork, renderTemplate, scheduleHealthChecks, registerNetworkHooks, fallbackNetworkInvoke } from './networkHelpers';

const logger = createLogger({ name: "agentNetwork", level: "info" });

// LangSmith tracing and any tracing/logging that could trigger thread creation must only be initialized at runtime, not at module scope.
// Any tracing requiring thread context is now handled in runtime initializers or execution paths only.

// Base configuration for all networks to match agent configuration
// Core properties shared by all networks
const baseNetworkConfig: Partial<AgentNetworkConfig> = {
  model: google("models/gemini-2.0-flash"),
  // Note: shared hooks are applied in individual network configurations
  //  is handled separately as it may not be part of AgentNetworkConfig
};

// --- Original Hook Definitions (Unchanged) ---
const deanInsightsHooks = {
  onError: async (error: Error) => {
    console.error("Network error:", error);
    return {
      text: "The agent network encountered an error. Please try again or contact support.",
      error: error.message,
    };
  },
  onGenerateResponse: async (response: any) => {
    // Using 'any' temporarily, replace with actual response type
    // Apply base response validation logic if needed (extracted from createResponseHook)
    const baseHook = createResponseHook({
      minResponseLength: 50,
      maxAttempts: 3,
      validateResponse: (res) => {
        if (res.object) {
          return Object.keys(res.object).length > 0;
        }
        return res.text ? res.text.length >= 50 : false;
      },
    });
    const validatedResponse = await baseHook(response);

    // Add network-specific metadata
    return {
      ...validatedResponse,
      metadata: {
        ...(validatedResponse as any).metadata, // Assuming metadata exists
        network: "deanInsights",
        timestamp: new Date().toISOString(),
        agentCount: 5,
      },
    };
  },
};

const dataFlowHooks = {
  onError: async (error: Error) => {
    console.error("Network error:", error);
    return {
      text: "The agent network encountered an error. Please try again or contact support.",
      error: error.message,
    };
  },
  onGenerateResponse: async (response: any) => {
    const baseHook = createResponseHook({
      minResponseLength: 50,
      maxAttempts: 3,
      validateResponse: (res) => {
        if (res.object) {
          return Object.keys(res.object).length > 0;
        }
        return res.text ? res.text.length >= 50 : false;
      },
    });
    const validatedResponse = await baseHook(response);
    return {
      ...validatedResponse,
      metadata: {
        ...(validatedResponse as any).metadata,
        network: "dataFlow",
        timestamp: new Date().toISOString(),
        agentCount: 3,
      },
    };
  },
};

const contentCreationHooks = {
  // Assuming similar structure if needed
  onError: async (error: Error) => {
    console.error("Content Creation Network error:", error); /* ... */
  },
  onGenerateResponse: async (response: any) => {
    /* ... validation and metadata ... */ return response;
  },
};
// --- End Original Hook Definitions ---

// --- Network Instantiation moved to async initNetworks ---

/**
 * Exported promise that resolves to all initialized agent networks after all async setup is complete.
 */
// Exported async initializer for all agent networks. All instantiation and hook attachment is done at runtime.
export let networks: Record<string, AgentNetwork> = {};
export const networksPromise: Promise<Record<string, AgentNetwork>> = (async () => {


  // Now safe to instantiate networks
  const deanInsightsNetwork = new AgentNetwork({
    // id: "dean-insights", // ID is not part of AgentNetworkConfig, set via other means if necessary
    ...baseNetworkConfig, // Includes core config
    model: baseNetworkConfig.model!, // Ensure model is explicitly provided and non-null
    name: "DeanInsights Network",
    agents: [
      agents.researchAgent,
      agents.analystAgent,
      agents.writerAgent,
      agents.rlTrainerAgent,
      agents.dataManagerAgent,
    ],
    instructions: renderTemplate(`
    You are a coordination system that routes queries to the appropriate specialized agents
    to deliver comprehensive and accurate insights.

    Your available agents are:

    1. Research Agent: Specializes in gathering and synthesizing information from various sources
    2. Analyst Agent: Specializes in analyzing data, identifying patterns, and extracting insights
    3. Writer Agent: Specializes in creating clear, engaging, and well-structured documentation
    4. RL Trainer Agent: Specializes in optimizing agent performance through reinforcement learning
    5. Data Manager Agent: Specializes in file operations and data organization

    For each user query:
    1. Start with the Research Agent to gather relevant information
    2. Route specific analytical tasks to the Analyst Agent
    3. Use the Data Manager Agent for any file operations needed
    4. Have the Writer Agent synthesize findings into a coherent response
    5. Periodically use the RL Trainer Agent to improve overall system performance

    Best practices:
    - Provide clear context when routing between agents
    - Avoid unnecessary agent switches that could lose context
    - Use the most specialized agent for each specific task
    - Ensure attribution of which agent contributed which information
    - When uncertain about a claim, use the Research Agent to verify it

    Note: Each agent has access to specific capabilities:
    - Research Agent: Web search (Exa), document search, knowledge base access
    - Analyst Agent: Data analysis with web search capabilities
    - Writer Agent: Content formatting with web search integration
    - RL Trainer Agent: Performance optimization with feedback tools
    - Data Manager Agent: File operations with knowledge base integration

    Coordinate these capabilities effectively to deliver comprehensive results.

    You should maintain a neutral, objective tone and prioritize accuracy and clarity.
  `, { agentList: [agents.researchAgent, agents.analystAgent, agents.writerAgent, agents.rlTrainerAgent, agents.dataManagerAgent].map(a => a.name).join(', ') }),
  });

  // Apply shared hooks, instrumentation, and  compaction
  applySharedHooks(deanInsightsNetwork, {
    onError: deanInsightsHooks.onError,
    onGenerateResponse: deanInsightsHooks.onGenerateResponse,
  });
  instrumentNetwork(deanInsightsNetwork);

  /**
   * DataFlow Network
   *
   * A specialized network focused on data processing, file operations, and analysis
   */
  const dataFlowNetwork = new AgentNetwork({
    // id: "data-flow", // ID is not part of AgentNetworkConfig, set via other means if necessary
    ...baseNetworkConfig, // Includes core config
    model: baseNetworkConfig.model!, // Ensure model is explicitly provided
    name: "DataFlow Network",
    agents: [agents.dataManagerAgent, agents.analystAgent, agents.rlTrainerAgent],
    instructions: renderTemplate(`
    You are a data processing coordination system that orchestrates specialized agents
    to handle data operations, analysis, and optimization tasks.

    Your available agents are:

    1. Data Manager Agent: Specializes in file operations and data organization
    2. Analyst Agent: Specializes in analyzing data, identifying patterns, and extracting insights
    3. RL Trainer Agent: Specializes in optimizing agent performance through reinforcement learning

    For each user task:
    1. Start with the Data Manager Agent to handle file operations and data retrieval
    2. Route analytical tasks to the Analyst Agent to extract meaningful insights
    3. Use the RL Trainer Agent to continuously improve performance based on feedback

    Best practices:
    - Ensure data integrity across all operations
    - Validate inputs and outputs between agent handoffs
    - Log key metrics throughout the process
    - Apply proper error handling at each stage
    - Use the RL Trainer to identify optimization opportunities

    Note: Your agents have the following enhanced capabilities:
    - Data Manager: File operations with knowledge base integration
    - Analyst: Data analysis with web search capabilities
    - RL Trainer: Performance optimization with feedback tools

    Use these capabilities in combination for optimal results.

    Focus on producing accurate, engaging, and valuable content that effectively communicates complex information.
  `, { agentList: [agents.dataManagerAgent, agents.analystAgent, agents.rlTrainerAgent].map(a => a.name).join(', ') }),
  });

  applySharedHooks(dataFlowNetwork, {
    onError: dataFlowHooks.onError,
    onGenerateResponse: dataFlowHooks.onGenerateResponse,
  });
  instrumentNetwork(dataFlowNetwork);

  /**
   * ContentCreation Network
   *
   */
  const contentCreationNetwork = new AgentNetwork({
    // id: "content-creation", // ID is not part of AgentNetworkConfig, set via other means if necessary
    ...baseNetworkConfig, // Includes model and 
    model: baseNetworkConfig.model!, // Ensure model is explicitly provided and non-null
    name: "ContentCreation Network",
    agents: [agents.researchAgent, agents.writerAgent, agents.rlTrainerAgent],
    instructions: renderTemplate(`
    You are a content creation coordination system that orchestrates the process
    of researching topics and producing high-quality, well-structured content.

    Your available agents are:

    1. Research Agent: Specializes in gathering and synthesizing information from various sources
    2. Writer Agent: Specializes in creating clear, engaging, and well-structured documentation
    3. RL Trainer Agent: Specializes in optimizing content quality through reinforcement learning

    For each content request:
    1. Start with the Research Agent to gather comprehensive information on the topic
    2. Route to the Writer Agent to transform research into engaging, well-structured content
    3. Use the RL Trainer Agent to analyze feedback and improve content quality over time

    Best practices:
    - Ensure factual accuracy by thorough research
    - Maintain consistent tone and style throughout the content
    - Structure content for maximum readability and engagement
    - Incorporate user feedback to continuously improve content quality
    - Use appropriate formatting and organization for different content types

    Note: Your agents have these enhanced capabilities:
    - Research Agent: Web search (Exa), document search, knowledge base access
    - Writer Agent: Content formatting with web search integration
    - RL Trainer: Content quality optimization through feedback

    Leverage these tools for comprehensive content creation.

    Focus on producing accurate, engaging, and valuable content that effectively communicates complex information.
  `, { agentList: [agents.researchAgent, agents.writerAgent, agents.rlTrainerAgent].map(a => a.name).join(', ') }),
  });

  applySharedHooks(contentCreationNetwork, {
    onError: contentCreationHooks.onError,
    onGenerateResponse: contentCreationHooks.onGenerateResponse,
  });
  instrumentNetwork(contentCreationNetwork);

  // --- MoE Network Instantiation (Runtime Safe) ---
  // All logic here is runtime-only; no thread or tracing operations at module load.
  const moeExpertIds: (keyof typeof agents)[] = [
    "researchAgent",
    "analystAgent",
    "writerAgent",
    "coderAgent",
    "debuggerAgent",
    "architectAgent",
    "codeDocumenterAgent",
    "dataManagerAgent",
    "marketResearchAgent",
    "copywriterAgent",
    "socialMediaAgent",
    "seoAgent",
    "uiUxCoderAgent",
    // 'agenticAssistant' // Fallback agent is added automatically by the MoE class if valid & not listed.
  ];
  const moeRouterConfig = DEFAULT_MODELS.GOOGLE_STANDARD;
  const knowledgeWorkMoENetwork = new KnowledgeWorkMoENetwork(
    moeExpertIds,
    agents,
    moeRouterConfig,
    "knowledge-work-moe-v1",
    "masterAgent"
  );
  instrumentNetwork(knowledgeWorkMoENetwork);

  // --- Master Exploration and Master Debug Networks (Added) ---

  const masterExplorationNetwork = new AgentNetwork({
    ...baseNetworkConfig,
    model: baseNetworkConfig.model!,
    name: "Master Exploration Network",
    agents: [
      agents.masterAgent,
      agents.researchAgent,
      agents.analystAgent,
      agents.writerAgent,
      agents.rlTrainerAgent,
      agents.dataManagerAgent,
      agents.agenticAssistant,
      agents.coderAgent,
      agents.architectAgent,
      agents.debuggerAgent,
      agents.uiUxCoderAgent,
      agents.codeDocumenterAgent,
      agents.copywriterAgent,
      agents.marketResearchAgent,
      agents.socialMediaAgent,
      agents.seoAgent,
    ],
    instructions: renderTemplate(`
    You are the Master Exploration Network. You leverage the capabilities of the Master Agent to explore, test, and prototype complex workflows and tasks. Use available tools and workflows as needed to provide detailed exploratory outputs.
  `, {}),
  });
  applySharedHooks(masterExplorationNetwork, {
    onError: async (_err: Error) => ({ text: `Master Exploration Network error: ${_err.message}`, error: _err.message }),
    onGenerateResponse: async (res: any) => res,
  });
  instrumentNetwork(masterExplorationNetwork);

  const masterDebugNetwork = new AgentNetwork({
    ...baseNetworkConfig,
    model: baseNetworkConfig.model!,
    name: "Master Debug Network",
    agents: [
      agents.masterAgent,
      agents.researchAgent,
      agents.analystAgent,
      agents.writerAgent,
      agents.rlTrainerAgent,
      agents.dataManagerAgent,
      agents.agenticAssistant,
      agents.coderAgent,
      agents.architectAgent,
      agents.debuggerAgent,
      agents.uiUxCoderAgent,
      agents.codeDocumenterAgent,
      agents.copywriterAgent,
      agents.marketResearchAgent,
      agents.socialMediaAgent,
      agents.seoAgent,
    ],
    instructions: renderTemplate(`
    You are the Master Debug Network. You leverage the Master Agent to analyze errors, debug workflows, and suggest fixes. Prioritize clarity and actionable steps.
  `, {}),
  });
  applySharedHooks(masterDebugNetwork, {
    onError: async (_err: Error) => ({ text: `Master Debug Network error: ${_err.message}`, error: _err.message }),
    onGenerateResponse: async (res: any) => res,
  });
  instrumentNetwork(masterDebugNetwork);
  // scheduleMemoryCompaction removed ( disabled)
  // scheduleMemoryCompaction(masterDebugNetwork);

  // Schedule periodic health checks (runtime only; does NOT create threads at module load)
  scheduleHealthChecks(
    [deanInsightsNetwork, dataFlowNetwork, contentCreationNetwork, knowledgeWorkMoENetwork, masterExplorationNetwork, masterDebugNetwork],
    60000
  );

  // Register fallback to MoE network on errors (runtime only)
  registerNetworkHooks(deanInsightsNetwork, {
    onErrorInvoke: (_err, input, opts) => fallbackNetworkInvoke([knowledgeWorkMoENetwork], input, opts),
  });
  registerNetworkHooks(dataFlowNetwork, {
    onErrorInvoke: (_err, input, opts) => fallbackNetworkInvoke([knowledgeWorkMoENetwork], input, opts),
  });
  registerNetworkHooks(contentCreationNetwork, {
    onErrorInvoke: (_err, input, opts) => fallbackNetworkInvoke([knowledgeWorkMoENetwork], input, opts),
  });
  registerNetworkHooks(knowledgeWorkMoENetwork, {
    onErrorInvoke: (_err, input, opts) => fallbackNetworkInvoke([deanInsightsNetwork], input, opts),
  });

  // --- Final Export Map for Mastra Configuration (Updated) ---

  /**
   * Export all instantiated networks in a map format compatible with the Mastra instance configuration.
   * The keys MUST be the unique string IDs assigned during instantiation, used for invoking networks.
   */
  // ... all other networks as in your original code ...

  // Export all instantiated networks in a map format compatible with Mastra configuration.
  networks = {
    "dean-insights": deanInsightsNetwork,
    "data-flow": dataFlowNetwork,
    "content-creation": contentCreationNetwork,
    "knowledge-work-moe-v1": knowledgeWorkMoENetwork,
    "master-exploration": masterExplorationNetwork,
    "master-debug": masterDebugNetwork,
  };
  return networks;
})();

export async function initNetworks() {
  return networksPromise;
}

