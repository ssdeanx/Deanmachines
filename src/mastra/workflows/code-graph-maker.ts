// Generated on December 11, 2024
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  gitAgent,
  graphAgent,
  dataAgent,
  analyzerAgent,
} from '../agents';
import { generateId } from 'ai'; // Project standard for ID generation
import { PinoLogger } from "@mastra/loggers";

const logger = new PinoLogger({ 
  name: 'codeGraphMakerWorkflow', 
  level: 'info' 
});

/**
 * @interface CodeGraphMakerInput
 * @description Input schema for the Code Graph Maker workflow.
 * @property {string} githubRepoUrl - The URL of the GitHub repository to analyze.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const codeGraphMakerInputSchema = z.object({
  githubRepoUrl: z.string().url({ message: "Invalid GitHub repository URL" }),
});

/**
 * Dependencies analysis structure
 */
const dependencySchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum(['import', 'export', 'function_call', 'class_inheritance', 'interface_implementation']),
  metadata: z.record(z.any()).optional(),
});

const dependenciesDataSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['file', 'function', 'class', 'interface', 'variable']),
    path: z.string().optional(),
  })),
  edges: z.array(dependencySchema),
  metadata: z.object({
    totalFiles: z.number(),
    totalDependencies: z.number(),
    analysisTimestamp: z.string(),
  }),
});

/**
 * Graph output structure
 */
const graphOutputSchema = z.object({
  format: z.enum(['svg', 'json', 'dot', 'png']),
  content: z.string(),
  metadata: z.object({
    nodeCount: z.number(),
    edgeCount: z.number(),
    generationTimestamp: z.string(),
  }),
});

