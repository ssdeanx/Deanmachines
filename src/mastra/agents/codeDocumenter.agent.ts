/**
 * Code Documenter Agent Implementation
 *
 * This module implements the Code Documenter Agent based on its configuration.
 */

import { sharedMemory } from "../database";
import { createAgentFromConfig } from "./base.agent";
import { codeDocumenterConfig } from "./config/"; // Import directly
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "code-documenter-agent", level: "debug" });

/**
 * Code Documenter Agent
 *
 * Specializes in creating comprehensive code documentation.
 *
 * @remarks
 * This agent is responsible for creating API documentation, writing code comments,
 * generating user guides, and ensuring documentation stays synchronized with code.
 * @version 1.0.0
 */
export const codeDocumenterAgent = createAgentFromConfig({
  config: codeDocumenterConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("Code Documenter agent error:", error);
    return {
      text: "I encountered an error while generating documentation. Please provide more context about the code.",
    };
  },
});

export default codeDocumenterAgent;
export type CodeDocumenterAgent = typeof codeDocumenterAgent;
