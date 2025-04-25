/**
 * Agentic-style Agent Implementation
 *
 * This module implements an advanced agent using Mastra's core functionality,
 * combining multiple tools for enhanced capabilities.
 */

import { createLogger } from "@mastra/core/logger";
import { sharedMemory } from "../database";
import { createAgentFromConfig } from "./base.agent";
import { agenticAssistantConfig, agenticResponseSchema } from "./config";

// Initialize logger for this module
const logger = createLogger({ name: "agentic-agent", level: "debug" });

/**
 * Agentic-style Agent with data analysis capabilities
 *
 * @remarks
 * This agent is agentic in nature, capable of analyzing information,
 * identifying trends and patterns, and extracting meaningful insights from data sources.
 * It can also generate structured responses based on the provided schema.
 * The agent is designed to be flexible and adaptable, allowing for various use cases.
 * It also supports integration with external APIs for enhanced functionality.
 */
export const agenticAssistant = createAgentFromConfig({
  config: agenticAssistantConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("Agentic agent error:", error);
    return {
      text: "I encountered an error while analyzing data. Please provide additional context or clarify your request.",
    };
  },
});

export default agenticAssistant;
export type AgenticAgent = typeof agenticAssistant;

/**
 * Example usage:
 *
 * ```typescript
 * import { agenticAssistant, getStructuredResponse } from "./agents/agentic.agent";
 *
 * // Simple text response
 * const response = await agenticAssistant.generate("What's the weather like today?");
 * console.log(response.text);
 *
 * // Structured response with schema validation
 * const structuredResponse = await getStructuredResponse(
 *   "Analyze the current trends in renewable energy"
 * );
 * console.log(structuredResponse.answer);
 * console.log(structuredResponse.sources);
 * ```
 */
