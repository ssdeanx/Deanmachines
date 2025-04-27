import { Mastra, Step, Workflow } from "@mastra/core";
import type { Mastra as MastraType } from "@mastra/core";
import { createAISpan, recordMetrics } from "../services/signoz";
import { buildWorkflow } from "./workflowHelpers";
import {
  dynamicInputSchema,
  dynamicOutputSchema,
  mainTriggerSchema,
  createDynamicWorkflowStepOutputSchema,
  intermediateSchema,
  finalResultSchema,
  branchingTriggerSchema,
  isLongSchema,
  messageSchema,
  retrySchema,
} from "./workflowSchemas";
import { createLogger } from "@mastra/core/logger";
import { configureLangSmithTracing } from "../services/langsmith";
import { memoryRequestSchema, memoryResponseSchema } from "./workflowSchemas";
import { threadManager } from "../utils/thread-manager";
//import { storage } from "../database/supabase";



// Use the exported storage instance from the database module (already patched with .init)


const logger = createLogger({ name: "workflowFactory", level: "info" });

const langsmithClient = configureLangSmithTracing();
if (langsmithClient) {
  logger.info("LangSmith tracing enabled for workflow factory");
}

/**
 * Step to load persisted memory for a thread at workflow start.
 */
export const memoryStep = new Step({
  id: "loadMemory",
  inputSchema: memoryRequestSchema,
  outputSchema: memoryResponseSchema,
  execute: async ({ context }) => {
    const { threadId } = context.triggerData;
    const memory = await threadManager.getThreadMemory(threadId);
    return { memory };
  },
});

/**
 * Step to save persisted memory for a thread at workflow end.
 */
export const saveMemoryStep = new Step({
  id: "saveMemory",
  inputSchema: memoryRequestSchema.merge(memoryResponseSchema),
  outputSchema: memoryResponseSchema,
  execute: async ({ context }) => {
    const loaded = context.getStepResult(memoryStep) as { memory: any };
    const { memory } = loaded;
    const { threadId } = context.triggerData;
    await threadManager.saveThreadMemory(threadId, memory);
    return { memory };
  },
});

// Additional modular workflow factory functions
/**
 * Factory for simple dynamic workflow with a single step.
 */
export function createSimpleWorkflowFactory(mastra: MastraType): Workflow<any, any> {
  return buildWorkflow(
    "dynamic-simple-workflow",
    mastra,
    dynamicInputSchema,
    wf => {
      const simpleStep = new Step({
        id: "simpleStep",
        execute: async ({ context }) => ({ result: `Simple processing: ${context.triggerData.dynamicInput}` }),
      });
      return wf.step(simpleStep);
    }
  );
}

/**
 * Factory for complex dynamic workflow with two steps.
 */
export function createComplexWorkflowFactory(mastra: MastraType): Workflow<any, any> {
  return buildWorkflow(
    "dynamic-complex-workflow",
    mastra,
    dynamicInputSchema,
    wf => {
      const step1 = new Step({
        id: "step1",
        outputSchema: intermediateSchema,
        execute: async ({ context }) => ({
          intermediateResult: `First processing: ${context.triggerData.dynamicInput}`,
        }),
      });
      const step2 = new Step({
        id: "step2",
        outputSchema: finalResultSchema,
        execute: async ({ context }) => {
          const intermediate = (context.getStepResult(step1) as any).intermediateResult;
          return { finalResult: `Second processing: ${intermediate}` };
        },
      });
      return wf.step(step1).then(step2);
    }
  );
}

/**
 * Factory for dynamic workflow (refactored to use buildWorkflow).
 */
export function createDynamicWorkflowFactory(mastra: MastraType): Workflow<any, any> {
  return buildWorkflow(
    "dynamic-workflow",
    mastra,
    dynamicInputSchema,
    wf => {
      const step = new Step({
        id: "dynamicStep",
        outputSchema: dynamicOutputSchema,
        execute: async ({ context }) => {
          const span = createAISpan("dynamicStep.execute");
          try {
            const dynamicInput = context.triggerData.dynamicInput;
            const processedValue = `Processed: ${dynamicInput}`;
            recordMetrics(span, { status: "success" });
            return { processedValue };
          } catch (error) {
            recordMetrics(span, { status: "error", errorMessage: String(error) });
            throw error;
          } finally {
            span.end();
          }
        },
      });
      return wf.step(step);
    }
  );
}

/**
 * Factory for advanced nested workflow: invokes complex workflow inside a step.
 */
