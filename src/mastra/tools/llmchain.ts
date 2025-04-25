/**
 * LLM Chain Tool for Mastra AI.
 *
 * This module provides tools for creating and running language model chains
 * using AI SDK and other providers, with integration to Mastra's agent ecosystem.
 *
 * Note: The tools exported from this file should be wrapped with `createMastraTools`
 * from @agentic/mastra when added to extraTools in index.ts.
 *
 * @module LLMChainTool
 */

import { createAIFunction } from "@agentic/core";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { createLLMChain } from "../services/langchain";
import { createLangSmithRun, trackFeedback } from "../services/langsmith";
import { env } from "process";

import { createLogger } from "@mastra/core/logger";
import { createMastraTools } from "@agentic/mastra";

const logger = createLogger({ name: "llm-chain-tool", level: "info" });

/**
 * Provider options for the LLM chain
 */
export type LLMProvider = "openai" | "google" | "anthropic";

/**
 * LLM Configuration options
 */
export interface LLMChainConfig {
  /** The model provider to use */
  provider?: LLMProvider;
  /** Specific model name to use */
  modelName?: string;
  /** Temperature setting for model responses (0-1) */
  temperature?: number;
  /** Maximum number of tokens in response */
  maxTokens?: number;
  /** Whether to enable LangSmith tracing */
  enableTracing?: boolean;
  /** Whether to use LangChain for processing */
}

/**
 * Creates an AI SDK model instance based on provider
 *
 * @param config - Configuration options for the AI SDK model
 * @returns A configured AI SDK model instance that supports both completion and chat interfaces
 * @throws {Error} When an unsupported provider is specified or when required API keys are missing
 */
