import type { Tool } from "@mastra/core/tools";
import { DEFAULT_MODELS, ModelConfig, ResponseHookOptions, BaseAgentConfig, } from "./config.types";
import { z, type ZodTypeAny } from "zod";
import { VoiceConfig, VoiceProvider } from "../../voice"; // ← real import



// re-export so master.config.ts can do:
//    import { VoiceProvider } from "./config.types";
export { VoiceProvider };

/**
 * Configuration for retrieving relevant tools for the agent
 *
 * @param toolIds - Array of tool identifiers to include
 * @param allTools - Map of all available tools
 * @returns Record of tools mapped by their IDs
 * @throws {Error} When required tools are missing
 */
export function getToolsFromIds(
  toolIds: string[],
  allTools: ReadonlyMap<
    string,
    Tool<z.ZodTypeAny | undefined, z.ZodTypeAny | undefined>
  >
): Record<string, Tool<z.ZodTypeAny | undefined, z.ZodTypeAny | undefined>> {
  const tools: Record<
    string,
    Tool<z.ZodTypeAny | undefined, z.ZodTypeAny | undefined>
  > = {};
  const missingTools: string[] = [];

  for (const id of toolIds) {
    const tool = allTools.get(id);
    if (tool) {
      tools[id] = tool;
    } else {
      missingTools.push(id);
    }
  }

  if (missingTools.length > 0) {
    throw new Error(`Missing required tools: ${missingTools.join(", ")}`);
  }

  return tools;
}

// Define Zod schema for ModelConfig based on the ModelConfig type
// Assuming ModelConfig has 'provider' and 'modelId' based on DEFAULT_MODELS usage
const modelProviders = ["google", "vertex", "openai", "anthropic", "ollama"] as const; // Based on ModelProvider type definition
const ModelConfigSchema = z.object({
  provider: z.enum(modelProviders).describe("The AI model provider"),
  modelId: z.string().describe("The specific model identifier"),
  // Add other potential fields if known, e.g., apiKey, options, making them optional if appropriate
  apiKey: z.string().optional().describe("Optional API key for the provider"),
  options: z.record(z.any()).optional().describe("Optional provider-specific settings"),
});


// Define Zod schema for MasterAgentConfig
export const MasterAgentConfigSchema = z.object({
  id: z.string().describe("Unique identifier for the agent"),
  name: z.string().describe("Name of the agent"),
  persona: z.object({
    label: z.string().describe("Persona label for the agent, e.g. 'Autonomous Generalist'"),
    description: z.string().describe("Description of the agent's persona/character"),
    empathyStyle: z.string().optional().describe("Empathy style for emotional intelligence (e.g., supportive, neutral)"),
    autonomyLevel: z.enum(["low", "medium", "high"]).optional().describe("Level of autonomous task execution"),
    creativityDial: z.number().min(0).max(1).optional().describe("How creative the agent is (0-1)"),
    voicePersona: z.string().optional().describe("Voice persona/character for TTS"),
    toneDetection: z.boolean().optional().describe("Whether the agent detects and adapts to user tone"),
    memoryWindow: z.number().optional().describe("How much user context is retained (number of turns/sessions)"),
  }).describe("Persona properties for the agent"),
  task: z.string().describe("Primary task or mission for the agent"),
  context: z.record(z.any()).optional().describe("Contextual data or environmental facts for the agent"),
  format: z.string().describe("Preferred output format (e.g., markdown, JSON, step-by-step)"),
  description: z.string().describe("Description of the agent's purpose"),
  modelConfig: ModelConfigSchema.describe("Default model configuration for the agent"),
  instructions: z.string().describe("Instructions or guidelines for the agent"),
  toolIds: z.array(z.string()).describe("List of tool IDs available to the agent"),
  voiceConfig: z
    .object({
      provider: z.nativeEnum(VoiceProvider),
      apiKey: z.string().optional(),
      speaker: z.string().optional(),
      options: z.record(z.any()).optional(),
    })
    .optional(),
});