/**
 * @interface CodeGraphMakerOutput
 * @description Output schema for the Code Graph Maker workflow.
 * @property {string} workflowId - The unique ID for this workflow run.
 * @property {GraphOutput | null} graphData - The generated graph data structure. Null if an error occurred.
 * @property {string} status - The final status of the workflow.
 * @property {string} [errorMessage] - An error message if the workflow failed.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const codeGraphMakerOutputSchema = z.object({
  workflowId: z.string(),
  graphData: graphOutputSchema.nullable(),
  status: z.string(),
  errorMessage: z.string().optional(),
});

/**
 * @step initializeWorkflowStep
 * @description Initializes the workflow by generating a unique ID and recording the start time.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const initializeWorkflowStep = createStep({
  id: 'initializeWorkflow',
  description: 'Initializes the workflow by generating a unique ID and recording the start time',
  inputSchema: codeGraphMakerInputSchema,
  outputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    status: z.string(),
    startTime: z.number(),
  }),  execute: async ({ inputData }) => {
    const workflowId = generateId();
    
    logger.info('Code Graph Maker workflow initiated', {
      workflowId,
      githubRepoUrl: inputData.githubRepoUrl,
      event: 'workflow_initialized'
    });
    
    return {
      workflowId,
      githubRepoUrl: inputData.githubRepoUrl,
      status: 'initialized',
      startTime: Date.now(),
    };
  },
});

/**
 * @step cloneRepositoryStep
 * @description Clones the specified GitHub repository to a local temporary directory using the gitAgent.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const cloneRepositoryStep = createStep({
  id: 'cloneRepository',
  description: 'Clones the specified GitHub repository to a local temporary directory',
  inputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    status: z.string(),
    startTime: z.number(),
  }),
  outputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    status: z.string(),
    startTime: z.number(),
    localRepoPath: z.string().optional(),
    error: z.string().optional(),
  }),  execute: async ({ inputData }) => {
    logger.info('Repository cloning step started', {
      workflowId: inputData.workflowId,
      githubRepoUrl: inputData.githubRepoUrl,
      event: 'clone_repository_started'
    });
    
    try {
      const { text } = await gitAgent.generate([
        { 
          role: 'user', 
          content: `Clone this repository: ${inputData.githubRepoUrl}. Return only the local path where it was cloned.` 
        }
      ]);
      
      if (!text) {
        throw new Error('Repository cloning failed or localPath not returned by agent.');
      }
      
      logger.info('Repository cloned successfully', {
        workflowId: inputData.workflowId,
        localRepoPath: text.trim(),
        event: 'clone_repository_completed'
      });
      
      return {
        ...inputData,
        localRepoPath: text.trim(),
        status: 'repositoryCloned',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      
      logger.error('Repository cloning failed', {
        workflowId: inputData.workflowId,
        error: message,
        event: 'clone_repository_failed'
      });
      
      return { ...inputData, status: 'errorCloning', error: message };
    }
  },
});

/**
 * @step listFilesStep
 * @description Lists all files within the cloned repository using the dataAgent.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const listFilesStep = createStep({
  id: 'listFilesAndContent',
  description: 'Lists all files within the cloned repository',
  inputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    status: z.string(),
    startTime: z.number(),
    localRepoPath: z.string().optional(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    status: z.string(),
    startTime: z.number(),
    localRepoPath: z.string().optional(),
    retrievedFilePaths: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),  execute: async ({ inputData }) => {
    if (inputData.status !== 'repositoryCloned' || !inputData.localRepoPath) {
      logger.warn('File listing step skipped', {
        workflowId: inputData.workflowId,
        status: inputData.status,
        hasLocalRepoPath: !!inputData.localRepoPath,
        event: 'file_listing_skipped'
      });
      return { ...inputData, status: 'skippedFileListing', error: inputData.error || 'Cloning failed or path missing.' };
    }
    
    logger.info('File listing step started', {
      workflowId: inputData.workflowId,
      localRepoPath: inputData.localRepoPath,
      event: 'file_listing_started'
    });
    
    try {
      const { text } = await dataAgent.generate([
        { 
          role: 'user', 
          content: `List all files recursively in this directory: ${inputData.localRepoPath}. Return only the file paths, one per line.` 
        }
      ]);
      
      if (!text) {
        throw new Error('Failed to list files or no files returned by agent.');
      }
      
      const filePaths = text.split('\n').filter(path => path.trim().length > 0);
      
      logger.info('File listing completed successfully', {
        workflowId: inputData.workflowId,
        fileCount: filePaths.length,
        event: 'file_listing_completed'
      });
      
      return {
        ...inputData,
        retrievedFilePaths: filePaths,
        status: 'filesListed',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      
      logger.error('File listing failed', {
        workflowId: inputData.workflowId,
        error: message,
        event: 'file_listing_failed'
      });
      
      return { ...inputData, status: 'errorListingFiles', error: message };
    }
  },
});

/**
 * @step analyzeDependenciesStep
 * @description Analyzes code dependencies from the retrieved file paths using the analyzerAgent.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const analyzeDependenciesStep = createStep({
  id: 'analyzeDependencies',
  description: 'Analyzes code dependencies from the retrieved file paths',
  inputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    status: z.string(),
    startTime: z.number(),
    localRepoPath: z.string().optional(),
    retrievedFilePaths: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),  outputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    status: z.string(),
    startTime: z.number(),
    localRepoPath: z.string().optional(),
    retrievedFilePaths: z.array(z.string()).optional(),
    dependencies: dependenciesDataSchema.optional(),
    error: z.string().optional(),
  }),  execute: async ({ inputData }) => {
    if (inputData.status !== 'filesListed' || !inputData.retrievedFilePaths || !inputData.localRepoPath) {
      logger.warn('Dependencies analysis step skipped', {
        workflowId: inputData.workflowId,
        status: inputData.status,
        hasFilePaths: !!inputData.retrievedFilePaths,
        hasLocalRepoPath: !!inputData.localRepoPath,
        event: 'dependencies_analysis_skipped'
      });
      return { ...inputData, status: 'skippedAnalysis', error: inputData.error || 'File listing failed or paths missing.' };
    }
    
    logger.info('Dependencies analysis step started', {
      workflowId: inputData.workflowId,
      fileCount: inputData.retrievedFilePaths.length,
      event: 'dependencies_analysis_started'
    });
    
    try {
      // Analyze a reasonable subset of files to avoid overwhelming the agent
      const filesToAnalyze = inputData.retrievedFilePaths.slice(0, 100);
      
      const { text } = await analyzerAgent.generate([
        { 
          role: 'user', 
          content: `Analyze code dependencies in these files: ${filesToAnalyze.join(', ')}. 
          
          Return a JSON object with the following structure:
          {
            "nodes": [{"id": "file1.js", "name": "file1.js", "type": "file", "path": "/path/to/file1.js"}],
            "edges": [{"source": "file1.js", "target": "file2.js", "type": "import"}],
            "metadata": {"totalFiles": 10, "totalDependencies": 5, "analysisTimestamp": "2024-12-11T10:00:00Z"}
          }
          
          Focus on import/export statements, function calls, and class relationships. Include all relevant files as nodes.` 
        }
      ]);
      
      if (!text) {
        throw new Error('Dependency analysis failed or did not return dependencies from agent.');
      }
      
      let dependencies;
      try {
        const parsed = JSON.parse(text);
        // Validate and structure the dependencies data
        dependencies = {
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
          metadata: {
            totalFiles: parsed.metadata?.totalFiles || filesToAnalyze.length,
            totalDependencies: parsed.metadata?.totalDependencies || (parsed.edges?.length || 0),
            analysisTimestamp: parsed.metadata?.analysisTimestamp || new Date().toISOString(),
          }
        };
      } catch (parseError) {
        // Fallback: create a basic structure if parsing fails
        logger.warn('Failed to parse dependency analysis JSON, creating fallback structure', {
          workflowId: inputData.workflowId,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
          event: 'dependencies_analysis_parse_failed'
        });
        
        dependencies = {
          nodes: filesToAnalyze.map(file => ({
            id: file,
            name: file.split('/').pop() || file,
            type: 'file' as const,
            path: file,
          })),
          edges: [],
          metadata: {
            totalFiles: filesToAnalyze.length,
            totalDependencies: 0,
            analysisTimestamp: new Date().toISOString(),
          }
        };
      }
      
      logger.info('Dependencies analysis completed successfully', {
        workflowId: inputData.workflowId,
        nodeCount: dependencies.nodes.length,
        edgeCount: dependencies.edges.length,
        event: 'dependencies_analysis_completed'
      });
      
      return {
        ...inputData,
        dependencies,
        status: 'dependenciesAnalyzed',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      
      logger.error('Dependencies analysis failed', {
        workflowId: inputData.workflowId,
        error: message,
        event: 'dependencies_analysis_failed'
      });
      
      return { ...inputData, status: 'errorAnalyzing', error: message };
    }
  },
});

/**
 * @step generateGraphStep
 * @description Generates a visual graph from the analyzed dependencies using the graphAgent.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const generateGraphStep = createStep({
  id: 'generateGraph',
  description: 'Generates a visual graph from the analyzed dependencies',  inputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    status: z.string(),
    startTime: z.number(),
    localRepoPath: z.string().optional(),
    retrievedFilePaths: z.array(z.string()).optional(),
    dependencies: dependenciesDataSchema.optional(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    status: z.string(),
    startTime: z.number(),
    localRepoPath: z.string().optional(),
    retrievedFilePaths: z.array(z.string()).optional(),
    dependencies: dependenciesDataSchema.optional(),
    graphOutput: graphOutputSchema.optional(),
    error: z.string().optional(),
  }),  execute: async ({ inputData }) => {
    if (inputData.status !== 'dependenciesAnalyzed' || !inputData.dependencies) {
      logger.warn('Graph generation step skipped', {
        workflowId: inputData.workflowId,
        status: inputData.status,
        hasDependencies: !!inputData.dependencies,
        event: 'graph_generation_skipped'
      });
      return { ...inputData, status: 'skippedGraphGeneration', error: inputData.error || 'Analysis failed or dependencies missing.' };
    }
    
    logger.info('Graph generation step started', {
      workflowId: inputData.workflowId,
      nodeCount: inputData.dependencies.nodes.length,
      edgeCount: inputData.dependencies.edges.length,
      event: 'graph_generation_started'
    });
    
    try {
      const { text } = await graphAgent.generate([
        { 
          role: 'user', 
          content: `Generate a dependency graph from this data: ${JSON.stringify(inputData.dependencies)}. 
          Return a JSON object with format (svg/json/dot/png), content (the actual graph data), and metadata (nodeCount, edgeCount, generationTimestamp).
          Example: {"format": "svg", "content": "<svg>...</svg>", "metadata": {"nodeCount": 10, "edgeCount": 15, "generationTimestamp": "2024-12-11T10:00:00Z"}}` 
        }
      ]);
      
      if (!text) {
        throw new Error('Graph generation failed or did not return graph data from agent.');
      }
      
      let graphOutput;
      try {
        const parsed = JSON.parse(text);
        graphOutput = {
          format: parsed.format || 'json',
          content: parsed.content || text,
          metadata: {
            nodeCount: parsed.metadata?.nodeCount || inputData.dependencies.nodes.length,
            edgeCount: parsed.metadata?.edgeCount || inputData.dependencies.edges.length,
            generationTimestamp: parsed.metadata?.generationTimestamp || new Date().toISOString(),
          }
        };
      } catch {
        // Fallback: treat as raw content
        graphOutput = {
          format: 'svg' as const,
          content: text,
          metadata: {
            nodeCount: inputData.dependencies.nodes.length,
            edgeCount: inputData.dependencies.edges.length,
            generationTimestamp: new Date().toISOString(),
          }
        };
      }
      
      logger.info('Graph generated successfully', {
        workflowId: inputData.workflowId,
        format: graphOutput.format,
        nodeCount: graphOutput.metadata.nodeCount,
        edgeCount: graphOutput.metadata.edgeCount,
        event: 'graph_generation_completed'
      });
      
      return {
        ...inputData,
        graphOutput,
        status: 'graphGenerated',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      
      logger.error('Graph generation failed', {
        workflowId: inputData.workflowId,
        error: message,
        event: 'graph_generation_failed'
      });
      
      return { ...inputData, status: 'errorGeneratingGraph', error: message };
    }
  },
});

/**
 * @step cleanupRepositoryStep
 * @description Cleans up the cloned repository from the local file system using the dataAgent.
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
const cleanupRepositoryStep = createStep({
  id: 'cleanupRepository',
  description: 'Cleans up the cloned repository from the local file system',  inputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    status: z.string(),
    startTime: z.number(),
    localRepoPath: z.string().optional(),
    retrievedFilePaths: z.array(z.string()).optional(),
    dependencies: dependenciesDataSchema.optional(),
    graphOutput: graphOutputSchema.optional(),
    error: z.string().optional(),
  }),
  outputSchema: z.object({
    workflowId: z.string(),
    githubRepoUrl: z.string(),
    status: z.string(),
    startTime: z.number(),
    localRepoPath: z.string().nullable().optional(),
    retrievedFilePaths: z.array(z.string()).optional(),
    dependencies: dependenciesDataSchema.optional(),
    graphOutput: graphOutputSchema.optional(),
    error: z.string().optional(),
    cleanupError: z.string().optional(),
  }),  execute: async ({ inputData }) => {
    if (!inputData.localRepoPath) {
      logger.warn('Repository cleanup step skipped', {
        workflowId: inputData.workflowId,
        reason: 'No local repository path found',
        event: 'cleanup_skipped'
      });
      return { ...inputData, status: inputData.status || 'cleanupSkippedNoPath' };
    }
    
    logger.info('Repository cleanup step started', {
      workflowId: inputData.workflowId,
      localRepoPath: inputData.localRepoPath,
      event: 'cleanup_started'
    });
    
    try {
      await dataAgent.generate([
        { 
          role: 'user', 
          content: `Delete this directory and all its contents: ${inputData.localRepoPath}` 
        }
      ]);
      
      logger.info('Repository cleanup completed successfully', {
        workflowId: inputData.workflowId,
        cleanedPath: inputData.localRepoPath,
        event: 'cleanup_completed'
      });
      
      return {
        ...inputData,
        localRepoPath: null,
        status: inputData.graphOutput ? 'repositoryCleanedAfterGraph' : 'repositoryCleanedAfterError',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      
      logger.error('Repository cleanup failed', {
        workflowId: inputData.workflowId,
        localRepoPath: inputData.localRepoPath,
        error: message,
        event: 'cleanup_failed'
      });
      
      return { ...inputData, status: 'errorCleaningUp', cleanupError: message };
    }
  },
});/**
 * @workflow codeGraphMakerWorkflow
 * @description A Mastra workflow to analyze a GitHub repository, identify code dependencies,
 * and generate a visual dependency graph.
 * It uses various agents (git, data, analyzer, graph) to perform its tasks.
 *
 * @param {CodeGraphMakerInput} input - The input for the workflow, including the GitHub repository URL.
 * @returns {Promise<CodeGraphMakerOutput>} The result of the workflow, including the graph data or an error.
 *
 * @example
 * const result = await codeGraphMakerWorkflow.createRun().start({
 *   inputData: { githubRepoUrl: 'https://github.com/owner/repo.git' }
 * });
 * if (result.result.graphData) {
 *   console.log('Graph generated:', result.result.graphData);
 * } else {
 *   console.error('Workflow failed:', result.result.errorMessage);
 * }
 * [EDIT: December 11, 2024] & [BY: Claude]
 */
