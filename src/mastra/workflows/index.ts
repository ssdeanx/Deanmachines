import { Step, Workflow } from "@mastra/core/workflows";
import { z } from "zod";
import { researchAgent, analystAgent, writerAgent } from "../agents";
import { sharedMemory as memory } from "../database";
import { PineconeStore } from "@langchain/pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { multiAgentWorkflow } from "./multiagentWorkflow";
import  workflowFactory from "./workflowFactory";
import { advancedTestWorkflow } from "./advancedTestWorkflow";
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// Create a research step that gathers relevant information
const researchStep = new Step({
  id: "research-step",
  description: "Researches the query and gathers relevant information",
  inputSchema: z.object({
    query: z.string().describe("The research query to investigate"),
  }),
  execute: async ({ context, mastra }) => {
    if (mastra?.logger) {
      mastra.logger.info("Starting research step execution");
    }

    const triggerData = context?.getStepResult<{ query: string }>("trigger");

    if (!triggerData) {
      throw new Error("Trigger data not found");
    }

    // Use the research agent to gather information
    const response = await researchAgent.generate(
      `Research the following topic in depth: ${triggerData.query}`,
      {
        memoryOptions: {
          lastMessages: 10,
        },
      }
    );

    // Return the research findings
    return {
      query: triggerData.query,
      findings: response.text,
      timestamp: new Date().toISOString(),
    };
  },
});

// Create an analysis step that processes the research findings
const analysisStep = new Step({
  id: "analysis-step",
  description: "Analyzes the research findings and extracts insights",
  inputSchema: z.object({
    query: z.string(),
    findings: z.string(),
    timestamp: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    if (mastra?.logger) {
      mastra.logger.info("Starting analysis step execution");
    }

    const researchData = context?.getStepResult<{
      query: string;
      findings: string;
      timestamp: string;
    }>("research-step");

    if (!researchData) {
      throw new Error("Research data not found");
    }

    // Use the analyst agent to analyze the findings
    const response = await analystAgent.generate(
      `Analyze these research findings on "${researchData.query}" and extract key insights, patterns, and implications:\n\n${researchData.findings}`,
      {
        memoryOptions: {
          lastMessages: 10,
        },
      }
    );

    // Return the analysis
    return {
      query: researchData.query,
      findings: researchData.findings,
      analysis: response.text,
      timestamp: researchData.timestamp,
    };
  },
});

// Create a documentation step that creates a final report
const documentationStep = new Step({
  id: "documentation-step",
  description:
    "Creates a well-formatted document based on research and analysis",
  inputSchema: z.object({
    query: z.string(),
    findings: z.string(),
    analysis: z.string(),
    timestamp: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    if (mastra?.logger) {
      mastra.logger.info("Starting documentation step execution");
    }

    const analysisData = context?.getStepResult<{
      query: string;
      findings: string;
      analysis: string;
      timestamp: string;
    }>("analysis-step");

    if (!analysisData) {
      throw new Error("Analysis data not found");
    }

    // Use the writer agent to create documentation
    const response = await writerAgent.generate(
      `Create a comprehensive report based on this research query, findings, and analysis:\n\nQUERY: ${analysisData.query}\n\nFINDINGS: ${analysisData.findings}\n\nANALYSIS: ${analysisData.analysis}`,
      {
        memoryOptions: {
          lastMessages: 10,
        },
      }
    );
    // Store the final document in Pinecone for future retrieval
    try {
      // Initialize the Pinecone client
      const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
      });

      // Get the index from the client
      const indexName = process.env.PINECONE_INDEX || "Default";
      const pineconeIndex = pinecone.Index(indexName);

      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
      });

      await vectorStore.addDocuments([
        {
          pageContent: response.text,
          metadata: {
            query: analysisData.query,
            timestamp: analysisData.timestamp,
            type: "final_report",
          },
        },
      ]);
    } catch (error) {
      console.error("Error storing document in vector database:", error);
    }

    // Return the final document
    return {
      query: analysisData.query,
      document: response.text,
      timestamp: new Date().toISOString(),
    };
  },
});

