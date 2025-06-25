// vNext Agent Network Workflow - Powered by Mastra
import { NewAgentNetwork } from '@mastra/core/network/vNext';
import { Agent } from '@mastra/core/agent';
import { upstashMemory } from '../upstashMemory';
import { createGemini25Provider } from '../config/googleProvider';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { PinoLogger } from "@mastra/loggers";

// Logger setup
const logger = new PinoLogger({ name: 'vNextWorkflow', level: 'info' });
logger.info('Initializing vNext Agent Network Workflow');

// Agent imports
import { masterAgent } from '../agents/master-agent';
import { supervisorAgent } from '../agents/supervisor-agent';
import { researchAgent } from '../agents/research-agent';
import { analyzerAgent } from '../agents/analyzer-agent';
import { graphAgent } from '../agents/graph-agent';
import { codeAgent } from '../agents/code-agent';
import { gitAgent } from '../agents/git-agent';
import { dockerAgent } from '../agents/docker-agent';
import { specialAgent } from '../agents/special-agent';
import { documentationAgent } from '../agents/documentation-agent';

// Workflow imports
import { researchAnalysisWorkflow } from '../workflows/research-analysis-workflow';
import { fullStackDevelopmentWorkflow } from '../workflows/full-stack-development-workflow';
import { advancedCodeGraphMakerWorkflow } from '../workflows/code-graph-maker-advanced';
import { codeGraphMakerWorkflow } from '../workflows/code-graph-maker';

// Define agents
const synthesisAgent = new Agent({
  name: 'synthesis-agent',
  description: 'Synthesizes researched material into comprehensive reports',
  instructions: 'Write detailed reports in full paragraphs without bullet points',
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    // Response modalities - what types of content the model can generate
    responseModalities: ["TEXT"], // Can also include "IMAGE" for image generation
    // Thinking configuration for enhanced reasoning
    thinkingConfig: {
      thinkingBudget: 1024, // -1 = dynamic budget, 0 = disabled, 1-24576 = fixed budget
      includeThoughts: true, // Include reasoning process in response for debugging
    },
    // Search grounding for real-time information access
    useSearchGrounding: true, // Enable Google Search integration for current events
    // Dynamic retrieval configuration
    dynamicRetrieval: true, // Let model decide when to use search grounding
    // Safety settings level
    safetyLevel: 'OFF', // Options: 'STRICT', 'MODERATE', 'PERMISSIVE', 'OFF'
    // Structured outputs for better tool integration
    structuredOutputs: true,
  }),
});

// Agent collection
const vNextAgents = {
  'master-agent': masterAgent,
  'supervisor-agent': supervisorAgent,
  'research-agent': researchAgent,
  'synthesis-agent': synthesisAgent,
  'analyzer-agent': analyzerAgent,
  'code-agent': codeAgent,
  'graph-agent': graphAgent,
  'git-agent': gitAgent,
  'docker-agent': dockerAgent,
  'special-agent': specialAgent,
  'documentation-agent': documentationAgent
};

// Workflow collection
const vNextWorkflows = {
  'research-workflow': researchAnalysisWorkflow,
  'development-workflow': fullStackDevelopmentWorkflow,
  'code-graph-advanced': advancedCodeGraphMakerWorkflow,
  'code-graph': codeGraphMakerWorkflow
};

// Network configuration (EXACTLY as per documentation)
const vNextNetwork = new NewAgentNetwork({
  id: 'dean-machines-vnext',
  name: 'Dean Machines vNext Network',
  instructions: 'Orchestrate tasks across specialized agents and workflows',
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    // Response modalities - what types of content the model can generate
    responseModalities: ["TEXT"], // Can also include "IMAGE" for image generation
    // Thinking configuration for enhanced reasoning
    thinkingConfig: {
      thinkingBudget: -1, // -1 = dynamic budget, 0 = disabled, 1-24576 = fixed budget
      includeThoughts: true, // Include reasoning process in response for debugging
    },
    // Search grounding for real-time information access
    useSearchGrounding: true, // Enable Google Search integration for current events
    // Dynamic retrieval configuration
    dynamicRetrieval: true, // Let model decide when to use search grounding
    // Safety settings level
    safetyLevel: 'OFF', // Options: 'STRICT', 'MODERATE', 'PERMISSIVE', 'OFF'
    // Structured outputs for better tool integration
    structuredOutputs: true,
  }),
  agents: vNextAgents,
  workflows: vNextWorkflows,
  memory: upstashMemory,
});

// Single task execution (as per documentation)
export async function vNextSingleTask(task: string, options = {}) {
  const runtimeContext = new RuntimeContext();
  return vNextNetwork.generate(task, { 
    runtimeContext,
    ...options
  });
}

// Complex task execution (as per documentation)
export async function vNextComplexTask(task: string, options = {}) {
  const runtimeContext = new RuntimeContext();
  return vNextNetwork.loop(task, {
    runtimeContext,
    ...options
  });
}

/**
 * Main vNext Workflow function that routes to single or complex execution
 */
export async function vNextWorkflow(task: string, options: {
  isComplex?: boolean;
  maxIterations?: number;
  context?: Record<string, unknown>;
} = {}) {
  if (options.isComplex) {
    return vNextComplexTask(task, {
      maxIterations: options.maxIterations,
      context: options.context
    });
  } else {
    return vNextSingleTask(task, {
      context: options.context
    });
  }
}

// Export the network for direct usage if needed
export { vNextNetwork };

logger.info('vNext Agent Network Workflow registered successfully', {
  workflowId: 'dean-machines-vnext',
  agentsCount: Object.keys(vNextAgents).length,
  event: 'vnext_network_registered'
});
