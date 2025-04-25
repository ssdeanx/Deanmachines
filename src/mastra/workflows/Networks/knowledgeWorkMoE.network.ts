/**
 * @file src/mastra/workflows/Networks/knowledgeWorkMoE.network.ts
 * @description Implements a highly optimized and robust Mixture of Experts (MoE) network
 *              using Mastra's AgentNetwork framework. Routes tasks to the most
 *              appropriate specialized agent based on rules or LLM routing.
 * @version 2.0.0 - Optimized & Refined
 */

import { Agent } from "@mastra/core/agent";
import { AgentNetwork, type AgentNetworkConfig } from "@mastra/core/network";
import { type CoreMessage } from "ai"; // Import CoreMessage from the main 'ai' package

// Import the actual agents map (value) and necessary config types/utils
// Assuming the export from '../../agents' is named 'allAgents'
import allAgents from "../../agents"; // Use default import
import {
  ModelConfig,
  createModelInstance,
  DEFAULT_MODELS,
} from "../../agents/config";
import { masterAgentConfig } from "../../agents/config/master.config"; // Import master agent config
import { threadManager } from "../../utils/thread-manager";
import { createLogger } from "@mastra/core/logger";
import { configureLangSmithTracing } from "../../services/langsmith";
import { applySharedHooks, instrumentNetwork, scheduleMemoryCompaction } from "./networkHelpers";

const logger = createLogger({ name: "MoE-Network", level: "info" });

const langsmithClient = configureLangSmithTracing();
if (langsmithClient) {
  logger.info("LangSmith tracing enabled for agent network");
}
// Define the type for the agents map more explicitly
type AgentRegistry = typeof allAgents;
// Define a type for valid agent IDs based on the registry keys
type AgentId = keyof AgentRegistry;



// --- Constants ---
const DEFAULT_FALLBACK_AGENT_ID: AgentId = (process.env.MOE_FALLBACK_AGENT_ID as AgentId) || masterAgentConfig.id; // Dynamic fallback: env var or master agent

/**
 * Represents a Mixture of Experts (MoE) network built on Mastra's AgentNetwork.
 *
 * This network intelligently routes an incoming task to the single most suitable
 * expert agent from a predefined pool. It uses high-confidence rules for common
 * tasks and falls back to an LLM-based router for more complex or ambiguous requests.
 * Includes robust fallback mechanisms and optimized execution flow.
 */
export class KnowledgeWorkMoENetwork extends AgentNetwork {
  // Map storing only the Agent instances actively used as experts in this network.
  private readonly expertAgentsMap: Map<AgentId, Agent>;
  // Reference to the complete agent registry provided during construction.
  private readonly agentRegistry: AgentRegistry;
  // The ID of the agent designated as the fallback.
  private readonly fallbackAgentId: AgentId;
  // The unique identifier for this network instance.
  private readonly networkId: string;

