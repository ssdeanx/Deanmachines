/**
 * Debugger Agent Implementation
 *
 * This module implements the Debugger Agent based on its configuration.
 */

import { sharedMemory } from "../database";
import { createAgentFromConfig } from "./base.agent";
import {debuggerConfig} from "./config";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "debugger-agent", level: "debug" });

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
