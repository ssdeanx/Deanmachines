/**
 * SEO Agent Implementation
 *
 * This module implements the SEO Agent based on its configuration.
 */

import { sharedMemory } from "../database";
import { createAgentFromConfig } from "./base.agent";
import { seoAgentConfig } from "./config";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "seo-agent", level: "debug" });

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

