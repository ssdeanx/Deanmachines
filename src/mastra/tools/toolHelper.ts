import * as aiSdk from "./ai-sdk";
import * as arxiv from "./arxiv";
import * as braveSearch from "./brave-search";
import * as calculator from "./calculator";
import * as contentTools from "./contentTools";
import * as documentTools from "./document-tools";
import * as document from "./document";
import * as e2b from "./e2b";
import * as evals from "./evals";
import * as exasearch from "./exasearch";
import * as genkit from "./genkit";
import * as github from "./github";
import * as googleSearch from "./google-search";
import * as graphRag from "./graphRag";
import * as hyperFunctionCalls from "./hyper-functionCalls";
import * as langsmithHub from "./langsmithHub";
import * as llamaindex from "./llamaindex";
import * as llmchain from "./llmchain";
import * as mastra from "./mastra";
import * as mcptool from "./mcptool";
import * as midjourneyClient from "./midjourney-client";
import * as notionClient from "./notion-client";
import * as notion from "./notion";
import * as notionSchema from "./notionSchema";
import * as paginate from "./paginate";
import * as polygon from "./polygon";
import * as puppeteerScrape from "./puppeteerScrape";
import * as puppeteerTool from "./puppeteerTool";
import * as readwrite from "./readwrite";
import * as readwriteschema from "./readwriteschema";
import * as reddit from "./reddit";
import * as rlFeedback from "./rlFeedback";
import * as rlReward from "./rlReward";
import * as tavily from "./tavily";
import * as tracingTools from "./tracingTools";
import * as vectorquerytool from "./vectorquerytool";
import * as wikibase from "./wikibase";
import * as wikidataClient from "./wikidata-client";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

interface ToolModule {
  inputSchema?: unknown;
  outputSchema?: unknown;
  tags?: string[];
  description?: string;
  run?: (input: unknown) => Promise<unknown> | unknown;
  execute?: (input: unknown) => Promise<unknown> | unknown;
  default?: (input: unknown) => Promise<unknown> | unknown;
  [key: string]: any;
}


import { agenticToolEndpoints } from './agenticToolLoader';
// Central registry for all tools
const toolModules = {
  aiSdk,
  arxiv, // ai-sdk
  braveSearch, // ai-sdk
  calculator, // ai-sdk
  contentTools,
  documentTools,
  document,
  e2b, // ai-sdk
  evals,
  exasearch,// ai-sdk
  genkit, // ai-sdk
  github, // ai-sdk
  googleSearch, // ai-sdk
  graphRag,
  hyperFunctionCalls,
  langsmithHub, // ai-sdk
  llamaindex, // ai-sdk
  llmchain, // ai-sdk
  mastra,
  mcptool,
  midjourneyClient,
  notion,
  notionSchema,
  paginate,
  puppeteerScrape,
  puppeteerTool,
  readwrite,
  readwriteschema,
  reddit,
  rlFeedback,
  rlReward,
  tavily, // now handled by agenticToolEndpoints
  tracingTools,
  vectorquerytool,
  wikibase, // now handled by agenticToolEndpoints
  wikidataClient, // now handled by agenticToolEndpoints
  ...agenticToolEndpoints,
} as const;

type ToolModuleKey = keyof typeof toolModules;

/**
 * List all tool names (module keys)
 */
export function listToolNames(): ToolModuleKey[] {
  return Object.keys(toolModules) as ToolModuleKey[];
}

/**
 * Get a tool module by name. Throws if not found.
 */
export function getTool(name: ToolModuleKey): any {
  const mod = toolModules[name];
  if (!mod) {
    throw new Error(`Tool module '${name}' does not exist.`);
  }
  return mod;
}

/**
 * Validate tool schemas (input/output). Returns { success, errors, parsed }
 */
export function validateToolSchemas(tool: any, input: unknown, output: unknown) {
  const inputSchema = tool.inputSchema;
  const outputSchema = tool.outputSchema;
  const inputResult = inputSchema ? inputSchema.safeParse(input) : { success: true, parsed: input };
  const outputResult = outputSchema ? outputSchema.safeParse(output) : { success: true, parsed: output };
  return { input: inputResult, output: outputResult };
}

/**
 * Summarize all tools (for debugging/UI)
 */
export function summarizeAllTools() {
  const names = listToolNames();
  return names.map((name) => {
    try {
      const tool = getTool(name);
      return { name, hasInputSchema: !!tool.inputSchema, hasOutputSchema: !!tool.outputSchema };
    } catch (e) {
      return { name, error: String(e) };
    }
  });
}

/**
 * Tool schema helpers
 */
