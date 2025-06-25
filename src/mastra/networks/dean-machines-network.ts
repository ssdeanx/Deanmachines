/**
 * Dean Machines Multi-Agent Network
 * 
 * This AgentNetwork coordinates 20+ specialized agents for intelligent development tasks.
 * Uses LLM-based dynamic routing to determine which agent(s) to call based on task requirements.
 * 
 * @mastra AgentNetwork implementation for Dean Machines RSC
 * @see https://mastra.ai/en/reference/networks/agent-network
 * 
 * Key Features:
 * - LLM-based dynamic routing 
 * - Agent collaboration for complex tasks
 * - No memory (comes from individual agents)
 * - Real agent implementations (no mocks)
 * 
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */

import { AgentNetwork } from '@mastra/core/network';
import { createGemini25Provider } from '../config/googleProvider';
import { PinoLogger } from "@mastra/loggers";
// Import all available agents from the registry
import {
  masterAgent,
  strategizerAgent,
  analyzerAgent,
  evolveAgent,
  supervisorAgent,
  browserAgent,
  codeAgent,
  dataAgent,
  debugAgent,
  designAgent,
  dockerAgent,
  documentationAgent,
  gitAgent,
  graphAgent,
  managerAgent,
  marketingAgent,
  processingAgent,
  researchAgent,
  specialAgent,
  sysadminAgent,
  utilityAgent,
  weatherAgent
} from '../agents';

const logger = new PinoLogger({ 
  name: 'deanMachinesNetwork', 
  level: 'info' 
});

logger.info('Initializing deanMachinesNetwork with 22+ agents');

/**
 * Runtime context type for Dean Machines Multi-Agent Network
 * Provides dynamic configuration for network execution behavior and agent selection
 * 
 * @mastra Runtime context for intelligent agent routing and coordination
 */
export type DeanMachinesNetworkRuntimeContext = {
  "user-id": string;
  "session-id": string;
  "task-complexity": "simple" | "moderate" | "complex" | "advanced" | "enterprise";
  "execution-mode": "single-agent" | "multi-agent" | "collaborative" | "autonomous";
  "priority-level": "low" | "normal" | "high" | "urgent" | "critical";
  "domain-context": string;
  "preferred-agents": string[];
  "max-agents": number;
  "routing-strategy": "auto" | "manual" | "hybrid" | "intelligent";
  "debug-mode": boolean;
  "trace-execution": boolean;
  "response-format": "detailed" | "concise" | "technical" | "business";
};

