
/**
 * Agent Configuration Module
 *
 * This module exports all agent configurations and configuration types.
 * Each agent has its own configuration file, and this module serves as
 * the central export point.
 */

// Export core configuration types and utilities
export * from "./config.types.js";
export * from "./model.utils.js";
export {
  setupGoogleProvider,
  createGoogleClient,
  setupVertexProvider,
  createVertexClientConfig,
  setupOpenAIProvider,
  createOpenAIClientConfig,
  setupAnthropicProvider,
  createAnthropicClientConfig,
  setupOllamaProvider,
  createOllamaClientConfig,
  setupOpenAICompatibleProvider,
  createOpenAICompatibleClientConfig,
  getProviderConfig
} from "./provider.utils.js";export type {
  GoogleOptions,
  GoogleVertexOptions,
  ProviderSetupOptions,
  GoogleProviderConfig,
  VertexProviderConfig,
  OpenAIProviderConfig,
  AnthropicProviderConfig,
  OllamaProviderConfig,
  OpenAICompatibleProviderConfig,
  ProviderConfig
} from "./provider.utils.js";

// Base configurations removed as part of refactoring

// Export specific agent configurations without the common utility functions
// This prevents name conflicts from multiple exports of getToolsFromIds
import { analystAgentConfig, analystResponseSchema} from "./analyst.config.js";
import { architectConfig } from "./architect.config.js";
import {
  agenticAssistantConfig,
  agenticResponseSchema,
} from "./agentic.config.js";
import { coderAgentConfig, coderResponseSchema } from "./coder.config.js";
import {
  codeDocumenterConfig

} from "./codeDocumenter.config.js";
import {
  copywriterAgentConfig,
  copywriterResponseSchema,
} from "./copywriter.config.js";
import {
  dataManagerAgentConfig,
  dataManagerResponseSchema,
} from "./dataManager.config.js";
import { debuggerConfig, debuggerResponseSchema } from "./debugger.config.js";
import {
  marketResearchAgentConfig,
  marketResearchResponseSchema,
} from "./marketResearch.config.js";
import { researchAgentConfig, researchResponseSchema } from "./research.config.js";
import {
  rlTrainerAgentConfig,
  rlTrainerResponseSchema,
} from "./rlTrainer.config.js";
import { seoAgentConfig, seoResponseSchema } from "./seoAgent.config.js";
import {
  socialMediaAgentConfig,
  socialMediaResponseSchema,
} from "./socialMedia.config.js";
import { uiUxCoderConfig, uiUxCoderResponseSchema } from "./uiUxCoder.config.js";
import { writerAgentConfig, writerResponseSchema } from "./writer.config.js";
import { masterAgentConfig } from "./master.config.js";
// Re-export specific configurations
export {
  // Agent configurations
  agenticAssistantConfig,
  agenticResponseSchema,
  analystAgentConfig,
  analystResponseSchema,
  architectConfig,
  coderAgentConfig,
  coderResponseSchema,
  codeDocumenterConfig,
  copywriterAgentConfig,
  copywriterResponseSchema,
  dataManagerAgentConfig,
  dataManagerResponseSchema,
  debuggerConfig,
  debuggerResponseSchema,
  masterAgentConfig,
  marketResearchAgentConfig,
  marketResearchResponseSchema,
  researchAgentConfig,
  researchResponseSchema,
  rlTrainerAgentConfig,
  rlTrainerResponseSchema,
  seoAgentConfig,
  seoResponseSchema,
  socialMediaAgentConfig,
  socialMediaResponseSchema,
  uiUxCoderConfig,
  uiUxCoderResponseSchema,
  writerAgentConfig,
  writerResponseSchema,
};
// All agent configurations are now exported here
