/**
 * Data Manager Agent Implementation
 *
 * This agent is specialized in managing data operations, file organization,
 * storage, and retrieval of information across the system.
 */

import { createAgentFromConfig } from "./base.agent";
import { dataManagerAgentConfig } from "./config";
import { sharedMemory } from "../database";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "data-manager-agent", level: "debug" });

/**
 * Data Manager Agent with file and storage management capabilities
 *
 * @remarks
 * This agent specializes in organizing, storing, retrieving, and managing
 * data assets across the system, including file operations and vector database management.
 */
export const dataManagerAgent = createAgentFromConfig({
  config: dataManagerAgentConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("Data Manager agent error:", error);
    return {
      text: "I encountered an error while managing data operations. Please provide additional details.",
    };
  },
});

export default dataManagerAgent;
