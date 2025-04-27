import type { BaseAgentConfig } from "./config.types";
import * as agentic from "./agentic.config";
import * as analyst from "./analyst.config";
import * as architect from "./architect.config";
import * as codeDocumenter from "./codeDocumenter.config";
import * as coder from "./coder.config";
import * as copywriter from "./copywriter.config";
import * as dataManager from "./dataManager.config";
import * as debuggerAgent from "./debugger.config";
import * as marketResearch from "./marketResearch.config";
import * as master from "./master.config";
import * as research from "./research.config";
import * as rlTrainer from "./rlTrainer.config";
import * as seoAgent from "./seoAgent.config";
import * as socialMedia from "./socialMedia.config";
import * as uiUxCoder from "./uiUxCoder.config";
import * as writer from "./writer.config";
import { z, ZodTypeAny, ZodAny } from "zod";

// Central registry for all agent configs
const agentConfigModules = {
  agentic,
  analyst,
  architect,
  codeDocumenter,
  coder,
  copywriter,
  dataManager,
  debuggerAgent,
  marketResearch,
  master,
  research,
  rlTrainer,
  seoAgent,
  socialMedia,
  uiUxCoder,
  writer,
} as const;

type AgentConfigModuleKey = keyof typeof agentConfigModules;

/**
 * Get all agent config names (module keys)
 */
export function listAgentConfigNames(): AgentConfigModuleKey[] {
  return Object.keys(agentConfigModules) as AgentConfigModuleKey[];
}

/**
 * Get a config by name (module key). Throws if not found.
 */
export function getAgentConfig(name: AgentConfigModuleKey): BaseAgentConfig {
  const mod = agentConfigModules[name];
  if (!mod || !mod["agenticAssistantConfig"] && !mod["default"] && !mod["config"]) {
    throw new Error(`Agent config module '${name}' does not export a recognizable config.`);
  }
  // Try common export names
  return (
    mod["agenticAssistantConfig"] ||
    mod["default"] ||
    mod["config"]
  ) as BaseAgentConfig;
}

/**
 * Validate a config with a Zod schema. Returns { success, errors, parsed }
 */
export function validateAgentConfig(
  config: unknown,
  schema: ZodTypeAny
): { success: boolean; errors?: any; parsed?: any } {
  const result = schema.safeParse(config);
  if (result.success) return { success: true, parsed: result.data };
  return { success: false, errors: result.error };
}

/**
 * Validate all agent configs with a schema. Returns summary.
 */
export function validateAllAgentConfigs(schema: ZodTypeAny) {
  const names = listAgentConfigNames();
  return names.map((name) => {
    try {
      const config = getAgentConfig(name);
      const res = validateAgentConfig(config, schema);
      return { name, ...res };
    } catch (e) {
      return { name, success: false, errors: e };
    }
  });
}

/**
 * Summarize all agent configs (for debugging/UI)
 */
export function summarizeAllAgentConfigs() {
  const names = listAgentConfigNames();
  return names.map((name) => {
    try {
      const config = getAgentConfig(name);
      return { name, persona: config.persona?.label, description: config.persona?.description };
    } catch (e) {
      return { name, error: String(e) };
    }
  });
}

/**
 * Tool schema helpers
 */
export function getToolSchemas(config: BaseAgentConfig) {
  if (!config.tools) return [];
  return Object.entries(config.tools).map(([toolName, tool]) => {
    return {
      toolName,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
      inputIsAny: isZodAny(tool.inputSchema),
      outputIsAny: isZodAny(tool.outputSchema),
    };
  });
}

/**
 * Utility: check if a Zod schema is z.any()
 */
export function isZodAny(schema: unknown): boolean {
  return !!schema && typeof schema === "object" && "_def" in schema && (schema as any)._def.typeName === "ZodAny";
}

// All logic is runtime-only. No side effects at module/global scope.