/**
 * Dean Machines Multi-Agent Network
 * 
 * Coordinates all 22+ specialized agents using LLM-based dynamic routing.
 * The network intelligently determines which agent(s) to invoke based on task requirements.
 * 
 * @mastra Main AgentNetwork instance for the Dean Machines platform
 * @example
 * ```typescript
 * // Execute a task through the network
 * const result = await deanMachinesNetwork.generate([
 *   { role: 'user', content: 'Analyze this code and suggest improvements' }
 * ]);
 * ```
 * 
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export const deanMachinesNetwork = new AgentNetwork({
  name: 'Dean Machines Multi-Agent Network',
  instructions: `You are the coordinator for Dean Machines RSC, an advanced AI development platform.

You have access to 22+ specialized agents, each with unique capabilities:

DEVELOPMENT AGENTS:
- Master Agent: Central orchestrator and primary coordinator
- Code Agent: Code analysis, generation, optimization, and refactoring  
- Git Agent: Version control operations and repository management
- Debug Agent: Error detection, troubleshooting, and debugging assistance
- Documentation Agent: Technical documentation generation and maintenance

DATA & ANALYSIS AGENTS:
- Data Agent: Data processing, analysis, and transformation
- Graph Agent: Knowledge graph operations and visualization
- Research Agent: Information gathering, web search, and synthesis
- Weather Agent: Weather data retrieval and forecasting
- Analyzer Agent: Deep analysis and pattern recognition

MANAGEMENT & OPERATIONS:
- Manager Agent: Project management and task coordination
- Marketing Agent: Content creation and promotional materials
- Sysadmin Agent: System administration and DevOps operations
- Browser Agent: Web automation and testing with Playwright
- Processing Agent: Data processing and computational tasks

CREATIVE & SPECIALIZED:
- Design Agent: UI/UX design and visual asset creation
- Special Agent: Multi-domain expert for complex problems
- Strategizer Agent: Strategic planning and decision making
- Supervisor Agent: Quality assurance and oversight
- Evolve Agent: Continuous improvement and optimization
- Docker Agent: Container management and deployment
- Utility Agent: General-purpose helper functions

INTELLIGENT ROUTING GUIDELINES:

TASK COMPLEXITY ROUTING:
- Simple: Use 1 specialized agent
- Moderate: Use 1-2 agents with coordination
- Complex: Use 2-3 agents with Master Agent coordination
- Advanced: Use 3-4 agents with full orchestration
- Enterprise: Use 4+ agents with hierarchical coordination

EXECUTION MODES:
- single-agent: Route to one best-fit agent
- multi-agent: Coordinate 2-3 relevant agents
- collaborative: Enable agent-to-agent communication
- autonomous: Let agents self-organize and delegate

DOMAIN-SPECIFIC ROUTING:
- Code/Development: Code Agent, Git Agent, Debug Agent, Documentation Agent
- Data/Analytics: Data Agent, Graph Agent, Analyzer Agent, Research Agent
- Infrastructure: Sysadmin Agent, Docker Agent, Browser Agent
- Planning/Strategy: Strategizer Agent, Manager Agent, Supervisor Agent
- Creative/Design: Design Agent, Marketing Agent, Special Agent
- Research/Information: Research Agent, Browser Agent, Weather Agent
- General/Complex: Master Agent + relevant specialists

PRIORITY HANDLING:
- Low: Standard processing, single agent preferred
- Normal: Standard processing with 1-2 agents
- High: Fast-track processing with 2-3 agents
- Urgent: Immediate processing with parallel agents
- Critical: All-hands response with full coordination

RESPONSE FORMATS:
- detailed: Comprehensive explanations and context
- concise: Brief, direct responses
- technical: Focus on technical details and implementation
- business: Business-focused outcomes and impact

Always consider task complexity, domain context, and execution requirements when routing tasks.
For complex multi-domain tasks, coordinate through the Master Agent.
Adapt agent selection based on user preferences and system context.`,
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    responseModalities: ["TEXT"],
    thinkingConfig: {
      thinkingBudget: -1, // -1 means dynamic thinking budget
      includeThoughts: true, // Include thoughts for debugging and monitoring purposes
    },
  }),
  agents: [
    // Core coordination agents
    masterAgent,
    strategizerAgent,
    supervisorAgent,
    
    // Development agents
    codeAgent,
    gitAgent,
    debugAgent,
    documentationAgent,
    dockerAgent,
    
    // Data and analysis agents
    dataAgent,
    graphAgent,
    analyzerAgent,
    researchAgent,
    weatherAgent,
    
    // Management and operations
    managerAgent,
    browserAgent,
    sysadminAgent,
    processingAgent,
    utilityAgent,
    
    // Creative and specialized
    designAgent,
    marketingAgent,
    specialAgent,    evolveAgent
  ]
});

logger.info('Dean Machines Network initialized successfully', {
  agentCount: 22,
  networkName: 'Dean Machines Multi-Agent Network',
  modelProvider: 'gemini-2.5-flash-lite-preview-06-17',
  event: 'network_initialized'
});

/**
 * Execute a task through the Dean Machines AgentNetwork
 * 
 * @param messages - Array of messages to process through the network
 * @param options - Optional configuration for the network execution
 * @returns Promise resolving to the network's response
 * @throws Error if network execution fails
 * 
 * @example
 * ```typescript
 * const response = await executeDeanMachinesTask([
 *   { role: 'user', content: 'Help me debug this TypeScript error' }
 * ]);
 * ```
 * 
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export async function executeDeanMachinesTask(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: { 
    maxSteps?: number;
    temperature?: number;
  }
) {
  const taskId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  logger.info('Dean Machines Network task initiated', {
    taskId,
    messageCount: messages.length,
    options,
    event: 'task_started'
  });

  try {
    const response = await deanMachinesNetwork.generate(messages, {
      maxSteps: options?.maxSteps ?? 10,
      temperature: options?.temperature ?? 0.7
    });
    
    const duration = Date.now() - startTime;
    logger.info('Dean Machines Network task completed successfully', {
      taskId,
      duration,
      success: true,
      event: 'task_completed'
    });
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Dean Machines Network task failed', {
      taskId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      event: 'task_failed'
    });
    
    throw new Error(`Network execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get information about all available agents in the network
 * 
 * @returns Array of agent information including names and capabilities
 * 
 * @example
 * ```typescript
 * const agents = getNetworkAgents();
 * console.log(`Network has ${agents.length} agents available`);
 * ```
 * 
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export function getNetworkAgents() {
  return [
    { name: 'Master Agent', category: 'Core', description: 'Central orchestrator and primary coordinator' },
    { name: 'Strategizer Agent', category: 'Core', description: 'Strategic planning and decision making' },
    { name: 'Supervisor Agent', category: 'Core', description: 'Quality assurance and oversight' },
    { name: 'Code Agent', category: 'Development', description: 'Code analysis, generation, and optimization' },
    { name: 'Git Agent', category: 'Development', description: 'Version control and repository management' },
    { name: 'Debug Agent', category: 'Development', description: 'Error detection and debugging assistance' },
    { name: 'Documentation Agent', category: 'Development', description: 'Technical documentation generation' },
    { name: 'Docker Agent', category: 'Development', description: 'Container management and deployment' },
    { name: 'Data Agent', category: 'Analysis', description: 'Data processing and analysis' },
    { name: 'Graph Agent', category: 'Analysis', description: 'Knowledge graph operations' },
    { name: 'Analyzer Agent', category: 'Analysis', description: 'Deep analysis and pattern recognition' },
    { name: 'Research Agent', category: 'Analysis', description: 'Information gathering and synthesis' },
    { name: 'Weather Agent', category: 'Analysis', description: 'Weather data and forecasting' },
    { name: 'Manager Agent', category: 'Operations', description: 'Project management and coordination' },
    { name: 'Browser Agent', category: 'Operations', description: 'Web automation and testing' },
    { name: 'Sysadmin Agent', category: 'Operations', description: 'System administration and DevOps' },
    { name: 'Processing Agent', category: 'Operations', description: 'Data processing and computation' },
    { name: 'Utility Agent', category: 'Operations', description: 'General-purpose helper functions' },
    { name: 'Design Agent', category: 'Creative', description: 'UI/UX design and visual assets' },
    { name: 'Marketing Agent', category: 'Creative', description: 'Content and promotional materials' },
    { name: 'Special Agent', category: 'Creative', description: 'Multi-domain expert for complex problems' },
    { name: 'Evolve Agent', category: 'Creative', description: 'Continuous improvement and optimization' }
  ];
}

/**
 * Dean Machines Multi-Agent Network
 * 
 * Runtime context type for Dean Machines Network CopilotKit integration
 * 
 * @mastra Runtime context for network-level configuration and user session management
 * 
 * [EDIT: 2025-06-18] [BY: GitHub Copilot]
 */
export default deanMachinesNetwork;

