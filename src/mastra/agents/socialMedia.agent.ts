/**
 * Social Media Agent Implementation
 *
 * This module implements the Social Media Agent based on its configuration.
 */

import { sharedMemory, initThreadManager } from "../database/index.js";
import { createAgentFromConfig } from "./base.agent.js";
import { socialMediaAgentConfig } from "./config/socialMedia.config.js"; // Import directly
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "social-media-agent", level: "info" });

/**
 * Social Media Agent
 *
 * Specializes in creating and managing social media content and campaigns.
 *
 * @remarks
 * This agent is responsible for creating platform-specific content,
 * planning social media campaigns, and analyzing engagement metrics.
 */
export const socialMediaAgent = createAgentFromConfig({
  config: socialMediaAgentConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("Social Media agent error:", error);
    return {
      text: "I encountered an error while creating social media content. Please provide more specific platform requirements.",
    };
  },
});

export default socialMediaAgent;
export type SocialMediaAgent = typeof socialMediaAgent;
