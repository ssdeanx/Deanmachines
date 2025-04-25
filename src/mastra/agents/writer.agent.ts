/**
 * Writer Agent Implementation
 *
 * This agent is specialized in creating clear, engaging, and well-structured
 * documentation from complex information.
 */

import { createAgentFromConfig } from "./base.agent";
import { writerAgentConfig as writerConfig } from "./config";
import { sharedMemory } from "../database";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "writer-agent", level: "debug" });

/**
 * Writer Agent with content formatting capabilities
 *
 * @remarks
 * This agent can transform complex information into accessible content,
 * adapt tone and style for different audiences, and maintain consistency
 * across documents.
 */
export const writerAgent = createAgentFromConfig({
  config: writerConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("Writer agent error:", error);
    return {
      text: "I encountered an error while generating content. Please provide more specific guidelines or context.",
    };
  },
});

export default writerAgent;
