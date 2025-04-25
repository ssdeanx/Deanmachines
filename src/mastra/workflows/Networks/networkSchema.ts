import { z } from "zod";

/**
 * Schema for validating AgentNetwork configuration
 */
export const NetworkConfigSchema = z.object({
  name: z.string().describe("Unique network ID"),
  model: z.any().describe("Model configuration or provider instance"),
  agents: z.array(z.string()).min(1).describe("List of agent IDs in the network"),
  instructions: z.string().optional().describe("Routing instructions for the network"),
  expertAgentIds: z.array(z.string()).min(1).optional().describe("Expert agent IDs for MoE networks"),
  fallbackAgentId: z.string().optional().describe("Fallback agent ID if routing fails"),
  hooks: z
    .object({
      onError: z.function().args(z.instanceof(Error)).returns(z.any()).optional(),
      onGenerateResponse: z.function().args(z.any()).returns(z.any()).optional(),
    })
    .optional()
    .describe("Hooks for error handling and response processing"),
  useSharedMemory: z.boolean().optional().describe("Whether to persist memory between calls"),
  threadManagerOptions: z.record(z.any()).optional().describe("Options for thread manager behavior"),
});

/**
 * Type for network configuration inferred from schema
 */
export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;