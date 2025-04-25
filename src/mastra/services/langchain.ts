/**
 * LangChain integration service for Mastra AI.
 *
 * Provides utility functions to integrate LangChain functionalities
 * with Mastra agents and workflows.
 */

import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ConversationChain } from "langchain/chains";
import { SystemMessage } from "@langchain/core/messages";
import { PromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";
import { env } from "process";
import { configureLangSmithTracing } from "./langsmith";

/**
 * Model provider options for LangChain
 */
export type ModelProvider = "openai" | "google" | "anthropic";

/**
 * Configuration options for LangChain models
 */
export interface LangChainConfig {
  /** The model provider to use */
  provider?: ModelProvider;
  /** Specific model name to use */
  modelName?: string;
  /** Whether to enable tracing with LangSmith */
  enableTracing?: boolean;
  /** Temperature setting for model responses (0-1) */
  temperature?: number;
  /** Maximum number of tokens in response */
  maxTokens?: number;
  /** Custom callback handlers for LangChain */
  callbacks?: BaseCallbackHandler[];
}

/**
 * Creates a configured LangChain chat model based on provider
 *
 * @param config - Configuration options for the LangChain model
 * @returns A configured chat model ready for use with LangChain
 * @throws {Error} When required API keys are missing
 */
export function createLangChainModel(config: LangChainConfig = {}) {
  // Set up LangSmith tracing if enabled
  if (config.enableTracing !== false) {
    configureLangSmithTracing();
  }

  const callbacks = config.callbacks || [];

  // Create model based on provider
  switch (config.provider || "google") {
    case "openai":
      if (!env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key is required");
      }
      return new ChatOpenAI({
        modelName: config.modelName || "gpt-4",
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens,
        callbacks,
      });

    case "anthropic":
      if (!env.ANTHROPIC_API_KEY) {
        throw new Error("Anthropic API key is required");
      }
      return new ChatAnthropic({
        modelName: config.modelName || "claude-3-sonnet-20240229",
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens,
        anthropicApiKey: env.ANTHROPIC_API_KEY,
        callbacks,
      });

    case "google":
    default:
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error("Google AI API key is required");
      }
      return new ChatGoogleGenerativeAI({
        model: config.modelName || env.MODEL || "models/gemini-2.0-flash",
        apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens,
        callbacks,
      });
  }
}

/**
 * Creates a conversation chain with system instructions
 *
 * @param systemPrompt - System instructions for the conversation
 * @param config - LangChain model configuration
 * @returns A configured conversation chain
 */
export function createConversationChain(
  systemPrompt: string,
  config?: LangChainConfig
) {
  const llm = createLangChainModel(config);

  const prompt = ChatPromptTemplate.fromMessages([
    new SystemMessage(systemPrompt),
    ["human", "{input}"],
  ]);

  return new ConversationChain({
    llm,
    prompt,
  });
}

/**
 * Creates a chain using LangChain Expression Language (LCEL) with a custom prompt template
 *
 * @param promptTemplate - The prompt template string with {variables}
 * @param config - LangChain model configuration
 * @returns A configured LCEL chain
 */
export function createLLMChain(
  promptTemplate: string,
  config?: LangChainConfig
) {
  const llm = createLangChainModel(config);
  const prompt = PromptTemplate.fromTemplate(promptTemplate);

  // Using LCEL pipe pattern instead of deprecated LLMChain
  return prompt.pipe(llm);
}
