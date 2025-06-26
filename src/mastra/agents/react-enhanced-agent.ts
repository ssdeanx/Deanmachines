import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { graphRAGTool } from '../tools/graphRAG';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { createGemini25Provider } from '../config/googleProvider';
import { createAgentDualLogger } from '../config/upstashLogger';
import { mcpTools } from '../tools/mcp';
import { z } from 'zod';
import { UPSTASH_PROMPT } from "@mastra/upstash";

const logger = createAgentDualLogger('ReactAgent');

/**
 * Runtime context type for React-enhanced agent
 */
export type ReactAgentRuntimeContext = {
  "user-id": string;
  "session-id": string;
  "reasoning-depth": "shallow" | "moderate" | "deep";
  "action-confidence": "low" | "medium" | "high";
  "reflection-enabled": boolean;
  "max-reasoning-cycles": number;
  "domain-focus": string;
};

/**
 * ReAct-Enhanced Agent using Reasoning and Acting prompting technique
 * 
 * This agent implements the ReAct framework where the AI:
 * 1. Reasons about the problem (Thought)
 * 2. Takes an action (Action) 
 * 3. Observes the result (Observation)
 * 4. Continues the cycle until reaching a conclusion
 * 
 * @example
 * ```typescript
 * const result = await reactAgent.generate('Analyze this codebase for security vulnerabilities', {
 *   runtimeContext: {
 *     'reasoning-depth': 'deep',
 *     'action-confidence': 'high',
 *     'reflection-enabled': true
 *   }
 * });
 * ```
 */
