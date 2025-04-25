import { Workflow, Step } from "@mastra/core/workflows";
import { Mastra, type Mastra as MastraType } from "@mastra/core";
import { createLogger } from "@mastra/core/logger";
import { z } from "zod";
import { sharedMemory } from "../database";
import { researchAgent } from "../agents/research.agent";
import { analystAgent } from "../agents/analyst.agent";
import { writerAgent } from "../agents/writer.agent";
import { copywriterAgent } from "../agents/copywriter.agent";
import { threadManager } from "../utils/thread-manager";
import { createAISpan, recordMetrics } from "../services/signoz";
import { initializeDefaultTracing } from "../services/tracing";
import type { MastraStorage } from "@mastra/core";

const logger = createLogger({ name: "multiagentWorkflow" });

// Create a MastraStorage-compatible store
const storage: MastraStorage = sharedMemory as unknown as MastraStorage;

// Initialize workflow
logger.info("Initializing multi-agent workflow with sharedMemory storage");

// Initialize tracing at the top level
initializeDefaultTracing();

// Step 1: Research
const researchStep = new Step({
  id: "research",
  description: "Researches the query and gathers relevant information",
  inputSchema: z.object({
    query: z.string().describe("The research query to investigate"),
  }),
  execute: async ({ context }) => {
    const triggerData = context.getStepResult<{ query: string }>("trigger");
    const threadInfo = await threadManager.createThread({ resourceId: "research-thread" });
    const threadId = threadInfo?.id || "default-thread-id";
    const span = createAISpan("step.research", { threadId });

    try {
      const { text } = await researchAgent.generate(triggerData.query);
      recordMetrics(span, { status: "success" });
      // Optionally store to sharedMemory here if needed
      return text;
    } catch (error) {
      recordMetrics(span, { status: "error", errorMessage: String(error) });
      throw error;
    } finally {
      span.end();
    }
  },
});

// Step 2: Analysis
const analysisStep = new Step({
  id: "analysis",
  description: "Analyzes the research findings and extracts insights",
  inputSchema: z.object({
    research: z.any(),
  }),
  execute: async ({ context }) => {
    const researchResult = context.getStepResult<string>("research");
    const threadInfo = await threadManager.getThread("research-thread");
    const threadId = threadInfo?.id || "default-thread-id";
    const span = createAISpan("step.analysis", { threadId });

    try {
      const { text } = await analystAgent.generate(researchResult);
      recordMetrics(span, { status: "success" });
      return text;
    } catch (error) {
      recordMetrics(span, { status: "error", errorMessage: String(error) });
      throw error;
    } finally {
      span.end();
    }
  },
});

// Step 3: Writing
const writingStep = new Step({
  id: "writing",
  description: "Drafts a document based on the analysis",
  inputSchema: z.object({
    analysis: z.any(),
  }),
  execute: async ({ context }) => {
    const analysisResult = context.getStepResult<string>("analysis");
    const threadInfo = await threadManager.getThread("research-thread");
    const threadId = threadInfo?.id || "default-thread-id";
    const span = createAISpan("step.writing", { threadId });

    try {
      const { text } = await writerAgent.generate(analysisResult);
      recordMetrics(span, { status: "success" });
      return text;
    } catch (error) {
      recordMetrics(span, { status: "error", errorMessage: String(error) });
      throw error;
    } finally {
      span.end();
    }
  },
});

// Step 4: Review
const reviewStep = new Step({
  id: "review",
  description: "Reviews and polishes the draft",
  inputSchema: z.object({
    writing: z.any(),
  }),
  execute: async ({ context }) => {
    const writingResult = context.getStepResult<string>("writing");
    const threadInfo = await threadManager.getThread("research-thread");
    const threadId = threadInfo?.id || "default-thread-id";
    const span = createAISpan("step.review", { threadId });

    try {
      const { text } = await copywriterAgent.generate(writingResult);
      recordMetrics(span, { status: "success" });
      return text;
    } catch (error) {
      recordMetrics(span, { status: "error", errorMessage: String(error) });
      throw error;
    } finally {
      span.end();
    }
  },
});

// Step 5: Refinement
const refinementStep = new Step({
  id: "refinement",
  description: "Refines the reviewed draft",
  inputSchema: z.object({
    review: z.any(),
  }),
  execute: async ({ context }) => {
    const reviewResult = context.getStepResult<string>("review");
    const threadInfo = await threadManager.getThread("research-thread");
    const threadId = threadInfo?.id || "default-thread-id";
    const span = createAISpan("step.refinement", { threadId });

    try {
      const { text } = await writerAgent.generate(reviewResult);
      recordMetrics(span, { status: "success" });
      return text;
    } catch (error) {
      recordMetrics(span, { status: "error", errorMessage: String(error) });
      throw error;
    } finally {
      span.end();
    }
  },
});

// Compose the workflow
export const multiAgentWorkflow = new Workflow({
  name: "research-analyze-write-review-refine",
  triggerSchema: z.object({
    query: z.string().describe("Search query"),
  }),
})
  .step(researchStep)
  .then(analysisStep)
  .then(writingStep)
  .then(reviewStep)
  .then(refinementStep)
  .commit();

export const mastra: MastraType = new Mastra({
  storage, // Use sharedMemory directly
  agents: {
    research: researchAgent,
    analyst: analystAgent,
    writer: writerAgent,
    review: copywriterAgent,
  },
  workflows: { multiAgentWorkflow },
});