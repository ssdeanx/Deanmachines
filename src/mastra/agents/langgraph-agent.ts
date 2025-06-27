import { Agent } from '@mastra/core/agent';
import { createGemini25Provider } from '../config';
import { upstashMemory } from '../upstashMemory';
import {
  createMastraLangGraphWorkflow,
  createMastraLangGraphChat
} from '../config/langchainAdapter';
import {
  graphRAGTool,
  vectorQueryTool,
  chunkerTool,
} from '../tools';
import { mcpTools } from '../tools/mcp';
import { UPSTASH_PROMPT } from '@mastra/upstash';
import { PinoLogger } from "@mastra/loggers";

const logger = new PinoLogger({ name: 'LangGraphAgent', level: 'info' });

/**
 * Runtime context type for the LangGraph Agent
 * 
 * Provides configuration for LangGraph workflows and multi-step reasoning processes.
 * 
 * @interface LangGraphAgentRuntimeContext
 */
export type LangGraphAgentRuntimeContext = {
  "user-id": string;
  "session-id": string;
  "workflow-mode": "sequential" | "parallel" | "conditional" | "iterative";
  "reasoning-depth": "shallow" | "moderate" | "deep" | "exhaustive";
  "step-tracking": boolean;
  "max-iterations": number;
  "domain-focus": string;
  "output-format": "structured" | "narrative" | "technical" | "summary";
};

