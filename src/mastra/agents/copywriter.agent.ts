/**
 * Copywriter Agent Implementation
 *
 * This module implements the Copywriter Agent responsible for creating
 * marketing copy and content within the DeanmachinesAI system.
 */

import { Agent } from "@mastra/core/agent";
import { createAgentFromConfig } from "./base.agent.js";
import { copywriterAgentConfig } from "./config/copywriter.config.js"; // Import directly
import { createLogger } from "@mastra/core/logger";
import { sharedMemory, initThreadManager } from "../database/index.js";

// Configure logger for the copywriter agent
const logger = createLogger({ name: "copywriter-agent", level: "info" });

/**
 * Initialize the copywriter agent instance using its configuration
 *
 * @returns The initialized copywriter agent instance
 */
export function initializeCopywriterAgent(): Agent {
  logger.info("Initializing copywriter agent");
  try {
    return createAgentFromConfig({
      config: copywriterAgentConfig,
      memory: sharedMemory, // Following RULE-MemoryInjection
      onError: async (error: Error) => {
        logger.error("Copywriter agent error:", error);
        return {
          text: "I encountered an error while creating content. Please provide more specific requirements.",
        };
      },
    });
  } catch (error) {
    logger.error(
      `Failed to initialize copywriter agent: ${error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

/**
 * Singleton instance of the copywriter agent
 */
export const copywriterAgent = initializeCopywriterAgent();

