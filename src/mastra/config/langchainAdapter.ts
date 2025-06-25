/**
 * LangChain Adapter Integration for Mastra with Google Generative AI
 * 
 * This adapter bridges the gap between AI SDK's Google provider and LangGraph,
 * allowing you to use LangGraph workflows while maintaining your existing
 * Google Generative AI setup with Mastra.
 * 
 * @see https://ai-sdk.dev/providers/adapters/langchain
 * @see https://js.langchain.com/docs/
 * @see https://langchain-ai.github.io/langgraph/
 * 
 * [EDIT: 2025-06-23] [BY: Claude 3.5 Sonnet]
 */

import { LangChainAdapter } from 'ai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { StateGraph, Annotation } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { PinoLogger } from "@mastra/loggers";
import { GEMINI_CONFIG } from './googleProvider';
import { env } from './environment';

const logger = new PinoLogger({ name: 'langchainAdapter', level: 'info' });

/**
 * Google Generative AI Safety Setting interface
 */
interface SafetySetting {
  category: string;
  threshold: string;
}

/**
 * AI SDK Message interface for type-safe message conversion
 */
interface AISDKMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Mastra Agent Context interface for runtime context integration
 */
interface MastraAgentContext {
  agentName?: string;
  temperature?: number;
  maxTokens?: number;
  instructions?: string;
  systemPrompt?: string;
  traceId?: string;
  sessionId?: string;
  userId?: string;
}



/**
 * LangGraph Agent State Annotation for type-safe state management
 */
const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<(HumanMessage | SystemMessage | AIMessage)[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  currentStep: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'start',
  }),
  agentName: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'mastra-agent',
  }),
  context: Annotation<Record<string, unknown>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  result: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  error: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
});

/**
 * LangChain tool definition for agent capabilities
 */