  /**
   * Creates an instance of KnowledgeWorkMoENetwork.
   *
   * @param expertAgentIds - An array of agent IDs (keys of agentRegistry) to include as experts.
   *                         These agents must exist and be valid Agent instances in the registry.
   * @param agentRegistry - The complete map of all available agents (imported from `src/mastra/agents`).
   *                        Must not be empty.
   * @param routerModelConfig - Configuration for the Language Model used for routing decisions.
   *                            Choose a model capable of following instructions accurately.
   * @param networkId - A unique identifier string for this network instance (e.g., "knowledge-work-moe-v1").
   * @param fallbackAgentId - The ID of the agent (must be in agentRegistry) to use if routing or execution fails.
   *                          Defaults to MOE_FALLBACK_AGENT_ID env var or master agent id.
   * @throws {Error} If the agentRegistry is empty, no valid expert agents are found,
   *                 or the specified fallbackAgentId is invalid.
   */ constructor(
    expertAgentIds: AgentId[],
    agentRegistry: AgentRegistry,
    routerModelConfig: ModelConfig = DEFAULT_MODELS.GOOGLE_STANDARD,
    networkId: string = "knowledge-work-moe",
    fallbackAgentId: AgentId = DEFAULT_FALLBACK_AGENT_ID
  ) {
    // --- Input Validation ---
    if (!agentRegistry || Object.keys(agentRegistry).length === 0) {
      throw new Error(
        `[${networkId}] Initialization failed: Agent registry cannot be empty.`
      );
    }
    if (!expertAgentIds || expertAgentIds.length === 0) {
      throw new Error(
        `[${networkId}] Initialization failed: At least one expert agent ID must be provided.`
      );
    }

    logger.info(`Initializing KnowledgeWorkMoENetwork (ID: ${networkId})...`);

    // --- Prepare Configuration for super() without using 'this' ---
    const localExpertAgentsMap = new Map<AgentId, Agent>();
    const localDescriptions: string[] = [];
    const localExpertAgentsForBaseConfig: Agent[] = [];

    // --- Dynamic Expert Registration & Description Building (Local) ---
    for (const id of expertAgentIds) {
      const agent = agentRegistry[id]; // Use parameter directly
      if (agent instanceof Agent) {
        localExpertAgentsMap.set(id, agent);
        localExpertAgentsForBaseConfig.push(agent);
        const description =
          (agent as any)?.config?.description ??
          `${id} (Description unavailable)`;
        localDescriptions.push(`- ${id}: ${description}`);
        logger.info(`[${networkId}] Registered expert: ${id}`); // Use parameter
      } else {
        logger.warn(
          `[${networkId}] Specified expert agent ID "${id}" not found or invalid in registry. Skipping.` // Use parameter
        );
      }
    }

    // --- Validate that at least one expert was successfully registered (Local) ---
    if (localExpertAgentsMap.size === 0) {
      throw new Error(
        `[${networkId}] Initialization failed: No valid expert agents were found in the registry based on the provided IDs.` // Use parameter
      );
    }

    // --- Validate and Ensure Fallback Agent is Included (Local) ---
    const fallbackAgent = agentRegistry[fallbackAgentId]; // Use parameters directly
    if (!(fallbackAgent instanceof Agent)) {
      logger.error(
        `[${networkId}] CRITICAL CONFIGURATION ERROR: Specified fallback agent "${fallbackAgentId}" is not a valid Agent instance in the registry. Fallback mechanism WILL FAIL.` // Use parameters
      );
      throw new Error(
        `[${networkId}] Invalid fallback agent ID specified: "${fallbackAgentId}".` // Use parameters
      );
    } else if (!localExpertAgentsMap.has(fallbackAgentId)) {
      logger.info(
        `[${networkId}] Adding valid fallback agent "${fallbackAgentId}" to network's agent list.` // Use parameters
      );
      localExpertAgentsMap.set(fallbackAgentId, fallbackAgent);
      localExpertAgentsForBaseConfig.push(fallbackAgent);
      const description =
        (fallbackAgent as any)?.config?.description ??
        `${fallbackAgentId} (Generalist Fallback)`;
      localDescriptions.push(`- ${fallbackAgentId}: ${description}`);
    }

    const expertDescriptions = localDescriptions.join("\n");
    logger.debug(
      `[${networkId}] Final expert descriptions for router:\n${expertDescriptions}` // Use parameter
    );

    // --- Crafting Instructions for the Internal Router (Crucial for MoE Behavior) ---
    const routerInstructions = `
      You are an intelligent routing agent within a multi-agent system operating in a Mixture-of-Experts (MoE) configuration.
      Your SOLE TASK is to analyze the user's request and select the SINGLE most appropriate expert agent from the list below to handle the entire request in one step.
      Base your decision ONLY on the provided agent descriptions and the user's input.
      Do NOT attempt to chain agents, plan multiple steps, or decompose the task.

      Available Experts and their capabilities:
      ${expertDescriptions}

      User Request Analysis Steps:
      1. Understand the primary goal or task described in the user's request.
      2. Compare this goal to the capabilities listed for each expert agent.
      3. Identify the single expert whose capabilities most closely match the user's request.
      4. If no specific expert is a clear and strong match, you MUST select the designated fallback agent: '${fallbackAgentId}'. Do not invent capabilities or force a poor match.

      Your selection determines the *only* agent that will run for this turn. The network flow stops after the selected agent completes its task.
    `;

    // --- AgentNetwork Configuration ---
    const config: AgentNetworkConfig = {
      name: `Knowledge Work MoE Network (${networkId})`, // Use parameter
      // description: // Removed as it's not part of AgentNetworkConfig
      //   "Routes tasks to the most appropriate specialized agent using rules or LLM routing.",
      agents: localExpertAgentsForBaseConfig, // Use local list
      model: createModelInstance(routerModelConfig),
      instructions: routerInstructions,
      // memory: sharedMemory, // Memory might be handled differently or implicitly by the base class
      // hooks: {} // Add hooks if needed
    };

    // --- Initialize the Base AgentNetwork (MUST be called before 'this') ---
    super(config);

    // --- Assign instance properties AFTER super() ---
    this.agentRegistry = agentRegistry;
    this.fallbackAgentId = fallbackAgentId;
    this.networkId = networkId;
    this.expertAgentsMap = localExpertAgentsMap; // Assign the map built locally

    logger.info(
      `[${this.networkId}] KnowledgeWorkMoENetwork initialized successfully with ${this.expertAgentsMap.size} agents (including fallback).`
    );

    // Apply shared hooks, instrumentation, and memory compaction
    applySharedHooks(this, {
      onError: async (error: Error) => {
        logger.error(`[${this.networkId}] MoE network error: ${error.message}`);
        return { text: `Routing error: ${error.message}`, error: error.message };
      },
      onGenerateResponse: async (res: any) => res,
    });
    instrumentNetwork(this);
    scheduleMemoryCompaction(this);
  }