export function createAdvancedNestedWorkflowFactory(mastra: MastraType): Workflow<any, any> {
  return buildWorkflow(
    "advanced-nested-workflow",
    mastra,
    dynamicInputSchema,
    wf => {
      const nestedStep = new Step({
        id: "nestedStep",
        outputSchema: dynamicOutputSchema,
        execute: async ({ context }) => {
          const complexWf = createComplexWorkflowFactory(mastra);
          const run = complexWf.createRun();
          const result = await run.start({
            triggerData: { threadId: context.triggerData.threadId, dynamicInput: context.triggerData.dynamicInput },
          });
          const step2Result = result.results["step2"];
          if (!step2Result || step2Result.status !== "success") {
            throw new Error("Nested workflow 'step2' failed");
          }
          const finalResult = step2Result.output.finalResult;
          return { processedValue: `Nested: ${finalResult}` };
        },
      });
      return wf.step(nestedStep);
    }
  );
}

// Branching factory config type
export type BranchConfig = { type: 'simple' | 'complex'; options?: any };

/**
 * Factory that selects simple or complex workflow based on config.
 */
export function createBranchingWorkflowFactory(
  mastra: MastraType,
  config: BranchConfig
): Workflow<any, any> {
  if (config.type === 'simple') {
    return createSimpleWorkflowFactory(mastra);
  }
  return createComplexWorkflowFactory(mastra);
}

export const createDynamicWorkflowStep = new Step({
  id: "createDynamicWorkflow",
  outputSchema: createDynamicWorkflowStepOutputSchema,
  execute: async ({ context, mastra }) => {
    const mastraInstance = mastra as MastraType;
    if (!mastraInstance) throw new Error("Mastra instance not available");
    const inputData = context.triggerData.inputData;
    const span = createAISpan("createDynamicWorkflowStep.execute");
    try {
      const dynamicWorkflow = createDynamicWorkflowFactory(mastraInstance);
      const run = dynamicWorkflow.createRun();
      const result = await run.start({
        triggerData: { threadId: context.triggerData.threadId, dynamicInput: inputData },
      });
      if (result.results["dynamicStep"]?.status === "success") {
        recordMetrics(span, { status: "success" });
        return {
          dynamicWorkflowResult: result.results["dynamicStep"].output,
        };
      } else {
        recordMetrics(span, { status: "error", errorMessage: "Dynamic workflow failed" });
        throw new Error("Dynamic workflow failed");
      }
    } catch (error) {
      recordMetrics(span, { status: "error", errorMessage: String(error) });
      throw error;
    } finally {
      span.end();
    }
  },
});

export const mainWorkflow = new Workflow({
  name: "main-workflow",
  triggerSchema: mainTriggerSchema,
  //  mastra: new Mastra({ storage }),
})
  .step(createDynamicWorkflowStep)
  .commit();

export const mastra = new Mastra({
  //  storage,
  workflows: { mainWorkflow },
});

export async function runMainWorkflow(threadId: string, inputData: string) {
  const run = mainWorkflow.createRun();
  return await run.start({ triggerData: { threadId, inputData } });
}

export { createDynamicWorkflowFactory as default };

/**
 * Factory for parallel workflow: runs two steps concurrently and merges results.
 */
export function createParallelWorkflowFactory(mastra: MastraType): Workflow<any, any> {
  return buildWorkflow(
    "parallel-workflow",
    mastra,
    dynamicInputSchema,
    wf => {
      const stepA = new Step({
        id: "parallelA",
        outputSchema: dynamicOutputSchema,
        execute: async ({ context }) => ({ processedValue: `Parallel A: ${context.triggerData.dynamicInput}` }),
      });
      const stepB = new Step({
        id: "parallelB",
        outputSchema: dynamicOutputSchema,
        execute: async ({ context }) => ({ processedValue: `Parallel B: ${context.triggerData.dynamicInput}` }),
      });
      const mergeStep = new Step({
        id: "mergeResults",
        outputSchema: dynamicOutputSchema,
        execute: async ({ context }) => {
          const a = context.getStepResult(stepA).processedValue;
          const b = context.getStepResult(stepB).processedValue;
          return { processedValue: `${a}; ${b}` };
        },
      });
      return wf.step(stepA).step(stepB).then(mergeStep);
    }
  );
}

/**
 * Factory using conditional branches (.if/.else).
 */
export function createConditionalWorkflowFactory(mastra: MastraType): Workflow<any, any> {
  return buildWorkflow(
    "conditional-workflow",
    mastra,
    mainTriggerSchema,
    wf => {
      const checkStep = new Step({
        id: "checkLength",
        outputSchema: isLongSchema,
        execute: async ({ context }) => ({ isLong: context.triggerData.inputData.length > 5 }),
      });
      const longStep = new Step({ id: "longMessage", outputSchema: messageSchema, execute: async () => ({ message: "Input is long" }) });
      const shortStep = new Step({ id: "shortMessage", outputSchema: messageSchema, execute: async () => ({ message: "Input is short" }) });
      return wf
        .step(checkStep)
        .if(({ results }: any) => results["checkLength"].output.isLong)
        .step(longStep)
        .else()
        .step(shortStep);
    }
  );
}

