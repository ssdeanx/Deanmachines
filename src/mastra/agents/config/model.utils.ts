// Project: Mastra - A Modular Agent Framework
//  * @module src/mastra/agents/config/model.utils.ts
//  * @description This module provides utility functions for creating model instances
//  * based on configuration settings, supporting multiple providers.
//  * @module model.utils
//  * @author ssdeanx
//  * @license MIT
//  * @version 1.0.1
//  * @date 2025-05-01
//
/**
 * Model Utility Functions
 *
 * This module provides utility functions for creating AI model instances
 * based on configuration settings, supporting multiple providers.
 *
 * @module model.utils
 */

import { google } from "@ai-sdk/google";
import { vertex } from "@ai-sdk/google-vertex";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { ollama } from "ollama-ai-provider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { OpenAIProviderConfig, AnthropicProviderConfig, OllamaProviderConfig, getProviderConfig } from "./provider.utils.js";
import { ModelConfig } from "./config.types.js";
import type { OpenAICompatibleProviderConfig } from "./provider.utils.js";

/**
 * Model creation options
 */
export interface ModelCreationOptions {
  /** Project ID for Vertex AI */
  vertexProjectId?: string;

  /** Location for Vertex AI */
  vertexLocation?: string;

  /** Google API key */
  googleApiKey?: string;
}

/**
 * Creates a model instance based on the provided configuration
 *
 * @param modelConfig - Configuration for the model
 * @param options - Additional options for model creation
 * @returns A model instance compatible with @mastra/core/agent
 * @throws {Error} If the model provider is unsupported or configuration is invalid
 */
