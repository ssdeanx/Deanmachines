/**
 * SEO Agent Implementation
 *
 * This module implements the SEO Agent based on its configuration.
 */

import { sharedMemory, initThreadManager } from "../database/index.js";
import { createAgentFromConfig } from "./base.agent.js";
import { seoAgentConfig } from "./config/seoAgent.config.js"; // Import directly
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "seo-agent", level: "info" });

/**
 * SEO Agent
 *
 * Specializes in search engine optimization strategies and implementation.
 *
 * @remarks
 * This agent is responsible for keyword research, content optimization,
 * and improving website visibility and rankings in search engines.
 */
export const seoAgent = createAgentFromConfig({
  config: seoAgentConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("SEO agent error:", error);
    return {
      text: "I encountered an error while optimizing for search. Please provide more specific SEO requirements.",
    };
  },
});

export default seoAgent;
export type SEOAgent = typeof seoAgent;

