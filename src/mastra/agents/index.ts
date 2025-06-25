/**
 * Agent Registry - Barrel file for all Mastra AI agents
 * Generated on June 10, 2025
 * 
 * This file exports all available agents in the Dean Machines RSC platform,
 * providing a centralized registry for agent management and orchestration.
 */

// Core agents
export { masterAgent } from './master-agent';
export { weatherAgent } from './weather-agent';

// Specialized domain agents
export { browserAgent } from './browser-agent';
export { codeAgent } from './code-agent';
export { dataAgent } from './data-agent';
export { debugAgent } from './debug-agent';
export { designAgent } from './design-agent';
export { dockerAgent } from './docker-agent';
export { documentationAgent } from './documentation-agent';
export { gitAgent } from './git-agent';
export { graphAgent } from './graph-agent';
export { managerAgent } from './manager-agent';
export { marketingAgent } from './marketing-agent';
export { processingAgent } from './processing-agent';
export { researchAgent } from './research-agent';
export { specialAgent } from './special-agent';
export { supervisorAgent } from './supervisor-agent';
export { sysadminAgent } from './sysadmin-agent';
export { utilityAgent } from './utility-agent';
export { reactAgent } from './react-enhanced-agent';
export { langGraphAgent } from './langgraph-agent';

// Import agents for registry
import { masterAgent } from './master-agent';
import { weatherAgent } from './weather-agent';
import { browserAgent } from './browser-agent';
import { codeAgent } from './code-agent';
import { dataAgent } from './data-agent';
import { debugAgent } from './debug-agent';
import { designAgent } from './design-agent';
import { dockerAgent } from './docker-agent';
import { documentationAgent } from './documentation-agent';
import { gitAgent } from './git-agent';
import { graphAgent } from './graph-agent';
import { managerAgent } from './manager-agent';
import { marketingAgent } from './marketing-agent';
import { processingAgent } from './processing-agent';
import { researchAgent } from './research-agent';
import { specialAgent } from './special-agent';
import { supervisorAgent } from './supervisor-agent';
import { sysadminAgent } from './sysadmin-agent';
import { utilityAgent } from './utility-agent';
import { analyzerAgent } from './analyzer-agent';
import { strategizerAgent } from './strategizer-agent';
import { evolveAgent } from './evolve-agent';
import { reactAgent } from './react-enhanced-agent';
import { langGraphAgent } from './langgraph-agent';

// Additional exports for workflow usage
export { analyzerAgent } from './analyzer-agent';
export { strategizerAgent } from './strategizer-agent';
export { evolveAgent } from './evolve-agent';


// Runtime Context Types - Export all agent-specific runtime contexts
export type { MasterAgentRuntimeContext } from './master-agent';
export type { WeatherAgentRuntimeContext } from './weather-agent';
export type { CodeAgentRuntimeContext } from './code-agent';
export type { ResearchAgentRuntimeContext } from './research-agent';
export type { GitAgentRuntimeContext } from './git-agent';
export type { DataAgentRuntimeContext } from './data-agent';
export type { DebugAgentRuntimeContext } from './debug-agent';
export type { GraphAgentRuntimeContext } from './graph-agent';
export type { DesignAgentRuntimeContext } from './design-agent';
export type { MarketingAgentRuntimeContext } from './marketing-agent';
export type { ManagerAgentRuntimeContext } from './manager-agent';
export type { BrowserAgentRuntimeContext } from './browser-agent';
export type { DockerAgentRuntimeContext } from './docker-agent';
export type { DocumentationAgentRuntimeContext } from './documentation-agent';
export type { ProcessingAgentRuntimeContext } from './processing-agent';
export type { SpecialAgentRuntimeContext } from './special-agent';
export type { SupervisorAgentRuntimeContext } from './supervisor-agent';
export type { StrategizerAgentRuntimeContext } from './strategizer-agent';
export type { EvolveAgentRuntimeContext } from './evolve-agent';
export type { AnalyzerAgentRuntimeContext } from './analyzer-agent';
export type { SysadminAgentRuntimeContext } from './sysadmin-agent';
export type { UtilityAgentRuntimeContext } from './utility-agent';
export type { ReactAgentRuntimeContext } from './react-enhanced-agent';
export type { LangGraphAgentRuntimeContext } from './langgraph-agent';

/**
 * Agent registry object for easy access and management
 * Provides a structured way to access all available agents
 */
export const agentRegistry = {
  // Core agents
  master: masterAgent,
  strategizer: strategizerAgent,
  analyzer: analyzerAgent,
  evolve: evolveAgent,
  supervisor: supervisorAgent,

  // Domain-specific agents
  browser: browserAgent,
  code: codeAgent,
  data: dataAgent,
  debug: debugAgent,
  design: designAgent,
  docker: dockerAgent,
  documentation: documentationAgent,
  git: gitAgent,
  graph: graphAgent,
  manager: managerAgent,
  marketing: marketingAgent,
  processing: processingAgent,
  research: researchAgent,
  special: specialAgent,
  sysadmin: sysadminAgent,
  utility: utilityAgent,
  weather: weatherAgent,
  react: reactAgent,
  langgraph: langGraphAgent,
} as const;

