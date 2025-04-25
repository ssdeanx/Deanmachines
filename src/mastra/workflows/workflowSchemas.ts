import { z } from "zod";

/** Input schema for dynamic workflows */
export const dynamicInputSchema = z.object({
  threadId: z.string(),
  dynamicInput: z.string(),
});

/** Output schema for dynamic workflows */
export const dynamicOutputSchema = z.object({
  processedValue: z.string(),
});

/** Trigger schema for main workflow */
export const mainTriggerSchema = z.object({
  threadId: z.string(),
  inputData: z.string(),
});

/** Output schema for createDynamicWorkflowStep */
export const createDynamicWorkflowStepOutputSchema = z.object({
  dynamicWorkflowResult: dynamicOutputSchema,
});

/** Intermediate schema for complex workflow step1 */
export const intermediateSchema = z.object({ intermediateResult: z.string() });

/** Final schema for complex workflow step2 */
export const finalResultSchema = z.object({ finalResult: z.string() });

/** Schema for conditional workflow branching */
export const branchingTriggerSchema = z.object({
  threadId: z.string(),
  type: z.enum(['simple', 'complex']),
  dynamicInput: z.string(),
});

/** Schema for control-flow check step */
export const isLongSchema = z.object({ isLong: z.boolean() });

/** Schema for control-flow message steps */
export const messageSchema = z.object({ message: z.string() });

/** Schema for retry step in control-flow workflow */
export const retrySchema = z.object({
  threadId: z.string(),
  success: z.boolean(),
});

/** Schema for memory request: thread identifier */
export const memoryRequestSchema = z.object({ threadId: z.string() });

/** Schema for memory response: loaded memory blob */
export const memoryResponseSchema = z.object({ memory: z.any() });