// RL Feedback Collection Step (for reinforcement learning)
const feedbackStep = new Step({
  id: "feedback-step",
  description: "Collects feedback for reinforcement learning",
  inputSchema: z.object({
    query: z.string(),
    document: z.string(),
    timestamp: z.string(),
    feedback: z
      .object({
        accuracy: z.number().min(1).max(10).describe("Accuracy rating (1-10)"),
        completeness: z
          .number()
          .min(1)
          .max(10)
          .describe("Completeness rating (1-10)"),
        clarity: z.number().min(1).max(10).describe("Clarity rating (1-10)"),
        comments: z
          .string()
          .optional()
          .describe("Additional feedback comments"),
      })
      .optional(),
  }),
  execute: async ({ context, mastra }) => {
    const documentData = context?.getStepResult<{
      query: string;
      document: string;
      timestamp: string;
      feedback?: {
        accuracy: number;
        completeness: number;
        clarity: number;
        comments?: string;
      };
    }>("documentation-step");

    if (!documentData) {
      throw new Error("Document data not found");
    }

    // For simulation purposes, we'll use the AI SDK to evaluate the document
    // Using mastra parameter for logging and tracing if available
    if (mastra?.logger) {
      mastra.logger.info("Starting document feedback evaluation using AI SDK");
    }

    try {
      // Using the ai package's generateText function with google model
      const result = await generateText({
        model: google("models/gemini-2.0-flash"),
        prompt: `
        You are an evaluator for research documents. Rate the following document on a scale of 1-10 for:
        1. Accuracy (factual correctness)
        2. Completeness (covers all aspects of the topic)
        3. Clarity (easy to understand)

        Also provide brief comments on what could be improved.

        QUERY: ${documentData.query}
        DOCUMENT: ${documentData.document}

        Return ONLY valid JSON with this structure:
        {
          "accuracy": 7,
          "completeness": 8,
          "clarity": 9,
          "comments": "Brief feedback comments here"
        }
      `,
      });

      // The result structure from generateText() is different
      const feedbackText = result.text;
      let feedback;

      try {
        // Extract JSON from the response
        const jsonMatch = feedbackText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          feedback = JSON.parse(jsonMatch[0]);
        } else {
          // Default feedback if parsing fails
          feedback = {
            accuracy: 7,
            completeness: 7,
            clarity: 7,
            comments: "Unable to parse specific feedback",
          };
        }
      } catch (jsonError) {
        console.error("Error parsing feedback:", jsonError);
        feedback = {
          accuracy: 7,
          completeness: 7,
          clarity: 7,
          comments: "Error occurred during feedback generation",
        };
      }

      // Store feedback in memory for reinforcement learning
      try {
        // Create a unique thread for storing this feedback entry
        const feedbackThreadId = `feedback_${documentData.timestamp.replace(
          /[^a-zA-Z0-9]/g,
          ""
        )}`;
        const feedbackResourceId = `feedback_resource_${documentData.query
          .replace(/\s+/g, "_")
          .toLowerCase()}`;

        // Store feedback as metadata on a new thread
        await memory.createThread({
          resourceId: feedbackResourceId,
          threadId: feedbackThreadId,
          title: `Feedback for: ${documentData.query}`,
          metadata: {
            query: documentData.query,
            feedback,
            timestamp: new Date().toISOString(),
            origin: "system",
          },
        });
      } catch (storageError) {
        console.error("Error storing feedback in memory:", storageError);
      }

      return {
        query: documentData.query,
        document: documentData.document,
        feedback,
        timestamp: documentData.timestamp,
      };
    } catch (error) {
      console.error("Error in feedback step:", error);
      return {
        query: documentData.query,
        document: documentData.document,
        feedback: {
          accuracy: 5,
          completeness: 5,
          clarity: 5,
          comments: "Error occurred during feedback collection",
        },
        timestamp: documentData.timestamp,
      };
    }
  },
});

// Create the complete RAG workflow
const ragWorkflow = new Workflow({
  name: "rag-research-workflow",
  triggerSchema: z.object({
    query: z.string().describe("The research query to investigate"),
  }),
})
  .step(researchStep)
  .then(analysisStep)
  .then(documentationStep)
  .then(feedbackStep);

// Commit the workflow
ragWorkflow.commit();

/**
 * Workflows Index
 *
 * This file exports all workflows and agent networks available in the DeanmachinesAI system.
 * Workflows provide predefined execution paths, while AgentNetworks use LLM-based routing
 * for dynamic agent collaboration.
 */

// Export all available workflows
export { ragWorkflow };

// Export agent networks
export * from "./Networks/agentNetwork";
export * from "./workflowFactory";
export { multiAgentWorkflow };
export { advancedTestWorkflow };

// Export the workflowFactory for use in other parts of the application
export { workflowFactory };

// TODO: Add and export additional workflow definitions here as they are developed
// export * from "./researchWorkflow";
