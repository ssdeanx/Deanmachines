/**
 * Workflow Registry - Barrel file for all Mastra workflows
 * Generated on June 18, 2025
 * 
 * This file exports all available workflows in the Dean Machines RSC platform,
 * providing a centralized registry for workflow management and orchestration.
 */

// Core workflows
export { weatherWorkflow } from './weather-workflow';
export { researchAnalysisWorkflow } from './research-analysis-workflow';

// Development workflows
export { codeGraphMakerWorkflow } from './code-graph-maker';
export { advancedCodeGraphMakerWorkflow } from './code-graph-maker-advanced';
export { fullStackDevelopmentWorkflow } from './full-stack-development-workflow';

// Import workflows for registry
import { weatherWorkflow } from './weather-workflow';
import { researchAnalysisWorkflow } from './research-analysis-workflow';
import { codeGraphMakerWorkflow } from './code-graph-maker';
import { advancedCodeGraphMakerWorkflow } from './code-graph-maker-advanced';
import { fullStackDevelopmentWorkflow } from './full-stack-development-workflow';

/**
 * Workflow registry object for easy access and management
 * Provides a structured way to access all available workflows
 */
export const workflowRegistry = {
  // Core workflows
  weather: weatherWorkflow,
  researchAnalysis: researchAnalysisWorkflow,

  // Development workflows
  codeGraphMaker: codeGraphMakerWorkflow,
  advancedCodeGraphMaker: advancedCodeGraphMakerWorkflow,
  fullStackDevelopment: fullStackDevelopmentWorkflow,
} as const;

/**
 * Workflow categories for organized access and management
 * Groups workflows by their primary domain expertise
 */
export const workflowCategories = {
  core: ['weather', 'researchAnalysis'] as const,
  development: ['codeGraphMaker', 'advancedCodeGraphMaker', 'fullStackDevelopment'] as const,
  analysis: ['researchAnalysis', 'codeGraphMaker', 'advancedCodeGraphMaker'] as const,
} as const;

/**
 * Get workflow by name with type safety
 * @param workflowName - The name of the workflow to retrieve
 * @returns The requested workflow instance
 */
export function getWorkflow(workflowName: keyof typeof workflowRegistry) {
  return workflowRegistry[workflowName];
}

/**
 * Get workflows by category
 * @param category - The category of workflows to retrieve
 * @returns Array of workflow instances in the specified category
 */
export function getWorkflowsByCategory(category: keyof typeof workflowCategories) {
  return workflowCategories[category].map(workflowName => workflowRegistry[workflowName]);
}

/**
 * Get all available workflow names
 * @returns Array of all workflow names
 */
export function getAllWorkflowNames(): (keyof typeof workflowRegistry)[] {
  return Object.keys(workflowRegistry) as (keyof typeof workflowRegistry)[];
}

/**
 * Check if a workflow exists
 * @param workflowName - The name of the workflow to check
 * @returns True if the workflow exists, false otherwise
 */
export function hasWorkflow(workflowName: string): workflowName is keyof typeof workflowRegistry {
  return workflowName in workflowRegistry;
}

/**
 * Workflow metadata for management and documentation
 */
export const workflowMetadata = {
  weather: { 
    description: 'Weather information and forecasting workflow', 
    tags: ['weather', 'data', 'api'],
    complexity: 'low',
    duration: '30 seconds'
  },
  researchAnalysis: { 
    description: 'Comprehensive research analysis and visualization workflow', 
    tags: ['research', 'analysis', 'visualization'],
    complexity: 'medium',
    duration: '5-10 minutes'
  },
  codeGraphMaker: { 
    description: 'Basic code graph generation from GitHub repositories', 
    tags: ['code', 'graph', 'github', 'analysis'],
    complexity: 'medium',
    duration: '2-5 minutes'
  },
  advancedCodeGraphMaker: { 
    description: 'Advanced multi-format code graph generation with intelligence', 
    tags: ['code', 'graph', 'github', 'advanced', 'intelligence'],
    complexity: 'high',
    duration: '5-15 minutes'
  },
  fullStackDevelopment: { 
    description: 'Complete full-stack application development from concept to deployment', 
    tags: ['development', 'full-stack', 'deployment', 'comprehensive'],
    complexity: 'very high',
    duration: '20-60 minutes'
  },
} as const;
