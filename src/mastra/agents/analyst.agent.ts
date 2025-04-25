/**
 * Analyst Agent Implementation
 *
 * This agent is specialized in interpreting data, identifying patterns,
 * and extracting meaningful insights from information.
 */

import { createAgentFromConfig } from "./base.agent";
import { analystAgentConfig } from "./config";
import { sharedMemory } from "../database";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "analyst-agent", level: "debug" });

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

