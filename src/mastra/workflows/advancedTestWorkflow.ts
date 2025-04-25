import { Step, Workflow } from "@mastra/core/workflows";
import { Mastra } from "@mastra/core";
import type { Mastra as MastraType } from "@mastra/core";
import { z } from "zod";
import { researchAgent, analystAgent, writerAgent, masterAgent } from "../agents";
import { createAISpan, recordMetrics } from "../services/signoz";
import workflowFactory from "./workflowFactory";

/**
 * Advanced test workflow invoking research, analysis, documentation, and master agents in sequence.
 */
export function createAdvancedTestWorkflow(mastra: MastraType) {
  return new Workflow({
    name: "advanced-test-workflow",
    mastra,
    triggerSchema: z.object({
      topics: z.array(z.string()).describe("List of topics to test across agents"),
    }),
  })
    // Preprocess topics via dynamic workflow
    .step(
      new Step({
        id: "preprocess-phase",
        inputSchema: z.object({ topics: z.array(z.string()) }),
        outputSchema: z.object({ processedTopics: z.array(z.string()) }),
        execute: async ({ context, mastra }) => {
          const factory = workflowFactory(mastra as MastraType);
          const topicsInput = context.triggerData.topics;
          const processedTopics: string[] = [];
          for (const topic of topicsInput) {
            const run = factory.createRun();
            const res = await run.start({ triggerData: { dynamicInput: topic } });
            const dynamicStepResult = res.results["dynamicStep"];
            if (dynamicStepResult && dynamicStepResult.status === "success" && dynamicStepResult.output) {
              processedTopics.push(dynamicStepResult.output.processedValue);
            } else {
              throw new Error(`dynamicStep failed for topic: ${topic}`);
            }
          }
          return { processedTopics };
        },
      })
    )
    // Research phase
    .step(
      new Step({
        id: "research-phase",
        inputSchema: z.object({ processedTopics: z.array(z.string()) }),
        outputSchema: z.object({ findings: z.array(z.string()) }),
        execute: async ({ context }) => {
          const span = createAISpan("research-phase");
          try {
            const topics = context.getStepResult<{ processedTopics: string[] }>(
              "preprocess-phase"
            )!.processedTopics;
            const findings = await Promise.all(
              topics.map(async (topic: any) => {
                const res = await researchAgent.generate(
                  `Research in depth: ${topic}`
                );
                return res.text;
              })
            );
            recordMetrics(span, { status: "success" });
            return { findings };
          } catch (error) {
            recordMetrics(span, { status: "error", errorMessage: String(error) });
            throw error;
          } finally {
            span.end();
          }
        },
      })
    )
    // Analysis phase
    .step(
      new Step({
        id: "analysis-phase",
        inputSchema: z.object({ findings: z.array(z.string()) }),
        outputSchema: z.object({ analyses: z.array(z.string()) }),
        execute: async ({ context }) => {
          const span = createAISpan("analysis-phase");
          try {
            const findings = context.getStepResult<{ findings: string[] }>(
              "research-phase"
            )!.findings;
            const analyses = await Promise.all(
              findings.map(async (text) => {
                const res = await analystAgent.generate(
                  `Analyze: ${text}`
                );
                return res.text;
              })
            );
            recordMetrics(span, { status: "success" });
            return { analyses };
          } catch (error) {
            recordMetrics(span, { status: "error", errorMessage: String(error) });
            throw error;
          } finally {
            span.end();
          }
        },
      })
    )
    // Documentation phase
    .step(
      new Step({
        id: "documentation-phase",
        inputSchema: z.object({ analyses: z.array(z.string()) }),
        outputSchema: z.object({ documents: z.array(z.string()) }),
        execute: async ({ context }) => {
          const span = createAISpan("documentation-phase");
          try {
            const analyses = context.getStepResult<{ analyses: string[] }>(
              "analysis-phase"
            )!.analyses;
            const documents = await Promise.all(
              analyses.map(async (analysis) => {
                const res = await writerAgent.generate(
                  `Create report: ${analysis}`
                );
                return res.text;
              })
            );
            recordMetrics(span, { status: "success" });
            return { documents };
          } catch (error) {
            recordMetrics(span, { status: "error", errorMessage: String(error) });
            throw error;
          } finally {
            span.end();
          }
        },
      })
    )
    // Master testing phase
    .step(
      new Step({
        id: "testing-phase",
        inputSchema: z.object({ documents: z.array(z.string()) }),
        outputSchema: z.object({ results: z.array(z.string()) }),
        execute: async ({ context }) => {
          const span = createAISpan("testing-phase");
          try {
            const docs = context.getStepResult<{ documents: string[] }>(
              "documentation-phase"
            )!.documents;
            const results = await Promise.all(
              docs.map(async (doc) => {
                const res = await masterAgent.generate(
                  `Validate document quality and completeness: ${doc}`
                );
                return res.text;
              })
            );
            recordMetrics(span, { status: "success" });
            return { results };
          } catch (error) {
            recordMetrics(span, { status: "error", errorMessage: String(error) });
            throw error;
          } finally {
            span.end();
          }
        },
      })
    )
    .commit();
}

export const advancedTestWorkflow = createAdvancedTestWorkflow(
  new Mastra()
);