/**
 * Factory with retry logic using .until().
 */
export function createRetryWorkflowFactory(mastra: MastraType): Workflow<any, any> {
  return buildWorkflow(
    "retry-workflow",
    mastra,
    dynamicInputSchema,
    wf => {
      const attempt = new Step({
        id: "attempt",
        outputSchema: retrySchema,
        execute: async ({ context }) => ({
          threadId: context.triggerData.threadId,
          success: Math.random() > 0.7,
        }),
      });
      return wf.step(attempt).until(({ results }: any) => results["attempt"].output.success);
    }
  );
}

/**
 * Factory demonstrating loop using .while().
 */
export function createLoopWorkflowFactory(mastra: MastraType): Workflow<any, any> {
  return buildWorkflow(
    "loop-workflow",
    mastra,
    retrySchema,
    wf => {
      const loopStep = new Step({ id: "loopStep", outputSchema: messageSchema, execute: async ({ context }) => ({ message: `Loop: ${context.triggerData.success}` }) });
      return wf.step(loopStep).while(({ context }: any) => !context.triggerData.success);
    }
  );
}

/**
 * Factory showcasing suspend/resume placeholder.
 */
export function createSuspendResumeWorkflowFactory(mastra: MastraType): Workflow<any, any> {
  return buildWorkflow(
    "suspend-resume-workflow",
    mastra,
    dynamicInputSchema,
    wf => {
      const before = new Step({ id: "beforeSuspend", outputSchema: dynamicOutputSchema, execute: async ({ context }) => ({ processedValue: `Before suspend: ${context.triggerData.dynamicInput}` }) });
      const suspendStep = new Step({ id: "suspendPoint", outputSchema: dynamicOutputSchema, execute: async ({ context }) => ({ processedValue: `Suspended at ${context.triggerData.dynamicInput}` }) });
      const resumeStep = new Step({ id: "resumePoint", outputSchema: dynamicOutputSchema, execute: async ({ context }) => ({ processedValue: `Resumed: ${context.triggerData.dynamicInput}` }) });
      return wf.step(before).step(suspendStep).then(resumeStep);
    }
  );
}

/**
 * Factory with safe fallback: wraps dynamic workflow and returns fallback on error.
 */
export function createSafeWorkflowFactory(mastra: MastraType): Workflow<any, any> {
  return buildWorkflow(
    "safe-workflow",
    mastra,
    dynamicInputSchema,
    wf => {
      const safeStep = new Step({
        id: "safeStep",
        outputSchema: dynamicOutputSchema,
        execute: async ({ context, mastra }) => {
          try {
            const nested = createDynamicWorkflowFactory(mastra as MastraType);
            const run = nested.createRun();
            const res = await run.start({
              triggerData: { threadId: context.triggerData.threadId, dynamicInput: context.triggerData.dynamicInput },
            });
            const stepRes = res.results["dynamicStep"];
            if (stepRes?.status === "success") return stepRes.output;
          } catch {
            // fallback
          }
          return { processedValue: `Fallback for ${context.triggerData.dynamicInput}` };
        },
      });
      return wf.step(safeStep);
    }
  );
}

/**
 * Factory that applies plugins dynamically.
 */
export function createPluginableWorkflowFactory(
  mastra: MastraType,
  plugins: Array<(wf: Workflow<any, any>) => Workflow<any, any>>
): Workflow<any, any> {
  return buildWorkflow(
    "pluginable-workflow",
    mastra,
    dynamicInputSchema,
    wf => {
      let pipeline = wf;
      for (const plugin of plugins) pipeline = plugin(pipeline);
      return pipeline;
    }
  );
}

/**
 * Factory that injects audit steps before and after main processing.
 */
export function createAuditWorkflowFactory(mastra: MastraType): Workflow<any, any> {
  return buildWorkflow(
    "audit-workflow",
    mastra,
    dynamicInputSchema,
    wf => {
      const before = new Step({
        id: "auditBefore",
        outputSchema: messageSchema,
        execute: async ({ context }) => ({ message: `Starting: ${context.triggerData.dynamicInput}` }),
      });
      const process = new Step({
        id: "auditProcess",
        outputSchema: dynamicOutputSchema,
        execute: async ({ context }) => ({ processedValue: `Processed: ${context.triggerData.dynamicInput}` }),
      });
      const after = new Step({
        id: "auditAfter",
        outputSchema: messageSchema,
        execute: async ({ context }) => ({ message: `Finished: ${context.triggerData.dynamicInput}` }),
      });
      return wf.step(before).step(process).step(after);
    }
  );
}
