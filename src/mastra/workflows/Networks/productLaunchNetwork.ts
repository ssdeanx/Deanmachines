/**
 * ProductLaunchNetwork Implementation
 *
 * This module implements a collaborative network that coordinates between
 * coding and marketing teams to support product launch activities.
 * It connects the Coder agent with the Copywriter agent to streamline
 * the creation of both code and marketing materials.
 */

import { google } from "@ai-sdk/google";
import { AgentNetwork, type AgentNetworkConfig } from "@mastra/core/network";
import { coderAgent, copywriterAgent } from "../../agents";
import { createResponseHook } from "../../hooks";
//import type * as MastraTypes from '../../types';
import type { AgentResponse, ResponseHookConfig } from '../../types';
import { createLogger } from "@mastra/core/logger";
import { configureLangSmithTracing } from "../../services/langsmith";
import { applySharedHooks, instrumentNetwork } from "./networkHelpers";
// import { storage } from "../../database/supabase";

// Logger and tracing setup
const logger = createLogger({ name: "product-launch-network", level: "info" });
// NOTE: Tracing/logging that could trigger thread creation must only be performed inside runtime execution paths (e.g., in execute, not constructor/global).
// Any tracing requiring thread context is now handled in runtime initializers or execution paths only.

/**
 * ProductLaunchNetwork
 *
 * This network connects the Coder agent with the Copywriter agent to streamline
 * the creation of both code and marketing materials for product launches.
 *
 * @remarks
 * The network uses an LLM-based router to determine which agent to call based on
 * the task requirements. This enables dynamic collaboration between development
 * and marketing teams.
 */
const productLaunchHooks: ResponseHookConfig = {
  minResponseLength: 20,
  maxAttempts: 2,
  validateResponse: (response: AgentResponse) => {
    if (response && typeof response === 'object') {
      if (typeof response.text === 'string' && response.text.length >= 20) return true;
      if (response.object && typeof response.object === 'object') return true;
    }
    return false;
  },
};

// Fully define ProductLaunchNetwork configuration using AgentNetworkConfig
const PRODUCT_LAUNCH_NETWORK_CONFIG: AgentNetworkConfig = {
  name: "Product Launch Network",
  model: google("models/gemini-2.0-flash"),
  agents: [coderAgent, copywriterAgent],
  instructions: `
    You are a product launch coordinator that manages collaboration between development and marketing teams.

    Your job is to:
    1. Analyze incoming requests related to product launches
    2. Route tasks to the appropriate specialized agent:
       - Coder Agent: For code generation, documentation, and technical implementation
       - Copywriter Agent: For marketing materials, product descriptions, and promotional content
    3. Synthesize the outputs from both teams into cohesive deliverables
    4. Maintain alignment between technical capabilities and marketing messaging

    When coordinating:
    - Ensure technical documentation matches actual functionality
    - Confirm marketing claims are supported by the implemented features
    - Facilitate communication between technical and marketing teams when needed
    - Balance technical accuracy with compelling messaging

    Based on the user's request, determine which agent would be best equipped to handle it.
    If the task requires both coding and marketing expertise, coordinate between the agents.
    Always provide clear reasoning for your agent selection decisions.
  `,
};

export let productLaunchNetwork: AgentNetwork | null = null;
export const productLaunchNetworkPromise: Promise<AgentNetwork> = (async () => {
  const network = new AgentNetwork(PRODUCT_LAUNCH_NETWORK_CONFIG);

  // Apply shared hooks and instrumentation
  applySharedHooks(network, {
    onError: async (error: Error) => {
      logger.error("ProductLaunchNetwork error:", error);
      return { text: "The product launch network encountered an error. Please try again or contact support.", error: error.message };
    },
    onGenerateResponse: createResponseHook(productLaunchHooks),
  });
  instrumentNetwork(network);

  productLaunchNetwork = network;
  return network;
})();

/**
 * ProductLaunchNetwork hooks for error handling and response processing
 */
// Example usage of StreamResult type for future streaming support
// (This is a placeholder for where you would use StreamResult in your network logic)
// type ProductLaunchStream = StreamResult<AgentResponse>;



export async function initProductLaunchNetwork() {
  return productLaunchNetworkPromise;
}

/**
 * Initialize the ProductLaunchNetwork
 *
 * @returns The initialized network instance
 */
export function initializeProductLaunchNetwork(): AgentNetwork | null {
  logger.info("Initializing ProductLaunchNetwork");
  return productLaunchNetwork;
}

// Export the initialized network and hooks
