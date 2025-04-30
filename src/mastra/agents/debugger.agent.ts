/**
 * Debugger Agent Implementation
 *
 * This module implements the Debugger Agent based on its configuration.
 */

import { sharedMemory, initThreadManager } from "../database/index.js";
import { createAgentFromConfig } from "./base.agent.js";
import { debuggerConfig } from "./config/debugger.config.js"; // Import directly
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "debugger-agent", level: "info" });

/**
 * Debugger Agent
 *
 * Specializes in identifying and fixing code issues and bugs.
 *
 * @remarks
 * This agent is responsible for analyzing error logs, debugging code execution,
 * and proposing fixes for bugs and performance issues.
 */
export const debuggerAgent = createAgentFromConfig({
  config: debuggerConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("Debugger agent error:", error);
    return {
      text: "I encountered an error while debugging. Please provide more information about the issue.",
    };
  },
});

export default debuggerAgent;
export type DebuggerAgent = typeof debuggerAgent;
