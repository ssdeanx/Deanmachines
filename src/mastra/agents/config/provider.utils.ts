/**
 * Model Provider Utilities
 *
 * This module provides utilities for setting up and configuring AI model providers.
 * It handles provider client setup and credential management, but NOT model instantiation.
 *
 * @module provider.utils
 */

import { google } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { env } from "process";
import { z } from "zod";
import { ollama } from "ollama-ai-provider";

/** Supported model providers */
export type ModelProvider = "google" | "vertex" | "openai" | "anthropic" | "ollama";

/** Options for configuring the Google AI provider setup */
export type GoogleOptions = Partial<Pick<GoogleProviderConfig, 'apiKey'>>;

/** Options for configuring the Google Vertex AI provider setup */
export type GoogleVertexOptions = Partial<Pick<VertexProviderConfig, 'projectId' | 'location'>>;

/** Union type for all provider setup options */
export type ProviderSetupOptions = GoogleOptions | GoogleVertexOptions;

/**
 * Configuration for Google AI provider
 */
export interface GoogleProviderConfig {
  /** API Key for Google AI */
  apiKey: string;
}

/**
 * Configuration for Google Vertex AI provider
 */
export interface VertexProviderConfig {
  /** Project ID for Vertex AI */
  projectId: string;
  /** Location for Vertex AI */
  location: string;
  /** Credentials for Vertex AI */
  credentials: Record<string, unknown>;
}

/**
 * Configuration for OpenAI provider
 */
export type OpenAIProviderConfig = z.infer<typeof OpenAIProviderConfigSchema>;

/**
 * Configuration for Anthropic provider
 */
export type AnthropicProviderConfig = z.infer<typeof AnthropicProviderConfigSchema>;

/**
 * Configuration for Ollama provider
 */
export type OllamaProviderConfig = z.infer<typeof OllamaProviderConfigSchema>;

/**
 * Generic provider configuration type
 */
export type ProviderConfig = GoogleProviderConfig | VertexProviderConfig | OpenAIProviderConfig | AnthropicProviderConfig | OllamaProviderConfig;

// --- Zod Schemas for Provider Configs ---
export const GoogleProviderConfigSchema = z.object({
  apiKey: z.string().min(1, "Google API key is required"),
});

export const VertexProviderConfigSchema = z.object({
  projectId: z.string().min(1, "Vertex project ID is required"),
  location: z.string().min(1, "Vertex location is required"),
  credentials: z.record(z.unknown()),
});

export const OpenAIProviderConfigSchema = z.object({
  apiKey: z.string().min(1, "OpenAI API key is required"),
  baseUrl: z.string().url().optional(),
});

export const AnthropicProviderConfigSchema = z.object({
  apiKey: z.string().min(1, "Anthropic API key is required"),
  baseUrl: z.string().url().optional(),
});

export const OllamaProviderConfigSchema = z.object({
  baseUrl: z.string().url().optional(),
  modelName: z.string().min(1, "Ollama model name is required"),
});

/**
 * Sets up the Google AI provider configuration
 *
 * @param options - Google AI specific options
 * @returns Google AI provider configuration
 * @throws {Error} If API key is not provided and not available in environment
 */
export function setupGoogleProvider(
  options?: GoogleOptions
): GoogleProviderConfig {
  // Use API key from options, environment variable, or throw error
  const apiKey =
    options?.apiKey ||
    env.GOOGLE_GENERATIVE_AI_API_KEY ||
    env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Google API key not provided in options or environment variables (GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_AI_API_KEY)"
    );
  }

  return { apiKey };
}

/**
 * Creates a Google AI client configuration object
 *
 * @param config - Google provider configuration
 * @returns Google AI client configuration for @ai-sdk/google
 */
export function createGoogleClientConfig(
  config: GoogleProviderConfig
): Parameters<typeof google>[1] {
  return {};
}

/**
 * Sets up the Google Vertex AI provider configuration
 *
 * @param options - Vertex AI specific options
 * @returns Vertex AI provider configuration
 * @throws {Error} If required environment variables are not available
 */
export function setupVertexProvider(
  options?: GoogleVertexOptions
): VertexProviderConfig {
  // Get project ID from options or environment
  const projectId = options?.projectId || env.GOOGLE_VERTEX_PROJECT;

  if (!projectId) {
    throw new Error(
      "Vertex AI project ID not found in options or environment variable GOOGLE_VERTEX_PROJECT"
    );
  }

  // Get location from options or environment
  const location = options?.location || env.GOOGLE_VERTEX_LOCATION || "us-central1";

  // If GOOGLE_APPLICATION_CREDENTIALS is set, let the SDK handle credentials
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      projectId,
      location,
      credentials: {}, // Let SDK pick up credentials from file
    };
  }

  // Fallback: Use inline credentials if present (not recommended)
  const credentials: Record<string, unknown> = {};
  if (env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
    credentials.client_email = env.GOOGLE_CLIENT_EMAIL;
    credentials.private_key = env.GOOGLE_PRIVATE_KEY;
  }

  return {
    projectId,
    location,
    credentials,
  };
}