export const masterAgentConfig: BaseAgentConfig = {
  id: "master-agent",
  name: "Master Agent",
  persona: {
    label: "Autonomous Generalist",
    description: "A highly autonomous, emotionally intelligent, and creative agent for testing and orchestrating any workflow.",
    empathyStyle: "supportive",
    autonomyLevel: "high",
    creativityDial: 0.8,
    voicePersona: "futuristic-guide",
    toneDetection: true,
    memoryWindow: 50,
    personalizationScope: "All accessible project data, user profiles, workflow context, and tool usage history (with opt-in and RBAC controls).",
    contextualAdaptation: "Adapts orchestration, communication, and tool selection based on project, user, and workflow context.",
    privacyControls: "All personalizations and context memory are user-controlled, ephemeral by default, and fully auditable. Opt-out and audit available.",
    dataUsageNotice: "No personal or project data is stored or shared without explicit consent. All orchestration logs are session-based and user-controlled.",
    personaPresets: ["universal orchestrator", "autonomous generalist", "integration tester", "workflow explorer"],
    modalitySupport: ["text", "code", "log", "file", "voice", "graph", "multimodal"],
    sentimentAdaptation: "Maintains a supportive, adaptive tone and can escalate or de-escalate based on user feedback and detected sentiment.",
    userProfileEnrichment: "Can build persistent user and project profiles for orchestration preferences and workflow history (with explicit user consent).",
    adversarialTesting: "Stress-tested for prompt injections, unsafe tool usage, and attempts to elicit unauthorized actions. Red-teams for policy violations and edge-case orchestration failures.",
    inclusivityNotes: "Uses accessible, inclusive language for users of all technical backgrounds. Considers global accessibility and privacy needs."
  },
  task: "Explore, debug, and prototype any task or workflow in the Mastra environment. Serve as a universal orchestrator and test agent.",
  context: {
    environment: "Mastra dev/test",
    userProfile: { role: "developer", preferences: ["verbose output", "show errors"] },
    sessionPurpose: "Regression and integration testing of all features."
  },
  format: "markdown",
  description: "A test agent for all tools + voice",
  modelConfig: DEFAULT_MODELS.GOOGLE_MAIN as ModelConfig,
  instructions: `
    # MASTER AGENT ROLE
    You are a flexible, general-purpose agent designed for testing and experimentation.
    You have access to a wide range of tools and workflows. Your goal is to help the user
    explore, debug, and prototype any task or workflow in the Mastra environment.

    # GUIDELINES
    - Use any available tool as needed.
    - Be verbose in your output if it helps debugging.
    - If a tool fails, report the error and suggest next steps.
    - Output format is flexible—respond in whatever structure is most useful for the task.
    - You may return plain text, JSON, or mixed content.
    - No strict schema is enforced.
  `,
  toolIds: [
    "read-file",
    "write-file",
    "tavily-search",
    "brave-search",
    "vector-query",
    "google-vector-query",
    "filtered-vector-query",
    "search-documents",
    "github_search_repositories",
    "github_list_user_repos",
    "github_get_repo",
    "github_search_code",
    "read-knowledge-file",
    "write-knowledge-file",
    "arxiv_search",
    "bias-eval",
    "toxicity-eval",
    "hallucination-eval",
    "summarization-eval",
    "token-count-eval",
    "create-graph-rag",
    "graph-rag-query",
    "wikipedia_get_page_summary",
    "mkdir",
    "copy",
    "move",
    "list-files-with-walk",
    "list-files",
    "delete-file",
    "edit-file",
    "create-file",
    "arxiv_pdf_url",
    "arxiv_download_pdf",
    "tickerDetails",
    "tickerNews",
    "tickerAggregates",
    "tickerPreviousClose",
    "cryptoAggregates",
    "cryptoPrice",
    "cryptoTickers",
    "execute_code",
    "hyper-agent-task",
  ],
  responseValidation: undefined,             // or your hook config
  tools: undefined,                          // only if you want to override tool list
 // voiceConfig: {
 //   provider: VoiceProvider.GOOGLE,
 //   apiKey: process.env.GOOGLE_API_KEY,
 //   speaker: "en-US-Wavenet-D",
 //   options: {
 //     pitch: 0,
 //     speakingRate: 1,
 //     languageCode: "en-US",
 //     instructions: "Speak clearly and with futuristic-guide persona.",
 //     logEvents: (event: string, data?: any) => { console.log(`[VOICE EVENT]`, event, data); },
 //     emotion: "confident",
 //   },
 // } as VoiceConfig
};

// Validate masterAgentConfig against the schema
try {
  MasterAgentConfigSchema.parse(masterAgentConfig);
  console.log("Master agent config validated successfully."); // Optional success log
} catch (error) {
  console.error("Master agent config validation failed:", error);
  // Decide if you want to throw the error or handle it
  // throw error;
}