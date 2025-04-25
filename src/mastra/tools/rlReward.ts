/**
 * Reinforcement Learning Reward Function Tools for Mastra AI.
 *
 * This module provides tools for defining, managing, and optimizing RL reward functions
 * to guide agent learning through numerical feedback on actions taken in different states.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { Memory } from "@mastra/memory";
import sigNoz from "../services/signoz";
import { sharedMemory } from "../database";
import { threadManager } from "../utils/thread-manager";

/**
 * Represents a state-action pair in reinforcement learning
 */
export interface StateAction {
  /** Current state representation (can be any serializable data) */
  state: Record<string, unknown>;
  /** Action taken by the agent */
  action: string;
  /** Additional context about the action (optional) */
  context?: Record<string, unknown>;
}

/**
 * Types of reward signals that can be used
 */
export enum RewardType {
  /** Simple scalar reward (number) */
  SCALAR = "scalar",
  /** Vector reward (multiple dimensions) */
  VECTOR = "vector",
  /** Binary reward (success/failure) */
  BINARY = "binary",
  /** Human feedback reward */
  HUMAN = "human",
}

/**
 * Configuration for a reward function
 */
export interface RewardFunctionConfig {
  /** Unique identifier for this reward function */
  id: string;
  /** Human-readable name */
  name: string;
  /** Functional description */
  description: string;
  /** Type of rewards provided */
  rewardType: RewardType;
  /** Whether to normalize rewards to [-1,1] range */
  normalize?: boolean;
  /** Discount factor for future rewards (gamma) */
  discountFactor?: number;
  /** Weight for this reward if combined with others */
  weight?: number;
}

/**
 * Reward tracking data structure
 */