/**
 * Agent categories for organized access and management
 * Groups agents by their primary domain expertise
 */
export const agentCategories = {
  core: ['master', 'supervisor', 'analyzer', 'strategizer', 'evolve', 'react', 'langgraph'] as const,
  development: ['code', 'git', 'docker', 'debug'] as const,
  data: ['data', 'graph', 'processing', 'research', 'weather'] as const,
  management: ['manager', 'supervisor', 'marketing'] as const,
  operations: ['sysadmin', 'browser', 'utility'] as const,
  creative: ['design', 'documentation'] as const,
  specialized: ['special'] as const,
} as const;

/**
 * Get agent by name with type safety
 * @param agentName - The name of the agent to retrieve
 * @returns The requested agent instance
 */
export function getAgent(agentName: keyof typeof agentRegistry) {
  return agentRegistry[agentName];
}

/**
 * Get agents by category
 * @param category - The category of agents to retrieve
 * @returns Array of agent instances in the specified category
 */
export function getAgentsByCategory(category: keyof typeof agentCategories) {
  return agentCategories[category].map(agentName => agentRegistry[agentName]);
}

/**
 * Get all available agent names
 * @returns Array of all agent names
 */
export function getAllAgentNames(): (keyof typeof agentRegistry)[] {
  return Object.keys(agentRegistry) as (keyof typeof agentRegistry)[];
}

/**
 * Check if an agent exists
 * @param agentName - The name of the agent to check
 * @returns True if the agent exists, false otherwise
 */
export function hasAgent(agentName: string): agentName is keyof typeof agentRegistry {
  return agentName in agentRegistry;
}

/**
 * Agent metadata for management and documentation
 */
export const agentMetadata = {
  master: { description: 'Master assistant for debugging and problem-solving', tags: ['core', 'debug', 'master'] },
  strategizer: { description: 'Strategic planning and goal setting expert', tags: ['core', 'planning', 'strategy'] },
  analyzer: { description: 'Data analysis and insights generation specialist', tags: ['core', 'data', 'analysis'] },
  evolve: { description: 'Agent evolution and improvement specialist', tags: ['core', 'evolution', 'improvement'] },
  supervisor: { description: 'Agent coordination and orchestration specialist', tags: ['supervisor', 'coordination', 'orchestration'] },
  weather: { description: 'Weather information and forecasting assistant', tags: ['weather', 'data', 'api'] },
  browser: { description: 'Web automation and browser interaction specialist', tags: ['web', 'automation', 'scraping'] },
  code: { description: 'Code analysis, generation, and optimization expert', tags: ['development', 'code', 'analysis'] },
  data: { description: 'Data analysis and statistical insights specialist', tags: ['data', 'analytics', 'statistics'] },
  debug: { description: 'Debugging and troubleshooting expert', tags: ['debug', 'troubleshooting', 'analysis'] },
  design: { description: 'UI/UX design and visual aesthetics specialist', tags: ['design', 'ui', 'ux'] },
  docker: { description: 'Containerization and deployment expert', tags: ['docker', 'containers', 'deployment'] },
  documentation: { description: 'Technical writing and documentation specialist', tags: ['documentation', 'writing', 'knowledge'] },
  git: { description: 'Version control and Git workflow expert', tags: ['git', 'version-control', 'workflow'] },
  graph: { description: 'Knowledge graph analysis and reasoning specialist', tags: ['graph', 'knowledge', 'analysis'] },
  manager: { description: 'Project management and coordination expert', tags: ['management', 'coordination', 'planning'] },
  marketing: { description: 'Marketing strategy and content creation specialist', tags: ['marketing', 'content', 'strategy'] },
  processing: { description: 'Data processing and workflow automation expert', tags: ['processing', 'automation', 'workflow'] },
  research: { description: 'Research and information analysis specialist', tags: ['research', 'analysis', 'information'] },
  special: { description: 'Multi-domain expert for unique and complex tasks', tags: ['special', 'multi-domain', 'innovation'] },
  sysadmin: { description: 'System administration and DevOps expert', tags: ['sysadmin', 'devops', 'infrastructure'] },
  utility: { description: 'General-purpose utility and helper functions', tags: ['utility', 'general', 'helper'] },
  react: { description: 'ReAct agent for reasoning and reflection', tags: ['react', 'reasoning', 'reflection'] },
  langgraph: { description: 'LangGraph agent for graph-based reasoning and analysis', tags: ['langgraph', 'graph', 'reasoning'] },
} as const;