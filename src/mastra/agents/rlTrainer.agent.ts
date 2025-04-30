/**
 * RL Trainer Agent Implementation
 *
 * This agent is specialized in reinforcement learning, collecting and analyzing
 * feedback, and optimizing agent behaviors based on performance data.
 */

import { createAgentFromConfig } from "./base.agent.js";
import { rlTrainerAgentConfig } from "./config/rlTrainer.config.js"; // Import directly
import { sharedMemory, initThreadManager } from "../database/index.js";
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({ name: "rl-trainer-agent", level: "info" });

/**
 * RL Trainer Agent with reinforcement learning capabilities
 *
 * @remarks
 * This agent specializes in collecting user feedback, analyzing agent performance,
 * and implementing reinforcement learning techniques to improve agent behaviors.
 */
export const rlTrainerAgent = createAgentFromConfig({
  config: rlTrainerAgentConfig,
  memory: sharedMemory, // Following RULE-MemoryInjection
  onError: async (error: Error) => {
    logger.error("RL Trainer agent error:", error);
    return {
      text: "I encountered an error while processing reinforcement learning data. Please check the logs for details.",
    };
  },
});

/**
 * RL Trainer Agent with reinforcement learning capabilities
 *
 * @remarks
 * This agent specializes in collecting user feedback, analyzing agent performance,
 * and implementing reinforcement learning techniques to improve agent behaviors.
 */
export type RLTrainerAgent = typeof rlTrainerAgent;
export default rlTrainerAgent;