  /**
   * Applies high-confidence, specific rule-based routing for common tasks.
   * Rules are ordered by likely specificity.
   *
   * @param userInput - The user's input string, trimmed and lowercased.
   * @returns The ID of the expert if a high-confidence rule matches, otherwise null.
   */
  private _applyRuleBasedRouting(userInput: string): AgentId | null {
    const lowerInput = userInput.toLowerCase().trim();
    const logPrefix = `[${this.networkId}] Rule:`;

    // --- High-Confidence Rule-Based Shortcuts ---

    // Group: Debugging & Code Fixing (High Specificity)
    if (
      (lowerInput.startsWith("debug") ||
        lowerInput.includes("fix error in") ||
        lowerInput.includes("troubleshoot")) &&
      (lowerInput.includes("code") ||
        lowerInput.includes("script") ||
        lowerInput.includes("function"))
    ) {
      if (this.expertAgentsMap.has("debuggerAgent")) {
        logger.info(`${logPrefix} Matched 'debug/fix code' -> debuggerAgent`);
        return "debuggerAgent";
      }
    }

    // Group: Code Documentation & Explanation
    if (
      lowerInput.startsWith("document this code") ||
      lowerInput.startsWith("add docstrings to") ||
      lowerInput.startsWith("generate comments for") ||
      lowerInput.startsWith("explain this code")
    ) {
      // Assuming 'codeDocumenterAgent' is the correct AgentId key
      if (this.expertAgentsMap.has("codeDocumenterAgent")) {
        logger.info(
          `${logPrefix} Matched 'document/explain code' -> codeDocumenterAgent`
        );
        return "codeDocumenterAgent";
      }
    }

    // Group: UI/Frontend Development
    if (
      lowerInput.includes("react component") ||
      lowerInput.includes("css for") ||
      lowerInput.includes("tailwind class") ||
      lowerInput.includes("frontend code for")
    ) {
      // Assuming 'uiUxCoderAgent' is the correct AgentId key
      if (this.expertAgentsMap.has("uiUxCoderAgent")) {
        logger.info(
          `${logPrefix} Matched 'ui/frontend code' -> uiUxCoderAgent`
        );
        return "uiUxCoderAgent";
      }
    }

    // Group: Architecture & Design
    if (
      lowerInput.includes("system design for") ||
      lowerInput.includes("component interaction")
    ) {
      if (this.expertAgentsMap.has("architectAgent")) {
        logger.info(
          `${logPrefix} Matched 'architecture/design' -> architectAgent`
        );
        return "architectAgent";
        // Redundant return removed
      }
    }

    // Group: Code Refactoring
    if (lowerInput.startsWith("refactor") && lowerInput.includes("code")) {
      if (this.expertAgentsMap.has("coderAgent")) {
        logger.info(`${logPrefix} Matched 'refactor code' -> coderAgent`);
        return "coderAgent";
        // Redundant return removed
      }
    }

    // Group: General Code Generation (Less specific than others above)
    if (
      lowerInput.startsWith("generate javascript") ||
      lowerInput.startsWith("write code for") ||
      lowerInput.startsWith("create a script")
    ) {
      if (this.expertAgentsMap.has("coderAgent")) {
        logger.info(`${logPrefix} Matched 'write code/script' -> coderAgent`);
        return "coderAgent";
      }
      // Removed extra closing brace and redundant return
    }

    // Group: Research & Information Gathering
    // Corrected structure and added conditions
    if (
      lowerInput.includes("research") ||
      lowerInput.includes("find information on") ||
      lowerInput.includes("look up")
    ) {
      if (this.expertAgentsMap.has("researchAgent")) {
        logger.info(
          `${logPrefix} Matched 'research/find info' -> researchAgent`
        );
        return "researchAgent";
      }
      // Removed extra closing braces and misplaced return
    }

    // Group: Data Analysis & Interpretation
    if (
      lowerInput.includes("analyze data") ||
      lowerInput.includes("interpret results") ||
      lowerInput.includes("data insights")
    ) {
      if (this.expertAgentsMap.has("analystAgent")) {
        logger.info(
          `${logPrefix} Matched 'analyze/interpret data' -> analystAgent`
        );
        return "analystAgent";
      }
    }

    // Group: Marketing Research
    if (
      lowerInput.includes("market research for") ||
      lowerInput.includes("competitor analysis") ||
      lowerInput.includes("target audience")
    ) {
      if (this.expertAgentsMap.has("marketResearchAgent")) {
        logger.info(
          `${logPrefix} Matched 'market research' -> marketResearchAgent`
        );
        return "marketResearchAgent";
      }
    }

    // Group: Copywriting & Marketing Content
    if (
      lowerInput.includes("marketing copy for") ||
      lowerInput.includes("write ad copy") ||
      lowerInput.includes("product description") ||
      lowerInput.includes("landing page text")
    ) {
      // Assuming 'copywriterAgent' is the correct AgentId key
      if (this.expertAgentsMap.has("copywriterAgent")) {
        logger.info(
          `${logPrefix} Matched 'copywriting/marketing content' -> copywriterAgent`
        );
        return "copywriterAgent";
      }
    }

    // Group: Social Media Content
    // Corrected structure and added conditions
    if (
      lowerInput.includes("social media post") ||
      lowerInput.includes("tweet about") ||
      lowerInput.includes("linkedin update") ||
      lowerInput.includes("instagram caption")
    ) {
      // Assuming 'socialMediaAgent' is the correct AgentId key
      if (this.expertAgentsMap.has("socialMediaAgent")) {
        logger.info(
          `${logPrefix} Matched 'social media content' -> socialMediaAgent`
        );
        return "socialMediaAgent";
      }
      // Removed extra closing braces and misplaced return
    }

    // Group: SEO & Keywords
    if (
      lowerInput.includes("seo strategy") ||
      lowerInput.includes("keyword research for") ||
      lowerInput.includes("meta description")
    ) {
      // Assuming 'seoAgent' is the correct AgentId key
      if (this.expertAgentsMap.has("seoAgent")) {
        logger.info(`${logPrefix} Matched 'seo/keywords' -> seoAgent`);
        return "seoAgent";
        // Redundant return removed
      }
    }

    // Group: Data/File/Vector Management
    // Corrected structure and added conditions
    if (
      lowerInput.includes("manage file") ||
      lowerInput.includes("vector database") ||
      lowerInput.includes("save this data") ||
      lowerInput.includes("organize data")
    ) {
      if (this.expertAgentsMap.has("dataManagerAgent")) {
        logger.info(
          `${logPrefix} Matched 'data/file/vector management' -> dataManagerAgent`
        );
        return "dataManagerAgent";
      }
      // Removed extra closing braces and misplaced return
    }

    // Group: General Writing/Summarization/Explanation (Lower Specificity)
    // Corrected structure and added conditions
    if (
      lowerInput.startsWith("write") ||
      lowerInput.startsWith("summarize") ||
      lowerInput.startsWith("draft") ||
      lowerInput.startsWith("explain")
    ) {
      if (this.expertAgentsMap.has("writerAgent")) {
        logger.info(
          `${logPrefix} Matched 'write/summarize/draft/explain' -> writerAgent`
        );
        return "writerAgent";
      }
      // Removed extra closing braces and misplaced return
    }

    // --- End Rules ---

    logger.debug(`[${this.networkId}] No high-confidence rule matched input.`);
    return null; // No rule matched
  }

