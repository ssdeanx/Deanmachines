/**
 * Market Research Agent Implementation
 *
 * This module implements the Market Research Agent based on its configuration.
 */

import { sharedMemory } from "../database";
import { createAgentFromConfig } from "./base.agent";
import {marketResearchAgentConfig} from "./config";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "market-research-agent", level: "debug" });

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
