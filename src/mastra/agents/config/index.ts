/**
 * Agent Configuration Module
 *
 * This module exports all agent configurations and configuration types.
 * Each agent has its own configuration file, and this module serves as
 * the central export point.
 */

// Export core configuration types and utilities
export * from "./config.types";
export * from "./model.utils";
export {
  setupGoogleProvider,
  createGoogleClientConfig,
  setupVertexProvider,
  createVertexClientConfig,
  getProviderConfig
} from "./provider.utils";
export type {
  GoogleOptions,
  GoogleVertexOptions,
  ProviderSetupOptions,
  GoogleProviderConfig,
  VertexProviderConfig,
  ProviderConfig
} from "./provider.utils";

// Base configurations removed as part of refactoring

// Export specific agent configurations without the common utility functions
// This prevents name conflicts from multiple exports of getToolsFromIds
import { analystAgentConfig, analystResponseSchema } from "./analyst.config";
import { architectConfig } from "./architect.config";
import {
  agenticAssistantConfig,
  agenticResponseSchema,
} from "./agentic.config";
import { coderAgentConfig, coderResponseSchema } from "./coder.config";
import {
  codeDocumenterConfig

} from "./codeDocumenter.config";
import {
  copywriterAgentConfig,
  copywriterResponseSchema,
} from "./copywriter.config";
import {
  dataManagerAgentConfig,
  dataManagerResponseSchema,
} from "./dataManager.config";
import { debuggerConfig, debuggerResponseSchema } from "./debugger.config";
import {
  marketResearchAgentConfig,
  marketResearchResponseSchema,
} from "./marketResearch.config";
import { researchAgentConfig, researchResponseSchema } from "./research.config";
import {
  rlTrainerAgentConfig,
  rlTrainerResponseSchema,
} from "./rlTrainer.config";
import { seoAgentConfig, seoResponseSchema } from "./seoAgent.config";
import {
  socialMediaAgentConfig,
  socialMediaResponseSchema,
} from "./socialMedia.config";
import { uiUxCoderConfig, uiUxCoderResponseSchema } from "./uiUxCoder.config";
import { writerAgentConfig, writerResponseSchema } from "./writer.config";
import { masterAgentConfig } from "./master.config";
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