  /**
   * Executes the MoE network logic, overriding the base class method.
   * It first attempts rule-based routing, then falls back to LLM-based routing
   * provided by the base AgentNetwork, and finally uses a designated fallback agent
   * if primary methods fail.
   *
   * @param input - The user input, which can be a string or a structured object.
   * @param options - Optional execution parameters, potentially including a threadId
   *                  or other contextual information.
   * @returns A promise that resolves to the output generated by the selected expert
   *          agent or the fallback agent.
   * @throws {Error} If both the primary execution path (rule-based or LLM-routed)
   *                 and the fallback agent execution fail, or if the fallback agent
   *                 is configured incorrectly.
   */
  public async execute(
    input: string | Record<string, any>,
    options?: { threadId?: string; [key: string]: any }
  ): Promise<any> {
    // Ensure input is string for rule matching, but pass original input to agents
    const inputString =
      typeof input === "string" ? input : JSON.stringify(input);
    logger.info(
      `[${
        this.networkId
      }] Executing MoE Network for input: "${inputString.substring(
        0,
        150
      )}..."`,
      { options }
    );

    // 1. Try Rule-Based Routing
    const ruleBasedExpertId = this._applyRuleBasedRouting(inputString);
    if (ruleBasedExpertId) {
      const expertAgent = this.expertAgentsMap.get(ruleBasedExpertId);
      if (expertAgent) {
        logger.info(
          `[${this.networkId}] Rule matched. Bypassing LLM router. Executing expert: ${ruleBasedExpertId}`
        );
        try {
          // Directly execute the agent, passing the stringified input and the full options object
          // Note: Agent.generate expects string | messages[], so we use inputString here.
          // If agents need structured data, the LLM router path (super.execute)
          // might handle it differently, or agents must parse the stringified object.

          // Construct arguments for agent.generate, ensuring required fields are present.
          // The ruleBasedExpertId is the correct ID to use as the resourceId.
          const agentResourceId = ruleBasedExpertId;
          if (!agentResourceId || typeof agentResourceId !== "string") {
            // This check is technically redundant now if ruleBasedExpertId is always a valid AgentId string,
            // but kept for robustness in case AgentId type changes.
            logger.error(
              `[${this.networkId}] Invalid agent ID determined by rule-based routing: ${ruleBasedExpertId}. This should not happen.`
            );
            // Fallback if resourceId cannot be determined
            return this.executeFallback(
              input,
              options,
              `Agent ${ruleBasedExpertId} missing required resourceId.`
            );
          }

          // Prepare arguments, ensuring resourceId and a string threadId are included.
          const generateArgs: Record<string, any> = {
            ...(options ?? {}), // Spread original options
            resourceId: agentResourceId, // Add required resourceId
          };

          // Ensure threadId is a string, providing a temporary one if missing.
          // Consider if a default threadId is appropriate or if it should be required.
          if (typeof generateArgs.threadId !== "string") {
            generateArgs.threadId = `temp-thread-${Date.now()}`;
            logger.warn(
              `[${this.networkId}] Missing or invalid threadId in options for rule-based execution. Using temporary ID: ${generateArgs.threadId}`
            );
          }

          // Call generate with the constructed arguments object
          const result = await expertAgent.generate(inputString, generateArgs);

          logger.info(
            `[${this.networkId}] Rule-based execution for ${ruleBasedExpertId} completed successfully.`
          );
          return result;
        } catch (error: any) {
          logger.error(
            `[${this.networkId}] Rule-based expert "${ruleBasedExpertId}" failed during execution: ${error.message}`,
            { error, input, options }
          );
          // If the high-confidence rule-based choice fails, trigger fallback directly.
          return this.executeFallback(
            input,
            options,
            `Rule-based expert ${ruleBasedExpertId} failed: ${error.message}`
          );
        }
      } else {
        logger.error(
          `[${this.networkId}] Internal inconsistency: Rule matched expert "${ruleBasedExpertId}" but it's not in the network map. Proceeding to LLM router.`
        );
        // Fall through to LLM router if rule points to non-existent agent (should be rare)
      }
    }

    // 2. If no rule matched, use the standard AgentNetwork LLM routing
    logger.info(
      `[${this.networkId}] No applicable rule found or rule agent invalid. Using standard AgentNetwork LLM router.`
    );
    try {
      // Call the base class run method. It handles LLM routing and execution.
      // Pass the original input and full options object.
      // Prepare messages for the base class generate method
      let messages: string | CoreMessage[];
      if (typeof input === "string") {
        messages = input;
      } else {
        // Convert structured input to a user message with stringified JSON
        // The base network router needs to understand this format or be adapted.
        messages = [{ role: "user", content: JSON.stringify(input) }];
        logger.debug(
          `[${this.networkId}] Converted structured input to user message for LLM router.`
        );
      }

      // Prepare arguments for the base class generate method, ensuring required fields.
      const baseGenerateArgs: Record<string, any> = {
        ...(options ?? {}), // Spread original options
        resourceId: this.networkId, // Use the network's ID as the resourceId for routing
      };

      // Ensure threadId is a string, providing a temporary one if missing.
      if (typeof baseGenerateArgs.threadId !== "string") {
        baseGenerateArgs.threadId = `temp-network-thread-${Date.now()}`;
        logger.warn(
          `[${this.networkId}] Missing or invalid threadId in options for LLM-routed execution. Using temporary ID: ${baseGenerateArgs.threadId}`
        );
      }

      // Call the base class generate method with correctly typed messages and args
      // We need to cast baseGenerateArgs to the expected type, or ensure it matches.
      // Assuming AgentGenerateOptions requires resourceId and threadId.
      // Let's refine the type assertion or structure if needed based on AgentGenerateOptions definition.
      // For now, casting to 'any' bypasses strict checks, but ideally, we'd match the type.
      // A safer approach is to explicitly define the required properties.
      const result = await super.generate(messages, baseGenerateArgs as any); // Cast needed if type mismatch persists

      logger.info(
        `[${this.networkId}] AgentNetwork LLM-routed execution completed successfully.`
      );
      return result;
    } catch (error: any) {
      // This catches errors during the base execute call (router or LLM-selected expert failure).
      logger.error(
        `[${this.networkId}] AgentNetwork LLM-routed execution failed: ${error.message}`,
        { error, input, options }
      );
      // Attempt fallback if the main network execution fails
      return this.executeFallback(
        input,
        options,
        `LLM-routed execution failed: ${error.message}`
      );
    }
  }

