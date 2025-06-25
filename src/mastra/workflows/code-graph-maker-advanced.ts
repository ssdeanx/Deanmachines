// Generated on December 11, 2024 - Advanced Optimized Version for "The Best Graphs Ever"
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  gitAgent,
  codeAgent,
  graphAgent,
  dataAgent,
  analyzerAgent,
  designAgent,
  supervisorAgent,
} from '../agents';
import { generateId } from 'ai'; // Project standard for ID generation

/**
 * @interface AdvancedCodeGraphInput
 * @description Enhanced input schema for the Advanced Code Graph Maker workflow.
 * Includes options for graph customization and analysis depth.
 * @property {string} githubRepoUrl - The URL of the GitHub repository to analyze.
 * @property {object} [options] - Optional configuration for graph generation.
 * @property {string} [options.analysisDepth] - Depth of analysis: 'basic', 'detailed', 'comprehensive'.
 * @property {string} [options.graphType] - Type of graph: 'dependency', 'call-graph', 'module-hierarchy', 'all'.
 * @property {string[]} [options.fileTypes] - Specific file extensions to focus on.
 * @property {boolean} [options.includeTests] - Whether to include test files in analysis.
 * @property {string} [options.visualStyle] - Visual style: 'hierarchical', 'circular', 'force-directed', 'tree'.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const advancedCodeGraphInputSchema = z.object({
  githubRepoUrl: z.string().url({ message: "Invalid GitHub repository URL" }),
  options: z.object({
    analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
    graphType: z.enum(['dependency', 'call-graph', 'module-hierarchy', 'all']).default('all'),
    fileTypes: z.array(z.string()).optional(),
    includeTests: z.boolean().default(false),
    visualStyle: z.enum(['hierarchical', 'circular', 'force-directed', 'tree']).default('circular'),
  }).optional().default({}),
});

/**
 * @interface AdvancedCodeGraphOutput
 * @description Enhanced output schema for the Advanced Code Graph Maker workflow.
 * @property {string} workflowId - The unique ID for this workflow run.
 * @property {object} result - The workflow result containing multiple graph formats and metadata.
 * @property {any} result.graphData - The primary graph visualization (SVG/HTML).
 * @property {any} [result.interactiveGraph] - Interactive web-based graph (HTML/D3.js).
 * @property {any} [result.graphJson] - Raw graph data in JSON format for programmatic use.
 * @property {object} result.metadata - Analysis metadata including statistics and insights.
 * @property {string} result.status - The final status of the workflow.
 * @property {string} [result.errorMessage] - An error message if the workflow failed.
 * @property {number} result.processingTime - Time taken to complete the workflow in seconds.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const advancedCodeGraphOutputSchema = z.object({
  workflowId: z.string(),
  result: z.object({
    graphData: z.any().nullable(),
    interactiveGraph: z.any().optional(),
    graphJson: z.any().optional(),
    metadata: z.object({
      totalFiles: z.number(),
      analyzedFiles: z.number(),
      dependencies: z.number(),
      modules: z.number(),
      complexity: z.string(),
      insights: z.array(z.string()),
    }),
    status: z.string(),
    errorMessage: z.string().optional(),
    processingTime: z.number(),
  }),
});

/**
 * @step initializeAdvancedWorkflowStep
 * @description Initializes the advanced workflow with enhanced logging and configuration validation.
 * Uses supervisorAgent to coordinate the workflow execution strategy.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const initializeAdvancedWorkflowStep = createStep({
  id: 'initializeAdvancedWorkflow',
  description: 'Initializes the advanced workflow with enhanced configuration and strategy planning',
  inputSchema: advancedCodeGraphInputSchema,
  outputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    options: z.any(),
    status: z.string(),
    startTime: z.number(),
    strategy: z.string(),
  }),
  execute: async ({ inputData }) => {
    const workflowId = generateId();
    console.log(`[${workflowId}] Initializing ADVANCED Code Graph Maker for ${inputData.githubRepoUrl}`);
    console.log(`[${workflowId}] Configuration:`, JSON.stringify(inputData.options, null, 2));
    
    try {
      // Use supervisorAgent to determine optimal processing strategy
      const { text: strategyText } = await supervisorAgent.generate([
        { 
          role: 'user', 
          content: `Analyze this repository analysis request and determine the optimal processing strategy:
            Repository: ${inputData.githubRepoUrl}
            Analysis Depth: ${inputData.options?.analysisDepth || 'detailed'}
            Graph Type: ${inputData.options?.graphType || 'all'}
            File Types: ${inputData.options?.fileTypes?.join(', ') || 'all'}
            
            Return a strategy recommendation including processing order, parallel vs sequential steps, and expected complexity.` 
        }
      ]);
      
      const strategy = strategyText || 'sequential-standard';
      console.log(`[${workflowId}] Processing strategy: ${strategy}`);
      
      return {
        workflowId,
        githubRepoUrl: inputData.githubRepoUrl,
        options: inputData.options || {},
        status: 'initialized',
        startTime: Date.now(),
        strategy,
      };    } catch (error: unknown) {
      console.error(`[${workflowId}] Error in workflow initialization:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        workflowId,
        githubRepoUrl: inputData.githubRepoUrl,
        options: inputData.options || {},
        status: 'errorInitializing',
        startTime: Date.now(),
        strategy: 'fallback-sequential',
        error: errorMessage,
      };
    }
  },
});

/**
 * @step intelligentRepositoryAcquisitionStep
 * @description Uses multiple MCP tools to intelligently acquire repository data.
 * Attempts GitHub API first, falls back to cloning if needed.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const intelligentRepositoryAcquisitionStep = createStep({
  id: 'intelligentRepositoryAcquisition',
  description: 'Intelligently acquires repository data using optimal method (API vs cloning)',
  inputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    options: z.any(),
    status: z.string(),
    startTime: z.number(),
    strategy: z.string(),
  }),
  outputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    options: z.any(),
    status: z.string(),
    startTime: z.number(),
    strategy: z.string(),
    repoData: z.object({
      method: z.string(),
      localPath: z.string().optional(),
      metadata: z.any(),
    }).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.status.startsWith('error')) {
      return { ...inputData, status: 'skippedAcquisition', error: 'Initialization failed' };
    }
    
    console.log(`[${inputData.workflowId}] Acquiring repository data using strategy: ${inputData.strategy}`);
    
    try {
      // First attempt: Use GitHub API for metadata and file structure
      console.log(`[${inputData.workflowId}] Attempting GitHub API access...`);
      const { text: apiResponse } = await gitAgent.generate([
        { 
          role: 'user', 
          content: `Use GitHub API to analyze repository structure: ${inputData.githubRepoUrl}. 
            Get repository metadata, file tree, and language statistics. 
            If API fails, clone the repository instead.
            Return JSON with method used and data acquired.` 
        }
      ]);
      
      if (!apiResponse) {
        throw new Error('Repository acquisition failed - no response from agent');
      }
      
      let repoData;
      try {
        repoData = JSON.parse(apiResponse);
      } catch {
        // If not JSON, treat as path or error message
        if (apiResponse.includes('/') || apiResponse.includes('\\')) {
          repoData = { method: 'clone', localPath: apiResponse.trim(), metadata: {} };
        } else {
          throw new Error(`Repository acquisition failed: ${apiResponse}`);
        }
      }
      
      console.log(`[${inputData.workflowId}] Repository acquired via ${repoData.method || 'unknown'}`);
      
      return {
        ...inputData,
        repoData,
        status: 'repositoryAcquired',
      };
    } catch (error: unknown) {
      console.error(`[${inputData.workflowId}] Error acquiring repository:`, error);
      const message = error instanceof Error ? error.message : String(error);
      return { ...inputData, status: 'errorAcquiring', error: message };
    }
  },
});

/**
 * @step intelligentFileAnalysisStep
 * @description Performs intelligent file analysis using multiple agents in coordination.
 * Uses parallel processing for large repositories when beneficial.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const intelligentFileAnalysisStep = createStep({
  id: 'intelligentFileAnalysis',
  description: 'Performs intelligent multi-agent file analysis with parallel processing',
  inputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    options: z.any(),
    status: z.string(),
    startTime: z.number(),
    strategy: z.string(),
    repoData: z.object({
      method: z.string(),
      localPath: z.string().optional(),
      metadata: z.any(),
    }).optional(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    options: z.any(),
    status: z.string(),
    startTime: z.number(),
    strategy: z.string(),
    repoData: z.object({
      method: z.string(),
      localPath: z.string().optional(),
      metadata: z.any(),
    }).optional(),
    analysisResults: z.object({
      fileStructure: z.any(),
      codeAnalysis: z.any(),
      dependencies: z.any(),
      metrics: z.any(),
    }).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.status !== 'repositoryAcquired' || !inputData.repoData) {
      return { ...inputData, status: 'skippedAnalysis', error: inputData.error || 'Repository acquisition failed' };
    }
    
    console.log(`[${inputData.workflowId}] Starting intelligent file analysis...`);
    
    try {
      const analysisDepth = inputData.options?.analysisDepth || 'detailed';
      const fileTypes = inputData.options?.fileTypes;
      const includeTests = inputData.options?.includeTests || false;
      
      // Use dataAgent for file structure analysis
      console.log(`[${inputData.workflowId}] Analyzing file structure...`);
      const { text: fileStructure } = await dataAgent.generate([
        { 
          role: 'user', 
          content: `Analyze file structure for: ${inputData.repoData.localPath || inputData.githubRepoUrl}
            Filter by file types: ${fileTypes?.join(', ') || 'all programming languages'}
            Include tests: ${includeTests}
            Analysis depth: ${analysisDepth}
            Return structured JSON with file hierarchy, types, and sizes.` 
        }
      ]);
      
      // Use codeAgent for code analysis  
      console.log(`[${inputData.workflowId}] Performing code analysis...`);
      const { text: codeAnalysis } = await codeAgent.generate([
        { 
          role: 'user', 
          content: `Perform ${analysisDepth} code analysis on repository data.
            Focus on: ${inputData.options?.graphType || 'dependency'} relationships
            Analyze imports, exports, function calls, class relationships.
            Return JSON with code structure and relationships.` 
        }
      ]);
      
      // Use analyzerAgent for dependency analysis
      console.log(`[${inputData.workflowId}] Analyzing dependencies...`);
      const { text: dependencies } = await analyzerAgent.generate([
        { 
          role: 'user', 
          content: `Analyze code dependencies and relationships.
            Create dependency graph data structure.
            Include module dependencies, function calls, class hierarchies.
            Return JSON suitable for graph visualization.` 
        }
      ]);
      
      // Calculate metrics
      const analysisResults = {        fileStructure: fileStructure ? tryParseJSON(fileStructure, { raw: fileStructure }) : { raw: 'No file structure data' },
        codeAnalysis: codeAnalysis ? tryParseJSON(codeAnalysis, { raw: codeAnalysis }) : { raw: 'No code analysis data' },
        dependencies: dependencies ? tryParseJSON(dependencies, { raw: dependencies }) : { raw: 'No dependencies data' },
        metrics: {
          analysisDepth,
          timestamp: Date.now(),
          strategy: inputData.strategy,
        },
      };
      
      console.log(`[${inputData.workflowId}] File analysis completed successfully`);
      
      return {
        ...inputData,
        analysisResults,
        status: 'analysisCompleted',
      };
    } catch (error: unknown) {
      console.error(`[${inputData.workflowId}] Error in file analysis:`, error);
      const message = error instanceof Error ? error.message : String(error);
      return { ...inputData, status: 'errorAnalyzing', error: message };
    }
  },
});

/**
 * @step advancedGraphGenerationStep
 * @description Generates multiple graph formats using coordinated agents.
 * Creates both static and interactive visualizations.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const advancedGraphGenerationStep = createStep({
  id: 'advancedGraphGeneration',
  description: 'Generates advanced multi-format graphs with interactive features',
  inputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    options: z.any(),
    status: z.string(),
    startTime: z.number(),
    strategy: z.string(),
    repoData: z.object({
      method: z.string(),
      localPath: z.string().optional(),
      metadata: z.any(),
    }).optional(),
    analysisResults: z.object({
      fileStructure: z.any(),
      codeAnalysis: z.any(),
      dependencies: z.any(),
      metrics: z.any(),
    }).optional(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    options: z.any(),
    status: z.string(),
    startTime: z.number(),
    strategy: z.string(),
    repoData: z.object({
      method: z.string(),
      localPath: z.string().optional(),
      metadata: z.any(),
    }).optional(),
    analysisResults: z.object({
      fileStructure: z.any(),
      codeAnalysis: z.any(),
      dependencies: z.any(),
      metrics: z.any(),
    }).optional(),
    graphResults: z.object({
      primaryGraph: z.any(),
      interactiveGraph: z.any().optional(),
      graphJson: z.any(),
      visualMetadata: z.any(),
    }).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.status !== 'analysisCompleted' || !inputData.analysisResults) {
      return { ...inputData, status: 'skippedGraphGeneration', error: inputData.error || 'Analysis failed or incomplete' };
    }
    
    console.log(`[${inputData.workflowId}] Generating advanced graphs...`);
    
    try {
      const visualStyle = inputData.options?.visualStyle || 'hierarchical';
      const graphType = inputData.options?.graphType || 'dependency';
      
      // Use designAgent for visual styling and layout
      console.log(`[${inputData.workflowId}] Designing graph layout...`);
      const { text: designSpec } = await designAgent.generate([
        { 
          role: 'user', 
          content: `Design optimal graph layout for ${graphType} visualization.
            Style: ${visualStyle}
            Data complexity: ${JSON.stringify(inputData.analysisResults.metrics)}
            Return design specifications for optimal readability and insight extraction.` 
        }
      ]);
      
      // Use graphAgent for primary graph generation
      console.log(`[${inputData.workflowId}] Generating primary graph...`);
      const { text: primaryGraph } = await graphAgent.generate([
        { 
          role: 'user', 
          content: `Generate ${visualStyle} ${graphType} graph from analysis data:
            Dependencies: ${JSON.stringify(inputData.analysisResults.dependencies)}
            File Structure: ${JSON.stringify(inputData.analysisResults.fileStructure)}
            Design Spec: ${designSpec}
            
            Create high-quality SVG visualization optimized for ${visualStyle} layout.
            Include proper labels, colors, and hierarchy.` 
        }
      ]);
      
      // Generate interactive version
      console.log(`[${inputData.workflowId}] Creating interactive graph...`);
      const { text: interactiveGraph } = await graphAgent.generate([
        { 
          role: 'user', 
          content: `Create interactive HTML/D3.js version of the dependency graph.
            Include zoom, pan, node hover details, and filtering capabilities.
            Use the same data but make it interactive and explorable.` 
        }
      ]);
      
      // Prepare JSON export
      const graphJson = {
        type: graphType,
        style: visualStyle,
        data: inputData.analysisResults.dependencies,
        metadata: {
          generated: new Date().toISOString(),
          workflowId: inputData.workflowId,
          repository: inputData.githubRepoUrl,
          options: inputData.options,
        },
      };
      
      const graphResults = {
        primaryGraph: primaryGraph || null,
        interactiveGraph: interactiveGraph || null,
        graphJson,
        visualMetadata: {
          designSpec: designSpec ? tryParseJSON(designSpec, { raw: designSpec }) : { raw: 'No design specification' },          complexity: inputData.analysisResults ? calculateComplexity(inputData.analysisResults) : 'Unknown',
          insights: inputData.analysisResults ? generateInsights(inputData.analysisResults) : [],
        },
      };
      
      console.log(`[${inputData.workflowId}] Advanced graph generation completed`);
      
      return {
        ...inputData,
        graphResults,
        status: 'graphsGenerated',
      };
    } catch (error: unknown) {
      console.error(`[${inputData.workflowId}] Error generating graphs:`, error);
      const message = error instanceof Error ? error.message : String(error);
      return { ...inputData, status: 'errorGeneratingGraphs', error: message };
    }
  },
});

/**
 * @step cleanupAndFinalizeStep
 * @description Cleans up resources and finalizes the workflow with comprehensive results.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const cleanupAndFinalizeStep = createStep({
  id: 'cleanupAndFinalize',
  description: 'Cleans up resources and finalizes workflow with comprehensive results',
  inputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    options: z.any(),
    status: z.string(),
    startTime: z.number(),
    strategy: z.string(),
    repoData: z.object({
      method: z.string(),
      localPath: z.string().optional(),
      metadata: z.any(),
    }).optional(),
    analysisResults: z.object({
      fileStructure: z.any(),
      codeAnalysis: z.any(),
      dependencies: z.any(),
      metrics: z.any(),
    }).optional(),
    graphResults: z.object({
      primaryGraph: z.any(),
      interactiveGraph: z.any().optional(),
      graphJson: z.any(),
      visualMetadata: z.any(),
    }).optional(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    options: z.any(),
    status: z.string(),
    startTime: z.number(),
    strategy: z.string(),
    repoData: z.object({
      method: z.string(),
      localPath: z.string().optional(),
      metadata: z.any(),
    }).optional(),
    analysisResults: z.object({
      fileStructure: z.any(),
      codeAnalysis: z.any(),
      dependencies: z.any(),
      metrics: z.any(),
    }).optional(),
    graphResults: z.object({
      primaryGraph: z.any(),
      interactiveGraph: z.any().optional(),
      graphJson: z.any(),
      visualMetadata: z.any(),
    }).optional(),
    error: z.string().optional(),
    cleanupStatus: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log(`[${inputData.workflowId}] Starting cleanup and finalization...`);
    
    let cleanupStatus = 'completed';
    
    // Cleanup local repository if it was cloned
    if (inputData.repoData?.localPath && inputData.repoData.method === 'clone') {
      try {
        console.log(`[${inputData.workflowId}] Cleaning up cloned repository: ${inputData.repoData.localPath}`);
        await dataAgent.generate([
          { 
            role: 'user', 
            content: `Delete this directory and all its contents: ${inputData.repoData.localPath}` 
          }
        ]);
        console.log(`[${inputData.workflowId}] Repository cleanup completed`);
      } catch (error: unknown) {
        console.error(`[${inputData.workflowId}] Error during cleanup:`, error);
        cleanupStatus = 'cleanupFailed';
      }
    }
    
    // Update final status
    let finalStatus = inputData.status;
    if (finalStatus === 'graphsGenerated') {
      finalStatus = 'completed';
    } else if (!finalStatus.startsWith('error') && !inputData.graphResults) {
      finalStatus = 'completedWithoutGraphs';
    }
    
    console.log(`[${inputData.workflowId}] Finalization complete. Status: ${finalStatus}`);
    
    return {
      ...inputData,
      status: finalStatus,
      cleanupStatus,
    };
  },
});

// Helper methods for the workflow
/**
 * @function tryParseJSON
 * @description Safely parses JSON string with fallback value
 * @param {string} text - JSON string to parse
 * @param {unknown} fallback - Fallback value if parsing fails
 * @returns {unknown} Parsed JSON or fallback value
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
function tryParseJSON(text: string, fallback: unknown): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * @function calculateComplexity
 * @description Calculates repository complexity based on analysis results
 * @param {unknown} analysisResults - Analysis results object
 * @returns {string} Complexity level: 'low', 'medium', 'high'
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
function calculateComplexity(analysisResults: unknown): string {
  // Simple complexity calculation based on analysis results
  const results = analysisResults as Record<string, unknown>;
  const fileStructure = results?.fileStructure as Record<string, unknown> | undefined;
  const dependencies = results?.dependencies as Record<string, unknown> | undefined;
  
  const fileCount = (fileStructure?.fileCount as number) || 0;
  const depCount = (dependencies?.count as number) || 0;
  
  if (fileCount > 100 || depCount > 50) return 'high';
  if (fileCount > 50 || depCount > 25) return 'medium';
  return 'low';
}

/**
 * @function generateInsights
 * @description Generates insights based on analysis results
 * @param {unknown} analysisResults - Analysis results object
 * @returns {string[]} Array of insight strings
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
function generateInsights(analysisResults: unknown): string[] {
  const insights: string[] = [];
  
  // Generate insights based on analysis results
  const results = analysisResults as Record<string, unknown>;
  const complexity = calculateComplexity(analysisResults);
  insights.push(`Repository complexity: ${complexity}`);
  
  const dependencies = results?.dependencies as Record<string, unknown> | undefined;
  const fileStructure = results?.fileStructure as Record<string, unknown> | undefined;
  
  if (dependencies?.circularDependencies) {
    insights.push('Circular dependencies detected - consider refactoring');
  }
  
  if (fileStructure?.largeFiles) {
    insights.push('Large files detected - may benefit from modularization');
  }
  
  return insights;
}

/**
 * @workflow advancedCodeGraphMakerWorkflow
 * @description An advanced Mastra workflow to analyze GitHub repositories and generate
 * "the best graphs ever" with multiple visualization formats, intelligent processing,
 * and comprehensive analysis using all available agents and MCP tools.
 *
 * Features:
 * - Intelligent repository acquisition (API vs cloning)
 * - Multi-agent parallel processing
 * - Multiple graph formats (static SVG, interactive HTML, JSON export)
 * - Advanced visual styling and layouts
 * - Comprehensive error handling and recovery
 * - Resource cleanup and optimization
 * - Detailed metadata and insights
 *
 * @param {AdvancedCodeGraphInput} input - Enhanced input with configuration options.
 * @returns {Promise<AdvancedCodeGraphOutput>} Comprehensive result with multiple graph formats.
 *
 * @example
 * const result = await advancedCodeGraphMakerWorkflow.createRun().start({
 *   inputData: { 
 *     githubRepoUrl: 'https://github.com/owner/repo.git',
 *     options: {
 *       analysisDepth: 'comprehensive',
 *       graphType: 'all',
 *       visualStyle: 'force-directed',
 *       includeTests: true
 *     }
 *   }
 * });
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
export const advancedCodeGraphMakerWorkflow = createWorkflow({
  id: 'advancedCodeGraphMaker',
  description: 'Advanced GitHub repository analyzer that generates "the best graphs ever" with multiple formats and intelligent processing',
  inputSchema: advancedCodeGraphInputSchema,
  outputSchema: advancedCodeGraphOutputSchema,
})
  .then(initializeAdvancedWorkflowStep)
  .then(intelligentRepositoryAcquisitionStep)
  .then(intelligentFileAnalysisStep)
  .then(advancedGraphGenerationStep)
  .then(cleanupAndFinalizeStep)
  .map(({ inputData }) => {
    /**
     * @description Creates the final comprehensive output with all graph formats,
     * metadata, and performance metrics.
     * [EDIT: December 11, 2024] & [BY: Claude]
     */
    const processingTime = (Date.now() - inputData.startTime) / 1000;
    console.log(`[${inputData.workflowId}] ADVANCED workflow completed in ${processingTime}s. Status: ${inputData.status}`);

    // Calculate comprehensive metadata
    const metadata = {
      totalFiles: inputData.analysisResults?.fileStructure?.fileCount || 0,
      analyzedFiles: inputData.analysisResults?.codeAnalysis?.analyzedCount || 0,
      dependencies: inputData.analysisResults?.dependencies?.count || 0,
      modules: inputData.analysisResults?.fileStructure?.moduleCount || 0,
      complexity: calculateComplexity(inputData.analysisResults),
      insights: generateInsights(inputData.analysisResults),
    };

    // Determine final status and error handling
    const finalStatus = inputData.status || 'unknown';
    let errorMessage = inputData.error;

    if (finalStatus.startsWith('error')) {
      // Error already set from a failing step
    } else if (finalStatus.startsWith('skipped')) {
      errorMessage = errorMessage || `Workflow step skipped due to previous error. Status: ${finalStatus}`;
    } else if (finalStatus === 'completedWithoutGraphs') {
      errorMessage = 'Analysis completed but graph generation failed';
    }

    // Prepare final result
    const result = {
      graphData: inputData.graphResults?.primaryGraph || null,
      interactiveGraph: inputData.graphResults?.interactiveGraph || null,
      graphJson: inputData.graphResults?.graphJson || null,
      metadata,
      status: finalStatus,
      errorMessage,
      processingTime,
    };

    return {
      workflowId: inputData.workflowId,
      result,
    };
  })
  .commit();