interface LangChainToolDefinition {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

/**
 * Enhanced LangChain Google Generative AI Model with Mastra integration
 * 
 * @param options - Configuration options for the model
 * @returns Configured ChatGoogleGenerativeAI instance
 * 
 * @example
 * ```typescript
 * const model = createLangChainGoogleModel({
 *   modelName: GEMINI_CONFIG.MODELS.GEMINI_2_5_FLASH_LITE,
 *   temperature: 0.7,
 *   streaming: true
 * });
 * ```
 */
export function createLangChainGoogleModel(options: {
  modelName?: string;
  temperature?: number;
  maxOutputTokens?: number;
  streaming?: boolean;
  safetySettings?: SafetySetting[];
  systemInstruction?: string;
}) {
  const {
    modelName = GEMINI_CONFIG.MODELS.GEMINI_2_5_FLASH_LITE,
    temperature = 0.7,
    maxOutputTokens = 64000, // Max tokens
    streaming = true,
    systemInstruction
  } = options;

  logger.info('Creating LangChain Google model', { 
    modelName, 
    temperature, 
    maxOutputTokens,
    streaming 
  });  // Create the base configuration with proper typing
  const config = {
    model: modelName,
    apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
    temperature,
    maxOutputTokens,
    streaming,
    // Note: safetySettings omitted as they may not be compatible with LangChain format
    // Additional configuration for enhanced capabilities
    topK: 40,
    topP: 0.95,
  };

  // Add system instruction if provided (note: may need to be handled differently)
  if (systemInstruction) {
    // LangChain Google models handle system messages differently
    logger.info('System instruction provided - will be handled via system message', { 
      hasSystemInstruction: !!systemInstruction 
    });
  }

  return new ChatGoogleGenerativeAI(config);
}

/**
 * Create a streaming LangChain adapter for use with Mastra agents
 * 
 * @param model - The LangChain model instance
 * @param messages - Array of messages for the conversation
 * @param tools - Optional tools for the model to use
 * @param metadata - Additional metadata for tracing
 * @returns Stream response compatible with AI SDK
 * 
 * @example
 * ```typescript
 * const model = createLangChainGoogleModel({ streaming: true });
 * const stream = await createLangChainStream(model, [
 *   new SystemMessage("You are a helpful assistant"),
 *   new HumanMessage("Hello!")
 * ]);
 * ```
 */
export async function createLangChainStream(
  model: ChatGoogleGenerativeAI,
  messages: (HumanMessage | SystemMessage | AIMessage)[],
  tools?: LangChainToolDefinition[],
  metadata?: Record<string, string | number | boolean>
) {
  try {
    logger.info('Creating LangChain stream', { 
      messageCount: messages.length,
      hasTools: !!tools?.length,
      metadata 
    });

    // Bind tools if provided
    const modelWithTools = tools ? model.bindTools(tools) : model;

    // Create the stream
    const stream = await modelWithTools.stream(messages, {
      metadata: {
        ...metadata,
        project: 'dean-machines-rsc',
        timestamp: new Date().toISOString(),
        model: model.model
      }
    });

    return LangChainAdapter.toDataStreamResponse(stream);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error creating LangChain stream', { error: errorMessage });
    throw error;
  }
}

/**
 * Convert AI SDK messages to LangChain message format
 * 
 * @param messages - Messages in AI SDK format
 * @returns Messages in LangChain format
 */
export function convertToLangChainMessages(messages: AISDKMessage[]): (HumanMessage | SystemMessage | AIMessage)[] {
  return messages.map(message => {
    switch (message.role) {
      case 'system':
        return new SystemMessage(message.content);
      case 'user':
        return new HumanMessage(message.content);
      case 'assistant':
        return new AIMessage(message.content);
      default:
        logger.warn('Unknown message role', { role: message.role });
        return new HumanMessage(message.content);
    }
  });
}

/**
 * LangGraph-compatible model factory for Mastra agents
 * 
 * This creates a model that can be used directly in LangGraph workflows
 * while maintaining compatibility with your existing Google AI provider setup.
 * 
 * @param agentContext - Context from the Mastra agent
 * @returns LangGraph-compatible model instance
 * 
 * @example
 * ```typescript
 * // In your Mastra agent
 * const model = createLangGraphModel({
 *   agentName: 'research-agent',
 *   temperature: 0.3,
 *   maxTokens: 64000
 * });
 * ```
 */
export function createLangGraphModel(agentContext: {
  agentName?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}) {
  const {
    agentName = 'mastra-agent',
    temperature = 0.7,
    maxTokens = 8192,
    systemPrompt
  } = agentContext;

  logger.info('Creating LangGraph model for agent', { 
    agentName, 
    temperature, 
    maxTokens 
  });

  return createLangChainGoogleModel({
    modelName: GEMINI_CONFIG.MODELS.GEMINI_2_5_FLASH_LITE,
    temperature,
    maxOutputTokens: maxTokens,
    streaming: true,
    systemInstruction: systemPrompt || `You are ${agentName}, a specialized AI agent in the Dean Machines RSC system.`
  });
}

/**
 * Create a LangGraph StateGraph for advanced agent workflows
 * 
 * This creates a stateful workflow that can handle complex multi-step agent interactions,
 * perfect for integration with Mastra's agent network.
 * 
 * @param agentConfig - Configuration for the agent
 * @returns Compiled LangGraph workflow
 * 
 * @example
 * ```typescript
 * const workflow = createMastraLangGraphWorkflow({
 *   agentName: 'strategizer-agent',
 *   steps: ['analyze', 'plan', 'execute']
 * });
 * 
 * const result = await workflow.invoke({
 *   messages: [new HumanMessage("Help me plan a strategy")],
 *   agentName: 'strategizer-agent'
 * });
 * ```
 */
export function createMastraLangGraphWorkflow(agentConfig: {
  agentName: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  steps?: string[];
}) {
  const {
    agentName,
    temperature = 0.7,
    maxTokens = 8192,
    systemPrompt,
    steps = ['process', 'respond']
  } = agentConfig;

  logger.info('Creating LangGraph workflow for Mastra agent', { 
    agentName, 
    steps: steps.length 
  });

  // Create the model for this workflow
  const model = createLangGraphModel({
    agentName,
    temperature,
    maxTokens,
    systemPrompt
  });

  // Define the workflow nodes
  const processNode = async (state: typeof AgentStateAnnotation.State) => {
    try {
      logger.info('Processing step for agent', { 
        agentName: state.agentName,
        currentStep: state.currentStep,
        messageCount: state.messages.length 
      });

      // Add system message if needed
      const messages = [...state.messages];
      if (systemPrompt && !messages.some(msg => msg instanceof SystemMessage)) {
        messages.unshift(new SystemMessage(systemPrompt));
      }

      // Process with the model
      const response = await model.invoke(messages);
      
      return {
        messages: [response],
        currentStep: 'completed',
        result: response.content.toString(),
        context: {
          ...state.context,
          lastProcessedAt: new Date().toISOString(),
          agentName
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error in LangGraph process node', { 
        error: errorMessage,
        agentName: state.agentName 
      });
      
      return {
        currentStep: 'error',
        error: errorMessage,
        context: {
          ...state.context,
          errorAt: new Date().toISOString()
        }
      };
    }
  };

  const analyzeNode = async (state: typeof AgentStateAnnotation.State) => {
    logger.info('Analysis step for agent', { agentName: state.agentName });
    
    const analysisPrompt = new SystemMessage(
      `You are ${agentName}. Analyze the following input carefully and provide insights.`
    );
    
    const messages = [analysisPrompt, ...state.messages];
    const response = await model.invoke(messages);
    
    return {
      messages: [response],
      currentStep: 'analyzed',
      context: {
        ...state.context,
        analysisComplete: true,
        analyzedAt: new Date().toISOString()
      }
    };
  };

  const planNode = async (state: typeof AgentStateAnnotation.State) => {
    logger.info('Planning step for agent', { agentName: state.agentName });
    
    const planningPrompt = new SystemMessage(
      `You are ${agentName}. Based on your analysis, create a detailed plan of action.`
    );
    
    const messages = [planningPrompt, ...state.messages];
    const response = await model.invoke(messages);
    
    return {
      messages: [response],
      currentStep: 'planned',
      context: {
        ...state.context,
        planComplete: true,
        plannedAt: new Date().toISOString()
      }
    };
  };

  const executeNode = async (state: typeof AgentStateAnnotation.State) => {
    logger.info('Execution step for agent', { agentName: state.agentName });
    
    const executionPrompt = new SystemMessage(
      `You are ${agentName}. Execute your plan and provide the final result.`
    );
    
    const messages = [executionPrompt, ...state.messages];
    const response = await model.invoke(messages);
    
    return {
      messages: [response],
      currentStep: 'executed',
      result: response.content.toString(),
      context: {
        ...state.context,
        executionComplete: true,
        executedAt: new Date().toISOString()
      }
    };
  };

  // Build the StateGraph
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode('process', processNode)
    .addNode('analyze', analyzeNode)
    .addNode('plan', planNode)
    .addNode('execute', executeNode)
    .addEdge('__start__', 'process');

  // Add conditional edges based on the steps configuration
  if (steps.includes('analyze')) {
    workflow.addEdge('process', 'analyze');
    if (steps.includes('plan')) {
      workflow.addEdge('analyze', 'plan');
      if (steps.includes('execute')) {
        workflow.addEdge('plan', 'execute');
        workflow.addEdge('execute', '__end__');
      } else {
        workflow.addEdge('plan', '__end__');
      }
    } else {
      workflow.addEdge('analyze', '__end__');
    }
  } else {
    workflow.addEdge('process', '__end__');
  }

  // Add memory for stateful conversations
  const memory = new MemorySaver();
  
  // Compile and return the workflow
  const compiledWorkflow = workflow.compile({ checkpointer: memory });
  
  logger.info('LangGraph workflow compiled successfully', { 
    agentName,
    nodeCount: steps.length + 1 
  });
  
  return compiledWorkflow;
}

/**
 * Create a simple LangGraph chat workflow for Mastra agents
 * 
 * This is a simpler version that focuses on conversational interactions
 * without complex multi-step processing.
 * 
 * @param agentConfig - Configuration for the chat agent
 * @returns Compiled LangGraph chat workflow
 */
export function createMastraLangGraphChat(agentConfig: {
  agentName: string;
  temperature?: number;
  systemPrompt?: string;
}) {
  const { agentName, temperature = 0.7, systemPrompt } = agentConfig;
  
  const model = createLangGraphModel({
    agentName,
    temperature,
    systemPrompt
  });

  const chatNode = async (state: typeof AgentStateAnnotation.State) => {
    const messages = [...state.messages];
    
    // Add system prompt if provided and not already present
    if (systemPrompt && !messages.some(msg => msg instanceof SystemMessage)) {
      messages.unshift(new SystemMessage(systemPrompt));
    }
    
    const response = await model.invoke(messages);
    
    return {
      messages: [response],
      result: response.content.toString(),
      currentStep: 'completed'
    };
  };

  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode('chat', chatNode)
    .addEdge('__start__', 'chat')
    .addEdge('chat', '__end__');

  const memory = new MemorySaver();
  return workflow.compile({ checkpointer: memory });
}

/**
 * Mastra-specific LangChain integration utilities
 */
export const MastraLangChainUtils = {
  /**
   * Create a model with Mastra observability integration
   */
  createTracedModel: (options: Parameters<typeof createLangChainGoogleModel>[0] & {
    traceId?: string;
    sessionId?: string;
    userId?: string;
  }) => {
    const { traceId, sessionId, userId, ...modelOptions } = options;
    
    const model = createLangChainGoogleModel(modelOptions);
    
    // Add observability metadata
    if (traceId || sessionId || userId) {
      logger.info('Creating traced LangChain model', { 
        traceId, 
        sessionId, 
        userId,
        modelName: modelOptions.modelName 
      });
    }
    
    return model;
  },
  /**
   * Convert Mastra agent context to LangChain compatible format
   */
  convertMastraContext: (context: MastraAgentContext) => {
    return {
      agentName: context.agentName || 'mastra-agent',
      temperature: context.temperature || 0.7,
      maxTokens: context.maxTokens || 64000,
      systemPrompt: context.instructions || context.systemPrompt
    };
  }
};

const LangChainAdapterExports = {
  createLangChainGoogleModel,
  createLangChainStream,
  createLangGraphModel,
  createMastraLangGraphWorkflow,
  createMastraLangGraphChat,
  convertToLangChainMessages,
  MastraLangChainUtils,
  AgentStateAnnotation
};

export default LangChainAdapterExports;