function createAiSdkModel(config: LLMChainConfig = {}) {
  // Create model based on provider
  switch (config.provider || "google") {
    case "openai": {
      const modelName = config.modelName || "gpt-4o";
      return openai.chat(modelName as any, {});
    }

    case "google": {
      const modelName =
        config.modelName || env.MODEL || "models/gemini-2.0-flash";
      return google(modelName, {});
    }

    case "anthropic": {
      const modelName = config.modelName || "claude-3-sonnet-20240229";
      return anthropic(modelName, {});
    }

    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

/**
 * Input schema for the llmChainTool.
 */
const llmChainInputSchema = z.object({
  promptTemplate: z
    .string()
    .describe("The prompt template with {variables} to replace"),
  variables: z
    .record(z.string())
    .describe("Key-value pairs to substitute in the template"),
  provider: z
    .enum(["openai", "google", "anthropic"])
    .optional()
    .describe("LLM provider to use"),
  modelName: z.string().optional().describe("Specific model name to use"),
  temperature: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Creativity temperature (0-1)"),
  maxTokens: z.number().optional().describe("Maximum tokens in response"),
  useLangChain: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to use LangChain (true) or AI SDK (false)"),
});

/**
 * Tool for executing an LLM chain with a prompt template
 */
const _llmChainTool = createAIFunction(
  {
    name: "llm-chain",
    description: "Runs an LLM chain with a prompt template and variables",
    inputSchema: llmChainInputSchema,
  },
  async (context: z.infer<typeof llmChainInputSchema>) => {
    // Ensure the input schema is properly validated before execution
    if (!llmChainInputSchema) {
      throw new Error("Input schema is missing for llmChainTool");
    }

    const startTime = Date.now(); // Create run for LangSmith tracing
    const runId = await createLangSmithRun("llm-chain-tool", [
      "llm-chain",
      context.provider || "default",
    ]);

    try {
      // Extract variables from context
      const {
        promptTemplate,
        variables,
        provider = "google",
        modelName,
        temperature,
        maxTokens,
        useLangChain = false,
      } = context;

      // Configure LLM
      const llmConfig: LLMChainConfig = {
        provider: provider as LLMProvider,
        modelName,
        temperature,
        maxTokens,
        enableTracing: true,
      };

      let result: string;

      // Execute chain based on selected implementation
      if (useLangChain) {
        // Use LangChain implementation
        const chain = createLLMChain(promptTemplate, llmConfig);
        const response = await chain.invoke(variables);
        result = String(response);
      } else {
        // Use AI SDK implementation
        const model = createAiSdkModel(llmConfig);

        // Replace template variables manually
        let prompt = promptTemplate;
        for (const [key, value] of Object.entries(variables)) {
          prompt = prompt.replace(new RegExp(`{${key}}`, "g"), String(value));
        }

        // Handle different providers with appropriate API calls
        const messages = [{ role: "user", content: prompt }];
        let response;

        if (provider === "openai") {
          // Type assertion to access the chat method for OpenAI - using double casting for safety
          const openAIModel = model as unknown as {
            chat: (opts: { messages: any[] }) => Promise<{ content: string }>;
          };
          response = await openAIModel.chat({ messages });
          result = response.content;
        } else if (provider === "anthropic") {
          // Type assertion to access the messages method for Anthropic
          const anthropicModel = model as unknown as {
            messages: (opts: {
              messages: any[];
            }) => Promise<{ content: string }>;
          };
          response = await anthropicModel.messages({ messages });
          result = response.content;
        } else {
          // Google implementation
          // Type assertion to access the generateContent method for Google
          const googleModel = model as unknown as {
            generateContent: (opts: {
              contents: Array<{ role: string; text: string }>;
            }) => Promise<{ text: string }>;
          };
          response = await googleModel.generateContent({
            contents: [{ role: "user", text: prompt }],
          });
          result = response.text;
        }
      }

      const elapsedTimeMs = Date.now() - startTime;

      // Track success in LangSmith
      await trackFeedback(runId, {
        score: 1,
        comment: `Successfully executed LLM chain in ${elapsedTimeMs}ms`,
        key: "llm_chain_success",
      });

      // Return successful result
      return {
        result,
        success: true,
        metadata: {
          provider: provider,
          model:
            modelName ||
            (provider === "google"
              ? "gemini"
              : provider === "openai"
              ? "gpt-4o"
              : "claude"),
          elapsedTimeMs,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("LLM chain execution error:", error);

      // Track failure in LangSmith
      await trackFeedback(runId, {
        score: 0,
        comment: errorMessage,
        key: "llm_chain_failure",
      });

      // Return error result
      return {
        result: "",
        success: false,
        metadata: {
          provider: context.provider || "unknown",
          model: context.modelName || "unknown",
          elapsedTimeMs: Date.now() - startTime,
        },
        error: errorMessage,
      };
    }
  }
);

// Log the tool for debugging/linting purposes
console.log("_llmChainTool:", _llmChainTool);
logger.info("Registered _llmChainTool", { tool: _llmChainTool });

/**
 * Input schema for the aiSdkPromptTool.
 */
const aiSdkPromptInputSchema = z.object({
  prompt: z.string().describe("The prompt to send to the model"),
  provider: z
    .enum(["openai", "google", "anthropic"])
    .optional()
    .describe("LLM provider to use"),
  modelName: z.string().optional().describe("Specific model name to use"),
  temperature: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Creativity temperature (0-1)"),
  maxTokens: z.number().optional().describe("Maximum tokens in response"),
  schema: z
    .record(z.any())
    .optional()
    .describe("JSON schema for structured output"),
  systemPrompt: z.string().optional().describe("System prompt to use"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .optional()
    .describe("Conversation history"),
  // Add threadId and resourceId to the input schema if they are needed by the execute logic
  threadId: z.string().optional().describe("Execution thread ID"),
  resourceId: z.string().optional().describe("Resource ID for observability"),
});

/**
 * Tool for executing a structured prompt with the AI SDK
 */
const _aiSdkPromptTool = createAIFunction(
  {
    name: "ai-sdk-prompt",
    description: "Runs a prompt through AI SDK with structured output support",
    inputSchema: aiSdkPromptInputSchema,
  },
  async (context: z.infer<typeof aiSdkPromptInputSchema>) => {
    const startTime = Date.now(); // Create run for LangSmith tracing
    const runId = await createLangSmithRun("ai-sdk-prompt-tool", [
      "ai-sdk",
      context.provider || "default",
    ]);

    // Extract threadId and resourceId from context if they exist
    const executionThreadId = context.threadId;
    const resourceId = context.resourceId;

    try {
      // Extract other variables from context
      const {
        prompt,
        provider = "google",
        modelName,
        temperature,
        maxTokens,
        schema,
        systemPrompt,
        history = [],
      } = context;

      // Configure LLM
      const llmConfig: LLMChainConfig = {
        provider: provider as LLMProvider,
        modelName,
        temperature,
        maxTokens,
      };

      // Create model
      const model = createAiSdkModel(llmConfig); // Prepare messages
      const messages: Array<{ role: string; content: string }> = [];

      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }

      // Add history if provided
      if (history.length > 0) {
        messages.push(...history);
      }

      // Add the current prompt
      messages.push({ role: "user", content: prompt });

      let text: string;
      let structured: unknown = undefined;
      let response;

      // Handle different providers
      if (provider === "openai") {
        // OpenAI implementation with thread and resource management
        const options: any = { messages };

        // Add threadId if provided for conversation history
        if (executionThreadId) {
          options.thread_id = executionThreadId;
        }

        // Add resourceId if provided for observability
        if (resourceId) {
          options.metadata = {
            ...(options.metadata || {}),
            resourceId,
          };
        }

        // Add schema for structured output if provided
        if (schema) {
          options.tools = [
            {
              type: "function",
              function: {
                name: "output_formatter",
                description: "Format output according to schema",
                parameters: schema,
              },
            },
          ];

          options.tool_choice = {
            type: "function",
            function: { name: "output_formatter" },
          };
        }

        // Make API call with options
        const openAIModel = model as unknown as {
          chat: (opts: any) => Promise<any>;
        };
        response = await openAIModel.chat(options);

        // Extract structured output from OpenAI tool calls
        if (schema && response.tool_calls?.length > 0) {
          try {
            structured = JSON.parse(response.tool_calls[0].function.arguments);
            text = JSON.stringify(structured, null, 2);
          } catch (e) {
            console.warn("Failed to parse OpenAI tool call response:", e);
            text = response.content || "";
          }
        } else {
          text = response.content || "";
        }
      } else if (provider === "anthropic") {
        // Anthropic implementation with proper thread management
        const options: any = { messages };

        // Add threadId if provided to maintain conversation context
        if (executionThreadId) {
          options.threadId = executionThreadId;
        }

        // Add resourceId if provided for observability
        if (resourceId) {
          options.metadata = {
            ...(options.metadata || {}),
            resourceId,
          };
        }

        // Handle structured output via tool calling
        if (schema) {
          options.tools = [
            {
              name: "output_formatter",
              description: "Format output according to schema",
              parameters: schema,
            },
          ];
          options.tool_choice = {
            type: "function",
            function: { name: "output_formatter" },
          };

          // Type assertion to access the messages method for Anthropic
          const anthropicModel = model as unknown as {
            messages: (opts: any) => Promise<any>;
          };
          response = await anthropicModel.messages(options);

          // Extract structured output properly based on Claude's format
          if (response.tool_calls && response.tool_calls.length > 0) {
            try {
              structured = JSON.parse(
                response.tool_calls[0].function.arguments
              );
              text = JSON.stringify(structured, null, 2);
            } catch (e) {
              console.warn("Failed to parse Claude tool call response:", e);
              text = response.content || "";
            }
          } else {
            text = response.content || "";
          }
        } else {
          // Type assertion to access the messages method for Anthropic
          const anthropicModel = model as unknown as {
            messages: (opts: any) => Promise<any>;
          };
          response = await anthropicModel.messages(options);
          text = response.content || "";
        }
      } else {
        // Google implementation with thread and resource management
        const options: any = {
          contents: messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.content }],
          })),
        };

        // Add threadId for conversation history management if provided
        if (executionThreadId) {
          options.threadId = executionThreadId;
        }

        // Add resource tracking metadata if provided
        if (resourceId) {
          options.metadata = {
            ...(options.metadata || {}),
            resourceId,
          };
        }

        // Add schema for structured output if provided
        if (schema) {
          options.tools = [
            {
              functionDeclarations: [
                {
                  name: "output_formatter",
                  description: "Format output according to schema",
                  parameters: schema,
                },
              ],
            },
          ];

          options.toolConfig = {
            functionCallingConfig: {
              mode: "AUTO",
              allowedFunctionNames: ["output_formatter"],
            },
          };
        }

        // Make API call with proper options
        const googleModel = model as unknown as {
          generateContent: (opts: any) => Promise<any>;
        };
        response = await googleModel.generateContent(options);

        // Extract structured output from tool calls for Google
        if (
          schema &&
          response.candidates &&
          response.candidates[0]?.content?.parts?.length > 0
        ) {
          // Find function call in the parts
          interface FunctionCallPart {
            functionCall?: {
              name: string;
              args: string;
            };
            text?: string;
          }

          const functionCallPart = response.candidates[0].content.parts.find(
            (part: FunctionCallPart) => part.functionCall
          );

          if (functionCallPart?.functionCall) {
            try {
              structured = JSON.parse(functionCallPart.functionCall.args);
              text = JSON.stringify(structured, null, 2);
            } catch (e) {
              console.warn("Failed to parse Google function call response:", e);
              text = response.text || "";
            }
          } else {
            text = response.text || "";
          }
        } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = response.candidates[0].content.parts[0].text;
        } else {
          text = response.text || "";
        }
      }
      const elapsedTimeMs = Date.now() - startTime;

      // Track success in LangSmith
      await trackFeedback(runId, {
        score: 1,
        comment: `Successfully executed AI SDK prompt in ${elapsedTimeMs}ms`,
        key: "ai_sdk_success",
      });

      // Return successful result
      return {
        text,
        structured,
        success: true,
        metadata: {
          provider: provider,
          model:
            modelName ||
            (provider === "google"
              ? "gemini"
              : provider === "openai"
              ? "gpt-4o"
              : "claude"),
          elapsedTimeMs,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("AI SDK prompt execution error:", error);
      await trackFeedback(runId, {
        score: 0,
        comment: errorMessage,
        key: "ai_sdk_failure",
      });
      throw new Error(errorMessage);
    }
  }
);

