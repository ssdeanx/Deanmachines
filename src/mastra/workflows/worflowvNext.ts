import {
    createWorkflow,
    createStep,
    cloneStep,
    cloneWorkflow,
    NewStep,
    ExecuteFunction,
} from "@mastra/core/workflows/vNext";
import { z } from "zod";
import { getTracer, createTracedSpan } from "../services/tracing.js"; // Import tracing utilities

// Lazy load Langfuse
let langfuseInstance: typeof import("../services/langfuse.js").langfuse | null = null;

async function getLangfuse() {
  if (langfuseInstance === null) {
    try {
      const { langfuse } = await import("../services/langfuse.js");
      langfuseInstance = langfuse;
    } catch (error) {
      console.error("Failed to load Langfuse:", error);
      // Handle the error, perhaps by returning a dummy object or null
      // to prevent subsequent errors. For now, we'll just log and return null.
      return null;
    }
  }
  return langfuseInstance;
}

const step1 = createStep({
    id: "step1",
    description: "Step 1",
    inputSchema: z.object({
        inputValue: z.string(),
    }),
    outputSchema: z.object({
        outputValue: z.string(),
    }),
    execute: async ({ inputData, mastra, getStepResult, getInitData, runtimeContext }) => {
      // Create a span for step execution
      const span = createTracedSpan(`step1.execute`);
      try {
        // Your existing step logic
        const result = { outputValue: `Processed: ${inputData.inputValue}` };
        // Log success to Langfuse (optional, but good for full trace)
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step1.execute.success', { input: inputData, output: result });
        return result;
      } catch (error) {
        // Log error to Langfuse
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step1.execute.error', { error: String(error), input: inputData });
        span.recordException(error); // Record exception on the span
        throw error; // Re-throw the error to propagate it
      } finally {
        span.end(); // Ensure span is always ended
      }
    },
});

const step2 = createStep({
    id: "step2",
    description: "Step 2",
    inputSchema: z.object({
        inputValue: z.string(),
    }),
    outputSchema: z.object({
        outputValue: z.string(),
    }),
    execute: async ({ inputData, mastra, getStepResult, getInitData, runtimeContext }) => {
      const span = createTracedSpan(`step2.execute`);
      try {
        const result = { outputValue: `Processed: ${inputData.inputValue}` };
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step2.execute.success', { input: inputData, output: result });
        return result;
      } catch (error) {
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step2.execute.error', { error: String(error), input: inputData });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    },
});

const step3 = createStep({
    id: "step3",
    description: "Step 3",
    inputSchema: z.object({
        inputValue: z.string(),
    }),
    outputSchema: z.object({
        outputValue: z.string(),
    }),
    execute: async ({ inputData, mastra, getStepResult, getInitData, runtimeContext }) => {
      const span = createTracedSpan(`step3.execute`);
      try {
        const result = { outputValue: `Processed: ${inputData.inputValue}` };
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step3.execute.success', { input: inputData, output: result });
        return result;
      } catch (error) {
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step3.execute.error', { error: String(error), input: inputData });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    },
});

const step4 = createStep({
    id: "step4",
    description: "Step 4",
    inputSchema: z.object({
        inputValue: z.string(),
    }),
    outputSchema: z.object({
        outputValue: z.string(),
    }),
    execute: async ({ inputData, mastra, getStepResult, getInitData, runtimeContext }) => {
      const span = createTracedSpan(`step4.execute`);
      try {
        const result = { outputValue: `Processed: ${inputData.inputValue}` };
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step4.execute.success', { input: inputData, output: result });
        return result;
      } catch (error) {
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step4.execute.error', { error: String(error), input: inputData });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    },
});

  // Wrap workflow definition and commit in a span
  const workflowSpan = createTracedSpan('myWorkflow.definition');
  const myWorkflow = createWorkflow({
    id: "zFlow-1",
    inputSchema: z.object({
        startValue: z.string(),
      }),
      outputSchema: z.object({
        result: z.string(),
      }),
    steps: [step1, step2, step3],
  });
  myWorkflow.then(step1).then(step2).then(step3).commit();
  workflowSpan.end(); // End span after workflow is defined and committed


  // Wrap parent workflow definition and commit in a span
  const parentWorkflowSpan = createTracedSpan('parentWorkflow.definition');
  const parentWorkflow = createWorkflow({
    id: "parent-workflow",
    inputSchema: z.object({
        startValue: z.string(),
      }),
      outputSchema: z.object({
        result: z.string(),
      }),
    steps: [myWorkflow, step4],
  });
  parentWorkflow
    .then(myWorkflow)
    .then(step4)
    .then(cloneWorkflow(myWorkflow, { id: "cloned-workflow" }))
    .then(cloneStep(step4, { id: "cloned-step-4" }))
    .commit();
  parentWorkflowSpan.end(); // End span


const step5 = createStep({
    id: "step5",
    description: "Step 5",
    inputSchema: z.object({
        inputValue: z.string(),
    }),
    outputSchema: z.object({
        outputValue: z.string(),
    }),
    execute: async ({ inputData, mastra, getStepResult, getInitData, runtimeContext }) => {
      const span = createTracedSpan(`step5.execute`);
      try {
        const result = { outputValue: `Processed: ${inputData.inputValue}` };
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step5.execute.success', { input: inputData, output: result });
        return result;
      } catch (error) {
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step5.execute.error', { error: String(error), input: inputData });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    },
});

const step6 = createStep({
    id: "step6",
    description: "Step 6",
    inputSchema: z.object({
        inputValue: z.string(),
    }),
    outputSchema: z.object({
        outputValue: z.string(),
    }),
    execute: async ({ inputData, mastra, getStepResult, getInitData, runtimeContext }) => {
      const span = createTracedSpan(`step6.execute`);
      try {
        const result = { outputValue: `Processed: ${inputData.inputValue}` };
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step6.execute.success', { input: inputData, output: result });
        return result;
      } catch (error) {
        const lf = await getLangfuse();
        if (lf) lf.logWithTraceContext('step6.execute.error', { error: String(error), input: inputData });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    },
});