/**
 * Creates a Vertex AI client configuration
 *
 * @param config - Vertex provider configuration
 * @returns Vertex AI client configuration for @ai-sdk/google-vertex
 */
export function createVertexClientConfig(
  config: VertexProviderConfig
): ReturnType<typeof createVertex> {
  return createVertex({
    project: config.projectId,
    location: config.location,
  });
}

/**
 * Sets up the OpenAI provider configuration
 *
 * @param options - OpenAI specific options
 * @returns OpenAI provider configuration
 * @throws {Error} If required environment variables are not available
 */
export function setupOpenAIProvider(
  options?: Partial<OpenAIProviderConfig>
): OpenAIProviderConfig {
  const apiKey = options?.apiKey || env.OPENAI_API_KEY;
  const baseUrl = options?.baseUrl || env.OPENAI_API_BASE;
  const parsed = OpenAIProviderConfigSchema.safeParse({ apiKey, baseUrl });
  if (!parsed.success) throw new Error(parsed.error.message);
  return parsed.data;
}

/**
 * Creates an OpenAI client configuration
 *
 * @param config - OpenAI provider configuration
 * @returns OpenAI client configuration
 */
export function createOpenAIClientConfig(config: OpenAIProviderConfig) {
  // Returns a function to create OpenAI models with injected config
  return (modelId: string, settings?: any) =>
    openai(modelId as any, { ...settings, apiKey: config.apiKey, baseUrl: config.baseUrl });
}

/**
 * Sets up the Anthropic provider configuration
 *
 * @param options - Anthropic specific options
 * @returns Anthropic provider configuration
 * @throws {Error} If required environment variables are not available
 */
export function setupAnthropicProvider(
  options?: Partial<AnthropicProviderConfig>
): AnthropicProviderConfig {
  const apiKey = options?.apiKey || env.ANTHROPIC_API_KEY;
  const baseUrl = options?.baseUrl || env.ANTHROPIC_API_BASE;
  const parsed = AnthropicProviderConfigSchema.safeParse({ apiKey, baseUrl });
  if (!parsed.success) throw new Error(parsed.error.message);
  return parsed.data;
}

/**
 * Creates an Anthropic client configuration
 *
 * @param config - Anthropic provider configuration
 * @returns Anthropic client configuration
 */
export function createAnthropicClientConfig(config: AnthropicProviderConfig) {
  // Returns a function to create Anthropic models with injected config
  return (modelId: string, settings?: any) =>
    anthropic(modelId as any, { ...settings, apiKey: config.apiKey, baseUrl: config.baseUrl });
}

/**
 * Sets up the Ollama provider configuration
 *
 * @param options - Ollama specific options
 * @returns Ollama provider configuration
 * @throws {Error} If required environment variables are not available
 */
export function setupOllamaProvider(
  options?: Partial<OllamaProviderConfig>
): OllamaProviderConfig {
  const baseUrl = options?.baseUrl || process.env.OLLAMA_BASE_URL;
  const modelName = options?.modelName || process.env.OLLAMA_MODEL_NAME;
  const parsed = OllamaProviderConfigSchema.safeParse({ baseUrl, modelName });
  if (!parsed.success) throw new Error(parsed.error.message);
  return parsed.data;
}

/**
 * Creates an Ollama client configuration
 *
 * @param config - Ollama provider configuration
 * @returns Ollama client configuration
 */
export function createOllamaClientConfig(config: OllamaProviderConfig) {
  // Only pass modelName; baseUrl is set via environment variable OLLAMA_BASE_URL
  return ollama(config.modelName);
}

/**
 * Gets the appropriate provider configuration based on provider type
 *
 * @param provider - The model provider to configure
 * @param options - Provider-specific options
 * @returns Provider configuration object
 * @throws {Error} If provider is unsupported
 */
export function getProviderConfig(
  provider: ModelProvider,
  options?: Record<string, unknown>
): ProviderConfig {
  switch (provider) {
    case "google":
      return setupGoogleProvider(options as GoogleOptions);
    case "vertex":
      return setupVertexProvider(options as GoogleVertexOptions);
    case "openai":
      return setupOpenAIProvider(options as Partial<OpenAIProviderConfig>);
    case "anthropic":
      return setupAnthropicProvider(options as Partial<AnthropicProviderConfig>);
    case "ollama":
      return setupOllamaProvider(options as Partial<OllamaProviderConfig>);
    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
}
