/**
 * Analyst Agent Implementation
 *
 * This agent is specialized in interpreting data, identifying patterns,
 * and extracting meaningful insights from information.
 */

import { createAgentFromConfig } from "./base.agent.js";
import { analystAgentConfig } from "./config/index.js";
import { sharedMemory } from "../database/index.js";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "analyst-agent", level: "info" });

/**
 * Analyst Agent with data analysis capabilities
 *
 * @remarks
 * This agent can analyze information, identify trends and patterns,
 * and extract meaningful insights from data sources.
 */
export const analystAgent = createAgentFromConfig({
  config: analystAgentConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("Analyst agent error:", error);
    return {
      text: "I encountered an error while analyzing data. Please provide additional context or clarify your request.",
    };
  },
});

export default analystAgent;
export type AnalystAgent = typeof analystAgent;

