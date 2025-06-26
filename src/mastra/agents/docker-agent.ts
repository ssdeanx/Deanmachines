import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { vectorQueryTool, hybridVectorSearchTool } from "../tools/vectorQueryTool";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';
import { chunkerTool } from "../tools/chunker-tool";
import { rerankTool } from "../tools/rerank-tool";

const logger = createAgentDualLogger('DockerAgent');
logger.info('Initializing DockerAgent');

/**
 * Runtime context for the Docker Agent
 * Stores containerization preferences, deployment targets, and Docker configuration
 * 
 * @mastra DockerAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type DockerAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Target deployment environment */
  "deployment-env": "development" | "staging" | "production" | "testing";
  /** Container orchestration platform */
  "orchestration": "docker-compose" | "kubernetes" | "swarm" | "standalone";
  /** Base image preference */
  "base-image": string;
  /** Resource limits for containers */
  "resource-limits": "small" | "medium" | "large" | "custom";
  /** Registry for image storage */
  "registry": "docker-hub" | "ecr" | "gcr" | "acr" | "private";
};

/**
 * Docker agent for containerization, orchestration, and deployment
 * Specializes in Docker containers, Kubernetes, and cloud deployment strategies
 */
export const dockerAgent = new Agent({
  name: "Docker Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const deploymentEnv = runtimeContext?.get("deployment-env") || "development";
    const orchestration = runtimeContext?.get("orchestration") || "docker-compose";
    const baseImage = runtimeContext?.get("base-image") || "node:18-alpine";
    const resourceLimits = runtimeContext?.get("resource-limits") || "medium";
    const registry = runtimeContext?.get("registry") || "docker-hub";

    return `You are a specialized containerization and deployment assistant.
Your expertise lies in Docker containers, Kubernetes, and cloud deployment strategies.
You have a strong understanding of container orchestration, networking, security, and scalability best practices.
You are proficient in creating efficient Dockerfiles, optimizing container images, and managing container registries.
You are familiar with various container orchestration platforms such as Docker Compose, Kubernetes, and Swarm.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Deployment Environment: ${deploymentEnv}
- Orchestration Platform: ${orchestration}
- Base Image: ${baseImage}
- Resource Limits: ${resourceLimits}
- Container Registry: ${registry}

Your primary functions include:
- Docker container creation and optimization
- Dockerfile best practices and security
- Docker Compose orchestration
- Kubernetes deployment strategies
- Container registry management
- Image optimization and size reduction
- Multi-stage build optimization
- Container security and vulnerability assessment

When responding:
- Follow Docker and Kubernetes best practices
- Consider security implications of container configurations
- Optimize for image size and build performance
- Suggest appropriate base images and layers for ${deploymentEnv} environment
- Provide clear deployment strategies using ${orchestration}
- Consider scalability and resource management (${resourceLimits} tier)
- Recommend monitoring and logging solutions
- Handle secrets and configuration management securely
- Target ${registry} for image storage and distribution

Use available tools to query containerization patterns and deployment strategies.`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),
  tools: {
    chunkerTool,
    rerankTool,
    hybridVectorSearchTool,
    vectorQueryTool,
    ...mcpTools.tavily,
    ...mcpTools.nodeCodeSandbox,
    ...mcpTools.filesystem,
    ...mcpTools.git,
    ...mcpTools.fetch,
    ...mcpTools.puppeteer,
    ...mcpTools.github,
    ...mcpTools.docker,
  },
  memory: upstashMemory,
});

