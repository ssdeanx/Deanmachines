/**
 * Market Research Agent Implementation
 *
 * This module implements the Market Research Agent based on its configuration.
 */

import { sharedMemory, initThreadManager } from "../database/index.js";
import { createAgentFromConfig } from "./base.agent.js";
import { marketResearchAgentConfig } from "./config/marketResearch.config.js"; // Import directly
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "market-research-agent", level: "info" });

/**
 * Market Research Agent
 *
 * Specializes in analyzing markets, competitors, and user needs.
 *
 * @remarks
 * This agent is responsible for gathering and analyzing market data,
 * conducting competitive analysis, and providing actionable insights.
 */
export const marketResearchAgent = createAgentFromConfig({
  config: marketResearchAgentConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("Market Research agent error:", error);
    return {
      text: "I encountered an error while analyzing market data. Please provide more specific research parameters.",
    };
  },
});

export default marketResearchAgent;
export type MarketResearchAgent = typeof marketResearchAgent;
