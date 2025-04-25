/**
 * Architecture Agent Implementation
 *
 * This module implements the Architecture Agent based on its configuration.
 */

import { sharedMemory } from "../database";
import { createAgentFromConfig } from "./base.agent";
import {architectConfig} from "./config";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "architect-agent", level: "debug" });

/**
 * Architecture Agent
 *
 * Specializes in system design, architecture decisions, and technical planning.
 *
 * @remarks
 * This agent is responsible for creating architecture diagrams, making technical
 * decisions, and providing guidance on system design and implementation.
 */
export const architectAgent = createAgentFromConfig({
  config: architectConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("Architect agent error:", error);
    return {
      text: "I encountered an error in architecture planning. Please try again.",
    };
  },
});

export default architectAgent;
export type ArchitectAgent = typeof architectAgent;