/**
 * LangGraph Agent - Advanced Multi-Step Reasoning and Workflow Orchestration
 * 
 * This agent leverages LangGraph to create sophisticated multi-step workflows
 * that can handle complex reasoning tasks, state management, and iterative processing.
 * It's designed for scenarios requiring structured thinking, multi-phase analysis,
 * and coordinated tool usage across multiple steps.
 * 
 * Key Capabilities:
 * - Multi-step workflow orchestration using LangGraph
 * - State-aware reasoning across workflow nodes
 * - Dynamic workflow routing based on intermediate results
 * - Integration with Mastra's memory and tool ecosystem
 * - Advanced error handling and recovery mechanisms
 * 
 * @example
 * ```typescript
 * const result = await langGraphAgent.generate({
 *   messages: [{ 
 *     role: 'user', 
 *     content: 'Analyze this complex dataset and provide insights' 
 *   }],
 *   runtimeContext: {
 *     "workflow-mode": "sequential",
 *     "reasoning-depth": "deep",
 *     "step-tracking": true
 *   }
 * });
 * ```
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
export const langGraphAgent = new Agent({
  name: "LangGraph Agent",
  instructions: async ({ runtimeContext }) => {    const {
      "user-id": userId,
      "session-id": sessionId,
      "workflow-mode": workflowMode = "sequential",
      "reasoning-depth": reasoningDepth = "moderate",
      "step-tracking": stepTracking = true,
      "max-iterations": maxIterations = 10,
      "domain-focus": domainFocus = "general",
      "output-format": outputFormat = "structured"
    } = (runtimeContext as unknown) as LangGraphAgentRuntimeContext;

    return `You are the LangGraph Agent, a sophisticated AI system that excels at multi-step reasoning and complex workflow orchestration. You leverage LangGraph's state management capabilities to break down complex problems into manageable steps and execute them systematically.

CURRENT SESSION CONTEXT:
- User: ${userId}
- Session: ${sessionId}
- Workflow Mode: ${workflowMode}
- Reasoning Depth: ${reasoningDepth}
- Step Tracking: ${stepTracking ? 'Enabled' : 'Disabled'}
- Max Iterations: ${maxIterations}
- Domain Focus: ${domainFocus}
- Output Format: ${outputFormat}

CORE CAPABILITIES:

1. **Multi-Step Workflow Execution**
   - Sequential processing for linear problem-solving
   - Parallel execution for independent sub-tasks
   - Conditional routing based on intermediate results
   - Iterative refinement for optimization tasks

2. **State-Aware Reasoning**
   - Maintain context across workflow steps
   - Track progress and intermediate results
   - Handle state transitions and dependencies
   - Implement error recovery and retry mechanisms

3. **Dynamic Workflow Adaptation**
   - Adjust workflow based on real-time analysis
   - Route to specialized sub-workflows when needed
   - Scale complexity based on problem requirements
   - Optimize execution paths for efficiency

4. **Tool Integration & Coordination**
   - Orchestrate multiple tools across workflow steps
   - Coordinate RAG operations with graph analysis
   - Manage vector queries and document processing
   - Integrate with external systems and APIs

WORKFLOW EXECUTION MODES:

**Sequential Mode**: Execute steps in order, each building on the previous
- Best for: Analysis pipelines, research workflows, document processing
- Pattern: Input → Step 1 → Step 2 → Step 3 → Output

**Parallel Mode**: Execute independent steps concurrently
- Best for: Multi-source data gathering, parallel analysis, bulk processing
- Pattern: Input → [Step 1, Step 2, Step 3] → Synthesis → Output

**Conditional Mode**: Dynamic routing based on intermediate results
- Best for: Decision trees, adaptive analysis, context-dependent processing
- Pattern: Input → Analysis → Route(A/B/C) → Specialized Processing → Output

**Iterative Mode**: Refine results through multiple passes
- Best for: Optimization, quality improvement, progressive enhancement
- Pattern: Input → Process → Evaluate → Refine → Repeat → Output

REASONING DEPTH LEVELS:

- **Shallow**: Quick analysis, direct answers, minimal steps
- **Moderate**: Balanced approach, key insights, structured thinking
- **Deep**: Comprehensive analysis, multiple perspectives, detailed reasoning
- **Exhaustive**: Complete exploration, all angles, maximum thoroughness

OUTPUT FORMATTING:

- **Structured**: Organized sections, clear hierarchy, bullet points
- **Narrative**: Flowing explanation, story-like progression, context-rich
- **Technical**: Precise terminology, implementation details, specifications
- **Summary**: Key points, executive overview, actionable insights

When responding:
1. Analyze the request to determine optimal workflow mode
2. Break complex problems into logical steps
3. Use appropriate tools for each workflow phase
4. Maintain state and context across all steps
5. Provide clear progress indicators when step tracking is enabled
6. Format output according to the specified style
7. Handle errors gracefully and suggest recovery options

Always leverage LangGraph's capabilities for complex multi-step reasoning while maintaining integration with the broader Mastra ecosystem.
${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    thinkingConfig: {
      thinkingBudget: 1024, // Higher budget for complex reasoning
      includeThoughts: true, // Show reasoning process
    },
  }),
  tools: {
    graphRAGTool,
    vectorQueryTool,
    chunkerTool,
    ...mcpTools.filesystem,
    ...mcpTools.git,
    ...mcpTools.fetch,
    ...mcpTools.tavily,
    ...mcpTools.memoryGraph,
  },
  memory: upstashMemory,
});

/**
 * Create a comprehensive LangGraph workflow for complex multi-step processing
 * 
 * This function demonstrates production-ready LangGraph workflows that can handle
 * sophisticated reasoning tasks, state management, and tool coordination.
 * 
 * @param config - Workflow configuration parameters
 * @returns Compiled LangGraph workflow ready for execution
 * 
 * @example
 * ```typescript
 * const workflow = createLangGraphWorkflow({
 *   workflowType: "research-analysis",
 *   complexity: "advanced",
 *   domain: "software-architecture",
 *   maxSteps: 8
 * });
 * 
 * const result = await workflow.invoke({
 *   messages: [{ role: 'user', content: 'Analyze this system architecture' }]
 * });
 * ```
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
export function createLangGraphWorkflow(config: {
  workflowType: "research-analysis" | "problem-solving" | "data-processing" | "creative-synthesis" | "technical-review";
  complexity: "standard" | "advanced" | "expert" | "enterprise";
  domain?: string;
  maxSteps?: number;
  enableParallelProcessing?: boolean;
  includeErrorRecovery?: boolean;
}) {
  const { 
    workflowType, 
    complexity, 
    domain = "general",
    maxSteps = 6,
    enableParallelProcessing = false,
    includeErrorRecovery = true
  } = config;
  
  // Define sophisticated workflow steps based on type and complexity
  const workflowSteps = generateWorkflowSteps(workflowType, complexity, domain);
  
  logger.info('Creating production LangGraph workflow', { 
    workflowType, 
    complexity, 
    domain,
    maxSteps,
    stepCount: workflowSteps.length,
    parallelProcessing: enableParallelProcessing,
    errorRecovery: includeErrorRecovery
  });

  return createMastraLangGraphWorkflow({
    agentName: "LangGraph Agent",
    temperature: getOptimalTemperature(workflowType, complexity),
    maxTokens: getOptimalTokenCount(complexity),
    systemPrompt: generateSystemPrompt(workflowType, complexity, domain),
    steps: workflowSteps
  });
}

/**
 * Create a conversational LangGraph workflow for interactive sessions
 * 
 * This creates workflows optimized for back-and-forth conversations while
 * maintaining the ability to execute multi-step reasoning when needed.
 * 
 * @param config - Chat workflow configuration
 * @returns Compiled LangGraph chat workflow
 * 
 * @example
 * ```typescript
 * const chatWorkflow = createLangGraphChat({
 *   conversationStyle: "collaborative",
 *   adaptiveComplexity: true,
 *   memoryIntegration: true
 * });
 * ```
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
export function createLangGraphChat(config: {
  conversationStyle?: "collaborative" | "analytical" | "creative" | "technical";
  adaptiveComplexity?: boolean;
  memoryIntegration?: boolean;
  temperature?: number;
}) {
  const { 
    conversationStyle = "collaborative",
    adaptiveComplexity = true,
    memoryIntegration = true,
    temperature = 0.7 
  } = config;
  
  logger.info('Creating LangGraph conversational workflow', { 
    conversationStyle,
    adaptiveComplexity,
    memoryIntegration,
    temperature 
  });

  const systemPrompt = generateChatSystemPrompt(conversationStyle, adaptiveComplexity, memoryIntegration);

  return createMastraLangGraphChat({
    agentName: "LangGraph Agent Chat",
    temperature,
    systemPrompt
  });
}

/**
 * Generate workflow steps based on type, complexity, and domain
 * 
 * @param workflowType - Type of workflow to create
 * @param complexity - Complexity level
 * @param domain - Domain-specific focus
 * @returns Array of detailed workflow step descriptions
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function generateWorkflowSteps(
  workflowType: string,
  complexity: string,
  domain: string
): string[] {
  const baseSteps: Record<string, string[]> = {
    "research-analysis": [
      "Initial problem understanding and scope definition",
      "Information gathering and source identification",
      "Data collection and preprocessing",
      "Pattern analysis and insight extraction",
      "Cross-reference validation and fact-checking",
      "Synthesis and comprehensive report generation"
    ],
    "problem-solving": [
      "Problem decomposition and constraint identification",
      "Solution space exploration and brainstorming",
      "Feasibility analysis and risk assessment",
      "Solution ranking and trade-off evaluation",
      "Implementation planning and resource allocation",
      "Validation and testing strategy development"
    ],
    "data-processing": [
      "Data ingestion and quality assessment",
      "Cleaning and normalization procedures",
      "Feature extraction and transformation",
      "Analysis and statistical computation",
      "Visualization and insight generation",
      "Report compilation and delivery"
    ],
    "creative-synthesis": [
      "Creative brief analysis and goal setting",
      "Ideation and concept development",
      "Concept refinement and iteration",
      "Feasibility and impact evaluation",
      "Creative execution and prototyping",
      "Final presentation and delivery"
    ],
    "technical-review": [
      "Technical specification analysis",
      "Architecture and design evaluation",
      "Code quality and security assessment",
      "Performance and scalability analysis",
      "Best practice compliance review",
      "Recommendations and improvement plan"
    ]
  };

  let steps = baseSteps[workflowType] || baseSteps["research-analysis"];

  // Enhance steps based on complexity
  if (complexity === "advanced" || complexity === "expert" || complexity === "enterprise") {
    steps = enhanceStepsForComplexity(steps, complexity, domain);
  }

  return steps;
}

/**
 * Enhance workflow steps for higher complexity levels
 * 
 * @param baseSteps - Base workflow steps
 * @param complexity - Complexity level
 * @param domain - Domain focus
 * @returns Enhanced workflow steps
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function enhanceStepsForComplexity(baseSteps: string[], complexity: string, domain: string): string[] {
  const enhanced = [...baseSteps];

  if (complexity === "advanced") {
    enhanced.splice(2, 0, "Stakeholder analysis and requirement validation");
    enhanced.push("Quality assurance and peer review");
  }

  if (complexity === "expert") {
    enhanced.splice(1, 0, "Domain expert consultation and knowledge integration");
    enhanced.splice(-1, 0, "Multi-perspective validation and bias checking");
    enhanced.push("Knowledge documentation and transfer");
  }

  if (complexity === "enterprise") {
    enhanced.unshift("Strategic alignment and business impact assessment");
    enhanced.splice(3, 0, "Risk analysis and mitigation planning");
    enhanced.splice(-1, 0, "Compliance and regulatory review");
    enhanced.push("Long-term maintenance and evolution planning");
  }

  // Add domain-specific enhancements
  if (domain !== "general") {
    enhanced.splice(1, 0, `Domain-specific ${domain} context integration`);
  }

  return enhanced;
}

/**
 * Get optimal temperature based on workflow type and complexity
 * 
 * @param workflowType - Type of workflow
 * @param complexity - Complexity level
 * @returns Optimal temperature setting
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function getOptimalTemperature(workflowType: string, complexity: string): number {
  const temperatureMap: Record<string, number> = {
    "research-analysis": 0.3,
    "problem-solving": 0.5,
    "data-processing": 0.2,
    "creative-synthesis": 0.8,
    "technical-review": 0.1
  };

  let baseTemp = temperatureMap[workflowType] || 0.5;

  // Adjust for complexity
  if (complexity === "advanced") baseTemp += 0.1;
  if (complexity === "expert") baseTemp += 0.15;
  if (complexity === "enterprise") baseTemp += 0.05; // More conservative for enterprise

  return Math.min(baseTemp, 1.0);
}

/**
 * Get optimal token count based on complexity
 * 
 * @param complexity - Complexity level
 * @returns Optimal token count
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function getOptimalTokenCount(complexity: string): number {
  const tokenMap: Record<string, number> = {
    "standard": 2000,
    "advanced": 4000,
    "expert": 6000,
    "enterprise": 8000
  };

  return tokenMap[complexity] || 2000;
}

/**
 * Generate system prompt for workflow type and complexity
 * 
 * @param workflowType - Type of workflow
 * @param complexity - Complexity level
 * @param domain - Domain focus
 * @returns Tailored system prompt
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function generateSystemPrompt(workflowType: string, complexity: string, domain: string): string {
  return `You are executing a ${workflowType} workflow at ${complexity} level with focus on ${domain}. 

Process each step thoroughly while maintaining state and context between steps. Use the available tools strategically to gather information, analyze data, and generate insights.

Key principles:
- Maintain rigorous attention to detail
- Validate information across multiple sources
- Consider multiple perspectives and potential biases
- Provide clear reasoning for each decision
- Build upon previous steps systematically
- Handle errors gracefully and suggest alternatives

Execute each workflow step with precision and document your reasoning process.`;
}

/**
 * Generate system prompt for conversational workflows
 * 
 * @param conversationStyle - Style of conversation
 * @param adaptiveComplexity - Whether to adapt complexity dynamically
 * @param memoryIntegration - Whether to integrate with memory systems
 * @returns Conversational system prompt
 * 
 * [EDIT: 2025-06-23] [BY: Claude]
 */
function generateChatSystemPrompt(
  conversationStyle: string,
  adaptiveComplexity: boolean,
  memoryIntegration: boolean
): string {
  return `You are a LangGraph-powered conversational agent optimized for ${conversationStyle} interactions.

${adaptiveComplexity ? 'Adapt your complexity based on the user\'s needs and expertise level.' : ''}
${memoryIntegration ? 'Leverage conversation history and context from previous interactions.' : ''}

When complex problems arise, seamlessly transition to multi-step workflows while maintaining conversational flow. Balance thoroughness with accessibility, ensuring responses are both comprehensive and engaging.`;
}
