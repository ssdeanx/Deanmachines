/**
 * Coder Agent Implementation
 *
 * This module implements the Coder Agent responsible for code generation,
 * analysis, and refactoring tasks within the DeanmachinesAI system.
 */

import { Agent } from "@mastra/core/agent";
import { createAgentFromConfig } from "./base.agent";
import { coderAgentConfig } from "./config";
import { createLogger } from "@mastra/core/logger";
import { sharedMemory } from "../database";

// Configure logger for the coder agent
const logger = createLogger({ name: "coder-agent", level: "debug" });

/**
 * Initialize the coder agent instance using its configuration
 *
 * @returns The initialized coder agent instance
 */
export function initializeCoderAgent(): Agent {
  logger.info("Initializing coder agent");
  try {
    return createAgentFromConfig({
      config: coderAgentConfig,
      memory: sharedMemory, // Following RULE-MemoryInjection
      onError: async (error: Error) => {
        logger.error("Coder agent error:", error);
        return {
          text: "I encountered an error with code generation or analysis. Please provide more details or context.",
        };
      },
    });
  } catch (error) {
    logger.error(
      `Failed to initialize coder agent: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

/**
 * Singleton instance of the coder agent
 */
export const coderAgent = initializeCoderAgent();
export default coderAgent;
export type CoderAgent = typeof coderAgent;

