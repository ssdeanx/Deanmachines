/**
 * UI/UX Coder Agent Implementation
 *
 * This module implements the UI/UX Coder Agent based on its configuration.
 */

import { sharedMemory } from "../database";
import { createAgentFromConfig } from "./base.agent";
import { uiUxCoderConfig } from "./config";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "ui-ux-coder-agent", level: "debug" });

/**
 * UI/UX Coder Agent
 *
 * Specializes in frontend development and user experience implementation.
 *
 * @remarks
 * This agent is responsible for implementing user interfaces based on designs,
 * creating responsive layouts, and implementing intuitive user interactions.
 */
export const uiUxCoderAgent = createAgentFromConfig({
  config: uiUxCoderConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("UI/UX Coder agent error:", error);
    return {
      text: "I encountered an error while implementing the UI. Please check the design specifications.",
    };
  },
});

export default uiUxCoderAgent;