export function getToolSchemas(tool: any) {
  return {
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    inputIsAny: isZodAny(tool.inputSchema),
    outputIsAny: isZodAny(tool.outputSchema),
  };
}

/**
 * Utility: check if a Zod schema is z.any()
 */
export function isZodAny(schema: unknown): boolean {
  return !!schema && typeof schema === "object" && "_def" in schema && (schema as any)._def.typeName === "ZodAny";
}

// --- ADVANCED TOOLHELPER FEATURES ---

/**
 * 1. Dynamic Tool Filtering
 */
export function filterTools(predicate: (tool: ToolModule, name: string) => boolean): { name: string; tool: ToolModule }[] {
  return Object.entries(toolModules)
    .filter(([name, tool]) => predicate(tool as ToolModule, name))
    .map(([name, tool]) => ({ name, tool: tool as ToolModule }));
}

/**
 * 2. Tool Metadata Extraction
 */
export function getToolMetadata(name: string): Record<string, any> {
  const tool = (toolModules as unknown as Record<string, ToolModule>)[name];
  if (!tool) throw new Error(`Tool '${name}' not found.`);
  // Extract all own properties except functions
  const meta: Record<string, any> = {};
  for (const key of Object.keys(tool)) {
    if (typeof tool[key] !== "function") meta[key] = tool[key];
  }
  return meta;
}

/**
 * 3. Tool Execution Helper
 * Tries .run, .execute, or .default in that order. Validates input if possible.
 */
export async function runTool(name: string, input: unknown): Promise<unknown> {
  const tool = (toolModules as unknown as Record<string, ToolModule>)[name];
  if (!tool) throw new Error(`Tool '${name}' not found.`);
  const inputSchema = tool.inputSchema;
  if (inputSchema && typeof (inputSchema as any).safeParse === "function") {
    const result = (inputSchema as any).safeParse(input);
    if (!result.success) throw new Error(`Input validation failed: ${result.error}`);
  }
  const fn = tool.run || tool.execute || tool.default;
  if (!fn) throw new Error(`Tool '${name}' does not export a callable function (run/execute/default).`);
  return await fn(input);
}

/**
 * 4. Auto-Discovery of Tools (static check for unregistered .ts files)
 */
export function findUnregisteredTools(): string[] {
  const dir = __dirname;
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".ts") && f !== "toolHelper.ts" && f !== "index.ts");
  const registered = Object.keys(toolModules).map(k => k + ".ts");
  return files.filter(f => !registered.includes(f));
}

/**
 * 5. Tool Category/Tag Support
 */
export function listToolsByTag(tag: string): string[] {
  return Object.entries(toolModules)
    .filter(([name, tool]) => Array.isArray((tool as ToolModule).tags) && (tool as ToolModule).tags!.includes(tag))
    .map(([name]) => name);
}

/**
 * 6. Schema Type Introspection
 */
function getZodTypeName(schema: any): string {
  return schema && typeof schema === "object" && schema._def && schema._def.typeName ? schema._def.typeName : "Unknown";
}
export function summarizeSchemaTypes(): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const toolModule of Object.values(toolModules)) {
    const tool = toolModule as ToolModule;
    [tool.inputSchema, tool.outputSchema].forEach((schema) => {
      const type = getZodTypeName(schema);
      acc[type] = (acc[type] || 0) + 1;
    });
  }
  return acc;
}

/**
 * 7. Batch Validation/Execution
 */
export async function batchValidate(inputs: Record<string, unknown>): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  for (const [name, input] of Object.entries(inputs)) {
    try {
      results[name] = { result: await runTool(name, input), error: null };
    } catch (e: any) {
      results[name] = { result: null, error: e.message || String(e) };
    }
  }
  return results;
}

/**
 * 8. Tool Documentation Generator
 */
export function generateToolDocs(format: "markdown" | "json" = "markdown"): string {
  const docs = Object.entries(toolModules).map(([name, toolModule]) => {
    const tool = toolModule as ToolModule;
    const meta = getToolMetadata(name);
    const inputType = getZodTypeName(tool.inputSchema);
    const outputType = getZodTypeName(tool.outputSchema);
    return format === "markdown"
      ? `### ${name}\n- Description: ${meta.description || ""}\n- Tags: ${meta.tags ? meta.tags.join(", ") : ""}\n- Input Schema: ${inputType}\n- Output Schema: ${outputType}`
      : { name, ...meta, inputSchema: inputType, outputSchema: outputType };
  });
  if (format === "markdown") return docs.join("\n\n");
  return JSON.stringify(docs, null, 2);
}

// All logic is runtime-only. No side effects at module/global scope.