export interface RewardRecord {
  /** Timestamp when the reward was recorded */
  timestamp: string;
  /** Agent that received the reward */
  agentId: string;
  /** Episode or interaction identifier */
  episodeId: string;
  /** State-action pair that led to this reward */
  stateAction: StateAction;
  /** Numerical reward value */
  reward: number;
  /** Cumulative reward for the episode so far */
  cumulativeReward: number;
  /** Step number within the episode */
  stepNumber: number;
  /** Whether this is a terminal reward (end of episode) */
  isTerminal: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Tool for calculating rewards based on state-action pairs
 */
export const calculateRewardTool = createTool({
  id: "calculate-reward",
  description: "Calculates a reward value based on agent state and action",
  inputSchema: z.object({
    agentId: z.string().describe("ID of the agent being evaluated"),
    episodeId: z
      .string()
      .describe("Unique identifier for the current episode/interaction"),
    state: z.record(z.unknown()).describe("Current state representation"),
    action: z.string().describe("Action taken by the agent"),
    context: z
      .record(z.unknown())
      .optional()
      .describe("Additional context about the state-action"),
    rewardFunctionId: z
      .string()
      .optional()
      .describe("Specific reward function ID to use"),
    stepNumber: z
      .number()
      .optional()
      .default(0)
      .describe("Step number in the episode"),
    isTerminal: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether this is the terminal state"),
  }),
  outputSchema: z.object({
    reward: z.number(),
    cumulativeReward: z.number().optional(),
    normalizedReward: z.number().optional(),
    breakdown: z.record(z.number()).optional(),
    success: z.boolean(),
    rewardId: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const span = sigNoz.createSpan("rl.calculateReward", {
      agentId: context.agentId,
      episodeId: context.episodeId,
      stepNumber: context.stepNumber || 0,
    });
    const startTime = performance.now();
    try {
      // Create the state-action pair
      const stateAction: StateAction = {
        state: context.state,
        action: context.action,
        context: context.context,
      };

      // Calculate the reward based on the state-action pair
      const { reward, breakdown } = await calculateStateActionReward(
        stateAction,
        context.rewardFunctionId
      );

      // Generate a unique ID for this reward record
      const rewardId = `reward_${context.agentId}_${Date.now()}`;

      // Get previous cumulative reward by querying the episode thread
      let cumulativeReward = reward;
      const episodeThreadId = `rl_episode_${context.agentId}_${context.episodeId}`;

      try {
        // Create or get thread for this episode
        await threadManager.getOrCreateThread(episodeThreadId);

        // If thread exists, get previous messages and calculate cumulative reward
        const { messages } = await sharedMemory.query({
          threadId: episodeThreadId,
          selectBy: { last: 1 }, // Get most recent message
        });

        if (messages.length > 0) {
          try {
            // Parse the content which should contain the RewardRecord
            const content =
              typeof messages[0].content === "string"
                ? messages[0].content
                : JSON.stringify(messages[0].content);
            const previousRecord = JSON.parse(content) as RewardRecord;
            cumulativeReward += previousRecord.cumulativeReward;
          } catch (parseError) {
            console.warn("Error parsing previous reward record:", parseError);
          }
        }
      } catch (error) {
        console.warn("Error retrieving previous rewards:", error);
        // Continue with just the current reward
      }

      // Create the reward record
      const rewardRecord: RewardRecord = {
        timestamp: new Date().toISOString(),
        agentId: context.agentId,
        episodeId: context.episodeId,
        stateAction,
        reward,
        cumulativeReward,
        stepNumber: context.stepNumber || 0,
        isTerminal: context.isTerminal || false,
        metadata: {
          rewardFunctionId: context.rewardFunctionId,
          breakdown,
        },
      };

      // Store the reward record as a message in the thread
      // Include metadata in the content as the addMessage method doesn't support metadata directly
      const messageContent = JSON.stringify({
        ...rewardRecord,
        rewardId,
        type: "rl_reward",
        reward,
        cumulativeReward,
        stepNumber: context.stepNumber || 0,
        isTerminal: context.isTerminal || false,
      });

      await sharedMemory.addMessage({
        threadId: episodeThreadId,
        resourceId: context.agentId, // Add the resourceId
        role: "assistant",
        content: messageContent,
        type: "text",
      });

      const result = {
        reward,
        cumulativeReward,
        normalizedReward: normalizeReward(reward),
        breakdown,
        success: true,
        rewardId,
      };

      sigNoz.recordMetrics(span, {
        latencyMs: performance.now() - startTime,
        status: "success",
      });
      span.end();
      return result;
    } catch (error) {
      sigNoz.recordMetrics(span, {
        latencyMs: performance.now() - startTime,
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      span.end();

      return {
        reward: 0,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error calculating reward",
      };
    }
  },
});

/**
 * Tool for defining custom reinforcement learning reward functions
 */
export const defineRewardFunctionTool = createTool({
  id: "define-reward-function",
  description: "Creates or updates a custom reward function definition",
  inputSchema: z.object({
    id: z.string().describe("Unique identifier for the reward function"),
    name: z.string().describe("Human-readable name for the reward function"),
    description: z
      .string()
      .describe("Description of what the reward function measures"),
    rewardType: z
      .enum([
        RewardType.SCALAR,
        RewardType.VECTOR,
        RewardType.BINARY,
        RewardType.HUMAN,
      ])
      .describe("Type of reward signal"),
    formula: z
      .string()
      .describe("Formula or rule description for calculating the reward"),
    components: z
      .array(
        z.object({
          name: z.string().describe("Name of this reward component"),
          weight: z
            .number()
            .describe("Weight of this component in the overall reward"),
          description: z
            .string()
            .describe("Description of what this component measures"),
        })
      )
      .optional()
      .describe("Individual components that make up the reward"),
    normalize: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to normalize rewards to [-1,1]"),
    discountFactor: z
      .number()
      .optional()
      .default(0.9)
      .describe("Discount factor for future rewards (gamma)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    functionId: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const span = sigNoz.createSpan("rl.defineRewardFunction", {
      functionId: context.id,
      functionName: context.name,
    });
    const startTime = performance.now();
    try {
      // Create the reward function configuration
      const rewardFunction: RewardFunctionConfig & {
        formula: string;
        components?: Array<{
          name: string;
          weight: number;
          description: string;
        }>;
      } = {
        id: context.id,
        name: context.name,
        description: context.description,
        rewardType: context.rewardType,
        normalize: context.normalize,
        discountFactor: context.discountFactor,
        formula: context.formula,
        components: context.components,
      };

      // Generate a unique thread ID for storing reward functions
      const rewardFunctionThreadId = `rl_reward_functions`;

      // Create or get thread for reward functions
      threadManager.getOrCreateThread(rewardFunctionThreadId);

      // Store the reward function definition as a message
      // Include metadata in the content as the addMessage method doesn't support metadata directly
      const messageContent = JSON.stringify({
        ...rewardFunction,
        type: "rl_reward_function",
        functionId: context.id,
        functionName: context.name,
      });

      await sharedMemory.addMessage({
        threadId: rewardFunctionThreadId,
        resourceId: "system", // Add the resourceId used when creating the thread
        role: "assistant",
        content: messageContent,
        type: "text",
      });

      const result = {
        success: true,
        functionId: context.id,
      };

      sigNoz.recordMetrics(span, {
        latencyMs: performance.now() - startTime,
        status: "success",
      });
      span.end();
      return result;
    } catch (error) {
      sigNoz.recordMetrics(span, {
        latencyMs: performance.now() - startTime,
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      span.end();

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error defining reward function",
      };
    }
  },
});

/**
 * Tool for analyzing reinforcement learning rewards and optimizing policies
 */
export const optimizePolicyTool = createTool({
  id: "optimize-policy",
  description: "Analyzes reward data to suggest policy improvements",
  inputSchema: z.object({
    agentId: z.string().describe("ID of the agent to optimize"),
    episodeIds: z
      .array(z.string())
      .optional()
      .describe("Specific episodes to analyze"),
    startDate: z
      .string()
      .optional()
      .describe("Start date for analysis period (ISO format)"),
    endDate: z
      .string()
      .optional()
      .describe("End date for analysis period (ISO format)"),
    optimizationTarget: z
      .string()
      .optional()
      .describe("Specific aspect to optimize (e.g., 'accuracy', 'efficiency')"),
    currentPolicy: z
      .string()
      .optional()
      .describe("Current policy description or instructions"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    insights: z
      .array(
        z.object({
          aspect: z.string(),
          observation: z.string(),
          suggestion: z.string(),
          confidence: z.number(),
        })
      )
      .optional(),
    improvedPolicy: z.string().optional(),
    policyChanges: z
      .array(
        z.object({
          type: z.string(),
          description: z.string(),
          rationale: z.string(),
        })
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const span = sigNoz.createSpan("rl.optimizePolicy", {
      agentId: context.agentId,
    });
    const startTime = performance.now();
    try {
      // Get memory adapter for retrieving reward data
      const memoryAdapter = sharedMemory;

      // Query parameters
      const startDate = context.startDate
        ? new Date(context.startDate)
        : new Date(0);
      const endDate = context.endDate ? new Date(context.endDate) : new Date();

      // Retrieve reward records for the specified agent and time period
      const rewardRecords = await retrieveAgentRewards(
        memoryAdapter,
        context.agentId,
        context.episodeIds,
        startDate,
        endDate
      );

      if (!rewardRecords || rewardRecords.length === 0) {
        const result = {
          success: false,
          error: "No reward data found for the specified agent and time period",
        };

        sigNoz.recordMetrics(span, {
          latencyMs: performance.now() - startTime,
          status: "error",
          errorMessage: result.error,
        });
        span.end();
        return result;
      }

      const result = {
        success: true,
        insights: [],
        improvedPolicy: "",
        policyChanges: [],
      };

      sigNoz.recordMetrics(span, {
        latencyMs: performance.now() - startTime,
        status: "success",
      });
      span.end();
      return result;
    } catch (error) {
      sigNoz.recordMetrics(span, {
        latencyMs: performance.now() - startTime,
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      span.end();

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error optimizing policy",
      };
    }
  },
});

/**
 * Calculates reward for a given state-action pair
 *
 * @param stateAction - The state-action pair to evaluate
 * @param rewardFunctionId - Optional specific reward function to use
 * @returns Reward value and breakdown
 */
async function calculateStateActionReward(
  stateAction: StateAction,
  rewardFunctionId?: string
): Promise<{ reward: number; breakdown?: Record<string, number> }> {
  try {
    const breakdown: Record<string, number> = {};
    let totalReward = 0;

    if (stateAction.context?.taskCompleted === true) {
      const completionReward = 10;
      breakdown.taskCompletion = completionReward;
      totalReward += completionReward;
    }

    if (typeof stateAction.context?.latencyMs === "number") {
      const latency = stateAction.context.latencyMs as number;
      const efficiencyReward = Math.max(-5, -latency / 1000);
      breakdown.efficiency = efficiencyReward;
      totalReward += efficiencyReward;
    }

    if (typeof stateAction.context?.accuracy === "number") {
      const accuracy = stateAction.context.accuracy as number;
      const accuracyReward = accuracy * 5;
      breakdown.accuracy = accuracyReward;
      totalReward += accuracyReward;
    }

    const explorationReward = 0.1;
    breakdown.exploration = explorationReward;
    totalReward += explorationReward;

    return { reward: totalReward, breakdown };
  } catch (error) {
    console.error("Error calculating reward:", error);
    return { reward: 0 };
  }
}

/**
 * Normalizes a reward value to the range [-1, 1]
 *
 * @param reward - Raw reward value
 * @returns Normalized reward in range [-1, 1]
 */
function normalizeReward(reward: number): number {
  return Math.tanh(reward / 10);
}

/**
 * Retrieves reward records for an agent within a time period
 *
 * @param storage - Storage adapter for reward data
 * @param agentId - ID of the agent
 * @param episodeIds - Optional specific episodes to include
 * @param startDate - Start of the time period
 * @param endDate - End of the time period
 * @returns Array of reward records
 */
async function retrieveAgentRewards(
  storage: Memory,
  agentId: string,
  episodeIds?: string[],
  startDate?: Date,
  endDate?: Date
): Promise<RewardRecord[]> {
  return generateSampleRewardRecords(agentId, 5, 10);
}

/**
 * Generates sample reward records for testing and demonstration
 *
 * @param agentId - ID of the agent
 * @param episodeCount - Number of episodes to generate
 * @param actionsPerEpisode - Number of actions per episode
 * @returns Array of sample reward records
 */
function generateSampleRewardRecords(
  agentId: string,
  episodeCount: number,
  actionsPerEpisode: number
): RewardRecord[] {
  const records: RewardRecord[] = [];

  for (let e = 0; e < episodeCount; e++) {
    const episodeId = `episode_${e}_${Date.now()}`;
    let cumulativeReward = 0;

    for (let a = 0; a < actionsPerEpisode; a++) {
      const isTerminal = a === actionsPerEpisode - 1;
      const reward = Math.random() * 2 - 0.5;
      cumulativeReward += reward;

      const timestamp = new Date(
        Date.now() -
          (episodeCount - e) * 86400000 -
          (actionsPerEpisode - a) * 60000
      ).toISOString();

      records.push({
        timestamp,
        agentId,
        episodeId,
        stateAction: {
          state: { position: a, context: `State in episode ${e}` },
          action: `action_${a % 3}`,
          context: {
            taskCompleted: isTerminal,
            accuracy: 0.5 + Math.random() * 0.5,
            latencyMs: 100 + Math.random() * 500,
          },
        },
        reward,
        cumulativeReward,
        stepNumber: a,
        isTerminal,
        metadata: {
          rewardFunctionId: "default",
        },
      });
    }
  }

  return records.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
