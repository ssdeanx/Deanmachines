/**
 * Master Agent Implementation
 *
 * This agent is a general-purpose test agent for experimenting with all available tools and workflows.
 * It is designed for flexible, exploratory, and debugging tasks in the Mastra environment.
 */

import { createAgentFromConfig } from "./base.agent";
import { masterAgentConfig } from "./config";
import { sharedMemory } from "../database";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "master-agent", level: "debug" });

/**
 * Master Agent with maximum flexibility for tool and workflow experimentation
 *
 * @remarks
 * This agent exposes all working tools, supports any output format, and is ideal for rapid prototyping or debugging.
 */
export const masterAgent = createAgentFromConfig({
  config: masterAgentConfig,
  memory: sharedMemory,
  onError: async (error: Error) => {
    logger.error("Master agent error:", error);
    return {
      text: "I encountered an error during testing. Please refine your request or check tool availability.",
    };
  },
});

export type MasterAgent = typeof masterAgent;
export default masterAgent;