export const codeGraphMakerWorkflow = createWorkflow({
  id: 'codeGraphMaker',
  description: 'Analyzes a GitHub repository and generates a visual dependency graph',
  inputSchema: codeGraphMakerInputSchema,
  outputSchema: codeGraphMakerOutputSchema,
})
  .then(initializeWorkflowStep)
  .then(cloneRepositoryStep)
  .then(listFilesStep)
  .then(analyzeDependenciesStep)
  .then(generateGraphStep)
  .then(cleanupRepositoryStep)  .map(({ inputData }) => {
    /**
     * @description Finalizes the workflow, calculating duration and preparing the definitive output.
     * [EDIT: December 11, 2024] & [BY: Claude]
     */
    const duration = (Date.now() - inputData.startTime) / 1000;
    const finalStatus = inputData.status || 'unknown';
    let errorMessage = inputData.error || inputData.cleanupError;

    logger.info('Code Graph Maker workflow completed', {
      workflowId: inputData.workflowId,
      duration,
      finalStatus,
      hasGraphOutput: !!inputData.graphOutput,
      event: 'workflow_completed'
    });

    if (finalStatus.startsWith('error')) {
       // Error already set from a failing step
    } else if (finalStatus === 'skippedFileListing' || finalStatus === 'skippedAnalysis' || finalStatus === 'skippedGraphGeneration') {
      errorMessage = errorMessage || `Workflow step skipped due to previous error or missing data. Final status: ${finalStatus}`;
    } else if (!inputData.graphOutput && !finalStatus.startsWith('error') && finalStatus !== 'initialized' && finalStatus !== 'repositoryCloned' && finalStatus !== 'filesListed' && finalStatus !== 'dependenciesAnalyzed' && finalStatus !== 'cleanupSkippedNoPath' && finalStatus !== 'repositoryCleanedAfterError') {
      // If graphOutput is missing and it's not an early exit or error state, it's an issue.
      errorMessage = errorMessage || `Workflow completed but graph data is missing. Final status: ${finalStatus}`;
    }

    return {
      workflowId: inputData.workflowId,
      graphData: inputData.graphOutput || null,
      status: finalStatus,
      errorMessage: errorMessage,
    };
  })
  .commit();

logger.info('Code Graph Maker workflow initialized successfully', {
  workflowId: 'codeGraphMaker',
  steps: ['initializeWorkflow', 'cloneRepository', 'listFilesAndContent', 'analyzeDependencies', 'generateGraph', 'cleanupRepository'],
  event: 'workflow_definition_initialized'
});