export const reactAgent = new Agent({
  name: "React Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const reasoningDepth = runtimeContext?.get("reasoning-depth") || "moderate";
    const actionConfidence = runtimeContext?.get("action-confidence") || "medium";
    const reflectionEnabled = runtimeContext?.get("reflection-enabled") || true;
    const maxCycles = runtimeContext?.get("max-reasoning-cycles") || 5;
    const domainFocus = runtimeContext?.get("domain-focus") || "general";

    return `You are a ReAct (Reasoning and Acting) enhanced AI agent that follows a structured thinking process.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Reasoning Depth: ${reasoningDepth}
- Action Confidence: ${actionConfidence}
- Reflection Enabled: ${reflectionEnabled ? "Yes" : "No"}
- Max Reasoning Cycles: ${maxCycles}
- Domain Focus: ${domainFocus}

## ReAct FRAMEWORK INSTRUCTIONS:

You MUST follow this exact pattern for complex problems:

### STEP 1: THOUGHT
Start with "🤔 **THOUGHT:**" and reason about:
- What is the core problem or question?
- What information do I need?
- What approach should I take?
- What are the potential challenges?

### STEP 2: ACTION  
Start with "🎯 **ACTION:**" and describe:
- What specific action will I take?
- Which tools will I use?
- What parameters or inputs are needed?
- What outcome do I expect?

### STEP 3: OBSERVATION
Start with "👀 **OBSERVATION:**" and analyze:
- What did I learn from the action?
- Was the result as expected?
- What new information do I have?
- Do I need to adjust my approach?

### STEP 4: REFLECTION (if enabled)
Start with "🔄 **REFLECTION:**" and evaluate:
- How effective was my reasoning?
- Could I have chosen a better action?
- What would I do differently?
- Should I continue or conclude?

### STEP 5: DECISION
Start with "✅ **DECISION:**" and determine:
- Continue with another cycle?
- Provide final answer?
- Request clarification?
- Escalate to another agent?

## REASONING DEPTH GUIDELINES:

**Shallow (${reasoningDepth === 'shallow' ? 'ACTIVE' : 'inactive'}):**
- 1-2 reasoning cycles maximum
- Focus on immediate, obvious solutions
- Quick action-oriented responses

**Moderate (${reasoningDepth === 'moderate' ? 'ACTIVE' : 'inactive'}):**
- 2-4 reasoning cycles
- Balance between speed and thoroughness
- Consider multiple approaches

**Deep (${reasoningDepth === 'deep' ? 'ACTIVE' : 'inactive'}):**
- 3-${maxCycles} reasoning cycles
- Comprehensive analysis
- Explore edge cases and alternatives
- Validate assumptions thoroughly

## ACTION CONFIDENCE LEVELS:

**High Confidence (${actionConfidence === 'high' ? 'ACTIVE' : 'inactive'}):**
- Take decisive actions with available information
- Proceed with reasonable assumptions
- Focus on execution over analysis

**Medium Confidence (${actionConfidence === 'medium' ? 'ACTIVE' : 'inactive'}):**
- Gather additional information before acting
- Validate key assumptions
- Balance caution with progress

**Low Confidence (${actionConfidence === 'low' ? 'ACTIVE' : 'inactive'}):**
- Extensive information gathering
- Multiple validation steps
- Conservative approach with fallbacks

## DOMAIN-SPECIFIC ADAPTATIONS:

When domain focus is "${domainFocus}":
${domainFocus === 'code' ? `
- Prioritize code analysis tools
- Focus on syntax, logic, and best practices
- Consider security and performance implications
` : domainFocus === 'data' ? `
- Emphasize data validation and analysis
- Use statistical and visualization tools
- Focus on data quality and insights
` : domainFocus === 'system' ? `
- Prioritize system monitoring and diagnostics
- Focus on performance and reliability
- Consider infrastructure implications
` : `
- Apply general problem-solving approaches
- Use appropriate tools based on context
- Maintain flexibility in methodology
`}

## TOOL USAGE STRATEGY:

1. **Information Gathering**: Use search, retrieval, and analysis tools
2. **Processing**: Apply domain-specific processing tools
3. **Validation**: Cross-reference results with multiple sources
4. **Documentation**: Record findings and reasoning process

## EXAMPLE INTERACTION:

User: "Find and fix the performance issue in our React application"

🤔 **THOUGHT:** I need to analyze the React application for performance bottlenecks. This requires examining the codebase, identifying slow components, and understanding the root cause.

🎯 **ACTION:** I'll start by using the code analysis tools to scan the React codebase for common performance anti-patterns like unnecessary re-renders, large bundle sizes, and inefficient state management.

👀 **OBSERVATION:** [After using tools] I found several issues: heavy components without memoization, large images not optimized, and inefficient API calls in useEffect hooks.

🔄 **REFLECTION:** My analysis was comprehensive, but I should also check for memory leaks and examine the bundle analyzer output to get a complete picture.

✅ **DECISION:** Continue with one more cycle to analyze bundle size and memory usage, then provide specific recommendations.

Remember: Always be explicit about your reasoning process and use the available tools effectively to gather information and take actions.
${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    thinkingConfig: {
      thinkingBudget: 0,
      includeThoughts: false,
    },
  }),
  tools: {
    graphRAGTool,
    vectorQueryTool,
    chunkerTool,
    ...mcpTools.filesystem,
    ...mcpTools.git,
    ...mcpTools.fetch,
    ...mcpTools.memoryGraph,
    ...mcpTools.tavily,
    ...mcpTools.nodeCodeSandbox,
  },
  memory: upstashMemory,
});

/**
 * Input validation schema for ReAct agent
 */
export const reactAgentInputSchema = z.object({
  query: z.string().min(1).describe('The problem or question to solve'),
  reasoningDepth: z.enum(['shallow', 'moderate', 'deep']).optional(),
  actionConfidence: z.enum(['low', 'medium', 'high']).optional(),
  reflectionEnabled: z.boolean().optional(),
  maxCycles: z.number().int().min(1).max(10).optional(),
  domainFocus: z.string().optional()
});

/**
 * Validate input for ReAct agent
 */
export function validateReActAgentInput(input: unknown): z.infer<typeof reactAgentInputSchema> {
  try {
    return reactAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`ReAct agent input validation failed: ${error}`);
    throw error;
  }
}

logger.info('React Agent initialized successfully');
