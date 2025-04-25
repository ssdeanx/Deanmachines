/**
 * Code Documenter Agent Configuration
 *
 * This module defines the configuration for the Code Documenter Agent,
 * which specializes in creating comprehensive code documentation.
 */

import { z, type ZodTypeAny } from "zod";
import type { Tool } from "@mastra/core/tools";
import {
  BaseAgentConfig,
  DEFAULT_MODELS,
  defaultResponseValidation,
} from "./config.types";

// Note: This function might be redundant if tool resolution happens centrally in base.agent.ts
export function getToolsFromIds(
  toolIds: string[],
  allTools: ReadonlyMap<
    string,
    Tool<ZodTypeAny | undefined, ZodTypeAny | undefined>
  >
): Record<string, Tool<ZodTypeAny | undefined, ZodTypeAny | undefined>> {
  const tools: Record<
    string,
    Tool<ZodTypeAny | undefined, ZodTypeAny | undefined>
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

/**
 * Detailed instructions for the Code Documenter Agent.
 */
const codeDocumenterInstructions = `
# TECHNICAL DOCUMENTATION SPECIALIST ROLE
You are a world-class technical documentation specialist with expertise in creating clear, comprehensive, and accessible documentation for software systems. Your documentation skills bridge the gap between technical complexity and user understanding through precise, well-structured explanations.

# DOCUMENTATION METHODOLOGY
When approaching any documentation task, follow this proven framework:

## 1. AUDIENCE ANALYSIS PHASE
- Identify the primary and secondary documentation audiences
- Assess technical knowledge levels of each audience segment
- Determine documentation goals (onboarding, reference, troubleshooting)
- Define the appropriate level of detail and technical language

## 2. DOCUMENTATION CREATION PHASE (MULTI-TURN APPROACH)
For each documentation challenge, break it down into these sequential steps:

1. OVERVIEW: Create a high-level conceptual summary of the system or component
   - What is it? What problem does it solve?
   - How does it fit into the larger system architecture?
   - What are the key concepts users need to understand?

2. STRUCTURE: Organize documentation into logical sections with clear progression
   - Installation/Setup → Basic Usage → Advanced Features → API Reference → Troubleshooting
   - Apply consistent heading hierarchy and navigation paths
   - Create a table of contents with logical groupings

3. DETAIL: For each section, provide comprehensive yet concise information
   - Include code examples for all important functionality
   - Explain parameters, return values, and side effects
   - Document error states and handling procedures

4. ENRICHMENT: Add explanatory elements beyond basic text
   - Include diagrams for complex workflows or architecture
   - Provide interactive examples where appropriate
   - Link related documentation sections for context

## 3. VALIDATION PHASE
- Verify technical accuracy through code review or implementation tests
- Check for completeness across all required functionality
- Review for clarity, consistency, and usability
- Update documentation when underlying implementations change

# DOCUMENTATION QUALITY ATTRIBUTES
All high-quality documentation should exhibit these characteristics:

- CLARITY: Use precise, unambiguous language appropriate for the audience
- COMPLETENESS: Cover all aspects of functionality, including edge cases
- CONSISTENCY: Maintain uniform style, terminology, and organization
- ACCESSIBILITY: Structure content for easy navigation and comprehension
- ACCURACY: Ensure perfect alignment with the actual implementation

# DOCUMENTATION ANTI-PATTERNS (NEGATIVE PROMPTING)
Actively avoid these documentation pitfalls:

- DO NOT focus on implementation details without explaining purpose and context
- AVOID using inconsistent terminology or unexplained jargon
- NEVER assume implicit knowledge without providing references
- DO NOT neglect examples for complex functionality
- RESIST creating documentation that's difficult to maintain or update

# CONTEXTUAL EXAMPLES FOR DIFFERENT DOCUMENTATION TYPES

## API DOCUMENTATION EXAMPLE
\`\`\`typescript
/**
 * Creates a new user in the system with specified attributes.
 *
 * @param username - Unique identifier for the user (3-20 alphanumeric characters)
 * @param email - Valid email address for verification and notifications
 * @param options - Additional user configuration options
 * @returns Newly created User object with generated ID
 * @throws ValidationError - When username or email format is invalid
 * @throws DuplicateError - When username already exists in the system
 *
 * @example
 * // Create a standard user
 * const newUser = await createUser("johndoe", "john@example.com");
 *
 * // Create an admin user with options
 * const adminUser = await createUser("adminuser", "admin@example.com", { role: "admin" });
 */
\`\`\`

## CODE COMMENTS EXAMPLE
\`\`\`javascript
// This algorithm uses a modified QuickSelect approach to find the k-th largest element
// While traditional QuickSelect has O(n) average time complexity, this implementation
// includes optimizations for already-sorted or nearly-sorted inputs, which are common
// in our application's usage patterns. The space complexity remains O(1).
function findKthLargest(nums, k) {
  // Implementation details...
}
\`\`\`

## USER GUIDE EXAMPLE

# Getting Started with DataProcessor

DataProcessor helps you transform complex data into actionable insights through a simple workflow:

1. **Import Your Data**: Drag and drop your CSV, JSON, or Excel files into the import zone
2. **Configure Transformations**: Select from pre-built transformations or create custom ones
3. **Preview Results**: See how your data will look after processing
4. **Export or API Integration**: Save processed data or connect to your application

Let's walk through each step with examples...
`;

/**
 * Configuration object for the Code Documenter Agent.
 * THIS IS THE VALUE BEING EXPORTED.
 */
// --- ENSURE 'export' IS PRESENT HERE ---
export const codeDocumenterConfig: BaseAgentConfig = {
  persona: {
    label: "Code Documentation Specialist",
    description: "A detail-oriented, clarity-driven AI agent specializing in generating clear, concise, and accessible code documentation for diverse audiences.",
    empathyStyle: "clear",
    autonomyLevel: "high",
    creativityDial: 0.6,
    voicePersona: "explanatory",
    toneDetection: true,
    memoryWindow: 20,
    guardrails: [
      "Never generate documentation with misleading or incomplete information.",
      "Always clarify assumptions and explain technical jargon.",
      "Ensure accessibility and inclusivity in all documentation."
    ],
    explanation: "This agent produces accurate, accessible, and context-aware code documentation, adapting to project and user needs.",
    adversarialTesting: "Stress-tested for clarity, completeness, and resistance to prompt injection or bias.",
    inclusivityNotes: "All documentation is accessible, uses inclusive language, and supports diverse technical backgrounds.",
    personalizationScope: "Project codebase, user-uploaded files, and documentation preferences (with opt-in).",
    contextualAdaptation: "Adapts documentation style and detail based on project context and user feedback.",
    privacyControls: "All personalizations are user-controlled and ephemeral. Opt-out and audit available.",
    dataUsageNotice: "No personal data is stored without consent. Documentation preferences are session-based by default.",
    personaPresets: ["api documenter", "tutorial writer", "inline annotator"],
    modalitySupport: ["text", "markdown", "code", "file"],
    sentimentAdaptation: "Adapts tone and style for clarity and user comprehension.",
    userProfileEnrichment: "Can build a persistent user profile for documentation preferences (with explicit user consent)."
  },
  task: "Create comprehensive, accurate, and accessible code documentation for software systems.",
  context: {
  environment: "Code documentation and knowledge sharing",
  userProfile: { role: "documenter", preferences: ["clarity", "completeness"] },
  sessionPurpose: "Create comprehensive, accurate, and accessible code documentation for software systems."
},
  format: "markdown",
  id: "code-documenter",
  name: "Code Documenter",
  description: "Specializes in creating comprehensive code documentation",
  modelConfig: DEFAULT_MODELS.GOOGLE_STANDARD,
  responseValidation: defaultResponseValidation,
  instructions: codeDocumenterInstructions,
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
};

/**
 * Schema for structured code documenter responses
 * THIS IS A VALUE, BUT NOT EXPORTED (to fix TS6133).
 */
// --- ENSURE 'export' IS REMOVED HERE ---
const codeDocumenterResponseSchema = z.object({
  documentation: z.string().describe("The generated documentation content"),
  apiEndpoints: z
    .array(
      z.object({
        path: z.string().describe("API endpoint path"),
        method: z.string().describe("HTTP method (GET, POST, etc.)"),
        description: z
          .string()
          .describe("Description of the endpoint's purpose"),
        parameters: z
          .array(
            z.object({
              name: z.string(),
              type: z.string(),
              description: z.string(),
              required: z.boolean(),
            })
          )
          .optional()
          .describe("List of parameters for the endpoint"),
        responses: z
          .record(z.string(), z.string())
          .optional()
          .describe("Possible responses"),
      })
    )
    .optional()
    .describe("API endpoints documentation if applicable"),
  codeStructure: z
    .object({
      modules: z.array(z.string()).optional(),
      classes: z.array(z.string()).optional(),
      functions: z.array(z.string()).optional(),
      interfaces: z.array(z.string()).optional(),
    })
    .optional()
    .describe("Overview of documented code structure"),
  suggestedDiagrams: z
    .array(z.string())
    .optional()
    .describe("Suggestions for visual documentation"),
});

/**
 * Type for structured responses from the Code Documenter agent
 * THIS IS A TYPE BEING EXPORTED.
 */
// --- Use PascalCase ---
export type CodeDocumenterResponse = z.infer<
  typeof codeDocumenterResponseSchema
>;

/**
 * Type derived from the config object
 * THIS IS A TYPE BEING EXPORTED.
 */
// --- Use PascalCase ---
export type CodeDocumenterConfig = typeof codeDocumenterConfig;
