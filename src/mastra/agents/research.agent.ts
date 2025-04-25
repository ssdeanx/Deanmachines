/**
 * Research Agent Implementation
 *
 * This agent is specialized in finding, gathering, and synthesizing information
 * from various sources including web searches, document repositories, and files.
 */

import { createAgentFromConfig } from "./base.agent";
import { researchAgentConfig } from "./config";
import { sharedMemory } from "../database";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "research-agent", level: "debug" });

/**
 * Research Agent with web search capabilities
 *
 * @remarks
 * This agent can perform web searches, read and write files, and maintain
 * research context across interactions using semantic memory.
 */
export const researchAgent = createAgentFromConfig({
  config: researchAgentConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("Research agent error:", error);
    return {
      text: "I encountered an error during research. Please refine your query or check the available sources.",
    };
  },
});

export type ResearchAgent = typeof researchAgent;
export default researchAgent;