  /**
   * Executes the designated fallback agent when primary execution paths fail.
   * Internal helper method. Ensures fallback agent exists and handles its errors.
   *
   * @param originalInput - The original input to the network.
   * @param options - Original execution options potentially containing context like threadId.
   * @param failureReason - A string describing why the fallback is being triggered.
   * @returns {Promise<any>} The result from the fallback agent.
   * @throws {Error} If the fallback agent is unavailable or fails during its execution.
   */
  private async executeFallback(
    originalInput: string | Record<string, any>,
    options: { threadId?: string; [key: string]: any } | undefined,
    failureReason: string
  ): Promise<any> {
    logger.warn(
      `[${this.networkId}] Triggering fallback agent "${this.fallbackAgentId}" due to: ${failureReason}`
    );
    const fallbackAgent = this.expertAgentsMap.get(this.fallbackAgentId); // Get from network's map

    // Critical check: Ensure the fallback agent instance is available in this network.
    if (!fallbackAgent) {
      logger.error(
        `[${this.networkId}] CRITICAL FALLBACK FAILURE: Fallback agent "${this.fallbackAgentId}" is not available in this network instance. Cannot recover.`
      );
      // Throw a specific error indicating fallback failure due to unavailability.
      throw new Error(
        `Execution failed (${failureReason}), and fallback agent "${this.fallbackAgentId}" is unavailable.`
      );
    } // End of the critical check block

    // If the fallback agent *is* available, proceed with execution inside a try...catch
    try {
      // Execute the fallback agent. Convert input to string if it's an object,
      // as generate expects string | messages[].
      const fallbackInput =
        typeof originalInput === "string"
          ? originalInput
          : JSON.stringify(originalInput);

      // Prepare arguments, ensuring resourceId and a string threadId are included.
      const fallbackArgs: Record<string, any> = {
        ...(options ?? {}), // Spread original options
        resourceId: this.fallbackAgentId, // Use the fallback agent's ID
      };

      // Ensure threadId is a string, providing a temporary one if missing.
      if (typeof fallbackArgs.threadId !== "string") {
        fallbackArgs.threadId = `temp-fallback-thread-${Date.now()}`;
        logger.warn(
          `[${this.networkId}] Missing or invalid threadId in options for fallback execution. Using temporary ID: ${fallbackArgs.threadId}`
        );
      }

      // Call generate with the constructed arguments object
      const fallbackResult = await fallbackAgent.generate(
        fallbackInput,
        fallbackArgs
      );

      logger.info(
        `[${this.networkId}] Fallback agent "${this.fallbackAgentId}" execution completed successfully.`
      );
      return fallbackResult;
    } catch (fallbackError: any) {
      // If the fallback itself fails, log critical error and re-throw.
      logger.error(
        `[${this.networkId}] CRITICAL FALLBACK FAILURE: Fallback agent "${this.fallbackAgentId}" also failed: ${fallbackError.message}`,
        { error: fallbackError, originalInput, options }
      );
      throw new Error(
        `Initial execution failed (${failureReason}), and fallback agent "${this.fallbackAgentId}" also failed: ${fallbackError.message}`
      );
    }
  }