export const LLMChainOutputSchema = z.object({
  result: z.string().describe("The final string output from the LLM chain."),
  success: z.boolean().describe("Indicates if the chain execution was successful."),
  metadata: z.object({
    provider: z.string(),
    model: z.string(),
    elapsedTimeMs: z.number(),
  }).passthrough().describe("Execution metadata."),
  error: z.string().optional().describe("Error message if execution failed."),
}).describe("Schema for the output of the llm-chain tool");

export const AiSdkPromptOutputSchema = z.object({
  text: z.string().describe("The primary text output from the AI SDK call."),
  structured: z.unknown().optional().describe("Parsed structured output object if a schema was provided."),
  success: z.boolean().describe("Indicates if the AI SDK call was successful."),
  metadata: z.object({
    provider: z.string(),
    model: z.string(),
    elapsedTimeMs: z.number(),
    usage: z.object({
      promptTokens: z.number().int().optional(),
      completionTokens: z.number().int().optional(),
      totalTokens: z.number().int().optional(),
    }).optional(),
    finishReason: z.string().optional(),
    rawResponse: z.any().optional(),
  }).passthrough().describe("Execution metadata."),
  error: z.string().optional().describe("Error message if execution failed."),
}).describe("Schema for the output of the ai-sdk-prompt tool");

// Export functions
export function createMastraLLMChainTools() {
  const mastraTools = createMastraTools(_llmChainTool, _aiSdkPromptTool);
  if (mastraTools["llm-chain"]) {
    (mastraTools["llm-chain"] as any).outputSchema = LLMChainOutputSchema;
  }
  if (mastraTools["ai-sdk-prompt"]) {
    (mastraTools["ai-sdk-prompt"] as any).outputSchema = AiSdkPromptOutputSchema;
  }
  return mastraTools;
}

// Export Mastra-compliant tool objects for use in coreTools
export const { aiSdkPromptTool, llmChainTool } = createMastraLLMChainTools();

export { createMastraTools } from "@agentic/mastra";

export default llmChainTool;