export function createModelFromConfig(
  modelConfig: ModelConfig,
  options: ModelCreationOptions = {}
): ReturnType<typeof google | typeof vertex | typeof openai | typeof anthropic | typeof ollama | typeof createOpenAICompatible> {
  try {
    const { provider, modelId, providerOptions } = modelConfig;
    switch (provider) {
      case "google": {
        // Use googleApiKey from options if provided
        const googleOptions: Record<string, unknown> = {};
        if (options.googleApiKey) googleOptions["apiKey"] = options.googleApiKey;
        return google(modelId, googleOptions);
      }
      case "vertex": {
        // Use vertexProjectId and vertexLocation from options if provided
        const vertexOptions: Record<string, unknown> = {};
        if (options.vertexProjectId) vertexOptions["project"] = options.vertexProjectId;
        if (options.vertexLocation) vertexOptions["location"] = options.vertexLocation;
        return vertex(modelId, vertexOptions);
      }
      case "openai": {
        const settings: Record<string, unknown> = { ...options };
        if (providerOptions && (providerOptions as OpenAIProviderConfig).apiKey) {
          settings["apiKey"] = (providerOptions as OpenAIProviderConfig).apiKey;
        }
        if (providerOptions && (providerOptions as OpenAIProviderConfig).baseUrl) {
          settings["baseUrl"] = (providerOptions as OpenAIProviderConfig).baseUrl;
        }
        return openai(modelId as string, settings);
      }
      case "anthropic": {
        const settings: Record<string, unknown> = { ...options };
        if (providerOptions && (providerOptions as AnthropicProviderConfig).apiKey) {
          settings["apiKey"] = (providerOptions as AnthropicProviderConfig).apiKey;
        }
        if (providerOptions && (providerOptions as AnthropicProviderConfig).baseUrl) {
          settings["baseUrl"] = (providerOptions as AnthropicProviderConfig).baseUrl;
        }
        return anthropic(modelId as string, settings);
      }
      case "ollama": {
        const { modelName } = (providerOptions as OllamaProviderConfig) || getProviderConfig("ollama", providerOptions);
        return ollama(modelName || modelId);
      }
      case "openai-compatible": {
        const settings: Record<string, unknown> = { ...options };
        const provider = createOpenAICompatible({
          name: "openai-compatible",
          apiKey: typeof providerOptions?.apiKey === "string" ? providerOptions.apiKey : "",
          baseURL: typeof providerOptions?.baseUrl === "string" ? providerOptions.baseUrl : "",
        });
        return provider(modelId as string, settings);
      }
      default:
        throw new Error(`Unsupported model provider: ${provider}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to create model: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

}/**
 * Creates a Google AI model instance with default settings
 *
 * @param modelId - Model ID to use
 * @param apiKey - Optional Google API key (otherwise uses environment variable)
 * @param options - Additional model options
 * @returns A Google AI model instance
 */
export function createGoogleModel(
  modelId: string,
  apiKey?: string,
  options?: Record<string, unknown>
): ReturnType<typeof google> {
  return createModelFromConfig(
    {
      provider: "google",
      modelId,
      ...options,
    },
    { googleApiKey: apiKey }
  ) as ReturnType<typeof google>;
}

/**
 * Creates a Google Vertex AI model instance with default settings
 *
 * @param modelId - Model ID to use
 * @param projectId - Optional Vertex project ID (otherwise uses GOOGLE_VERTEX_PROJECT env var)
 * @param location - Optional Vertex location (otherwise uses GOOGLE_VERTEX_LOCATION env var or default)
 * @param options - Additional model options
 * @returns A Google Vertex AI model instance
 */
export function createVertexModel(
  modelId: string,
  projectId?: string,
  location?: string,
  options?: Record<string, unknown>
): ReturnType<typeof vertex> {
  return createModelFromConfig(
    {
      provider: "vertex",
      modelId,
      ...options,
    },
    {
      vertexProjectId: projectId,
      vertexLocation: location
    }
  ) as ReturnType<typeof vertex>;
}

/**
 * Creates an OpenAI model instance with default settings
 *
 * @param modelId - Model ID to use
 * @param config - OpenAI provider config (apiKey, baseUrl)
 * @param options - Additional model options
 * @returns An OpenAI model instance
 */
export function createOpenAIModel(
  modelId: string,
  config?: OpenAIProviderConfig,
  options?: Record<string, unknown>
): ReturnType<typeof openai> {
  // Merge config and options for settings
  const settings = { ...options };
  if (config?.apiKey) settings["apiKey"] = config.apiKey;
  if (config?.baseUrl) settings["baseUrl"] = config.baseUrl;
  return openai(modelId as string, settings);
}
/**
 * Creates an Anthropic model instance with default settings
 *
 * @param modelId - Model ID to use
 * @param config - Anthropic provider config (apiKey, baseUrl)
 * @param options - Additional model options
 * @returns An Anthropic model instance
 */
export function createAnthropicModel(
  modelId: string,
  config?: AnthropicProviderConfig,
  options?: Record<string, unknown>
): ReturnType<typeof anthropic> {
  // Merge config and options for settings
  const settings = { ...options };
  if (config?.apiKey) settings["apiKey"] = config.apiKey;
  if (config?.baseUrl) settings["baseUrl"] = config.baseUrl;
  return anthropic(modelId, settings);
}
/**
 * Creates an Ollama model instance with default settings
 *
 * @param modelId - Model ID to use (or modelName)
 * @param config - Ollama provider config (baseUrl, modelName)
 * @returns An Ollama model instance
 */
export function createOllamaModel(
  modelId: string,
  config?: OllamaProviderConfig
): ReturnType<typeof ollama> {
  // Only pass modelName; baseUrl is set via env var
  return ollama((config?.modelName || modelId));
}

/**
 * Creates an OpenAI-Compatible model instance with default settings
 *
 * @param modelId - Model ID to use
 * @param config - OpenAI-Compatible provider config (apiKey, baseUrl)
 * @param options - Additional model options
 * @returns An OpenAI-Compatible model instance
 */
export function createOpenAICompatibleModel(
  modelId: string,
  config?: OpenAICompatibleProviderConfig,
  options?: Record<string, unknown>
): ReturnType<typeof createOpenAICompatible> {
  const provider = createOpenAICompatible({
    name: "openai-compatible",
    apiKey: config?.apiKey ?? "",
    baseURL: config?.baseUrl ?? "",
    languageModel: modelId,
    chatModel: modelId,
    completionModel: modelId,
    textEmbeddingModel: modelId,
    imageModel: modelId
  });
  return provider(modelId, options);
}

/**
 * Creates a model instance based on the model configuration
 * This is an alias for createModelFromConfig with a more concise name
 *
 * @param config - Model configuration
 * @param options - Optional creation options
 * @returns A model instance for the specified provider
 */export function createModelInstance(
  config: ModelConfig,
  options: ModelCreationOptions = {}
): ReturnType<typeof createModelFromConfig> {
  return createModelFromConfig(config, options);
}

/**
 * Resolves the LLM instance for an agent based on its configuration.
 * Replaces direct access to the deprecated `llm` property.
 */
export async function getLLM(config: ModelConfig, options?: ModelCreationOptions): Promise<ReturnType<typeof createModelFromConfig>> {
  return createModelFromConfig(config, options);
}