  /** Returns the full agent registry (for debugging or dynamic access) */
  public getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }
}

// === Example Instantiation and Integration (For Reference) ===
// (Keep the example commented out as before, ensuring it reflects the final code structure)
/*
// 1. Import necessary components in `src/mastra/workflows/Networks/agentNetwork.ts`
import { KnowledgeWorkMoENetwork } from './knowledgeWorkMoE.network';
import { agents } from '../../agents'; // Import the full agent registry
import { DEFAULT_MODELS } from '../../agents/config';

// 2. Define the list of expert agent IDs for this specific MoE network instance
const moeExpertIds: Array<keyof typeof agents> = [
  'research-agent', 'analyst-agent', 'writer-agent', 'coder-agent',
  'debugger-agent', 'architect-agent', 'code-documenter-agent',
  'data-manager-agent', 'market-research-agent', 'copywriter-agent',
  'social-media-agent', 'seo-agent', 'ui-ux-coder-agent',
  // 'agentic-assistant' // Fallback agent added automatically if valid & not listed.
];

// 3. Configure the router model
const routerConfig = DEFAULT_MODELS.GOOGLE_STANDARD;

// 4. Instantiate the network
export const knowledgeWorkMoENetwork = new KnowledgeWorkMoENetwork(
  moeExpertIds,
  agents,
  routerConfig,
  "knowledge-work-moe-v1"
);

// 5. Add to the main networks export in `src/mastra/workflows/Networks/agentNetwork.ts`
// export const networks = { /* ... other networks * / knowledgeWorkMoE: knowledgeWorkMoENetwork };

// 6. Ensure Mastra instance loads these networks (in src/mastra/index.ts)
// import { networks } from "./workflows/Networks/agentNetwork";
// export const mastra = new Mastra({ agents: allAgents, networks: networks, ... });

// 7. Example Invocation via Mastra instance
// async function runMoEExamples() { ... } // (As in previous example)
// runMoEExamples();
*/
