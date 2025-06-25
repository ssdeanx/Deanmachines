
import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { RuntimeContext } from '@mastra/core/di';
import { rerank, type RerankResult } from '@mastra/rag';
import { createGemini25Provider } from '../config/googleProvider';
import { CoreMessage, UIMessage } from 'ai';
import { searchUpstashMessages } from '../upstashMemory';
import { PinoLogger } from '@mastra/loggers';
import { z } from 'zod';

const logger = new PinoLogger({ name: 'RerankTool', level: 'info' });

/**
 * Runtime context type for rerank tool configuration
 */
export type RerankRuntimeContext = {
  'user-id'?: string;
  'session-id'?: string;
  'model-preference'?: 'gemini-2.5-flash-lite-preview-06-17' | 'gemini-2.5-preview-05-20' | 'gemini-2.0-flash' | 'gemini-2.0-flash-lite';
  'semantic-weight'?: number;
  'vector-weight'?: number;
  'position-weight'?: number;
  'debug'?: boolean;
  'quality-threshold'?: number;
};

// Input and output schemas
const rerankInputSchema = z.object({
  threadId: z.string().describe('Thread identifier for conversation context'),
  query: z.string().min(1).describe('Query string for semantic search and reranking'),
  topK: z.number().int().positive().default(10).describe('Number of initial results to retrieve before reranking'),
  finalK: z.number().int().positive().default(3).describe('Final number of results after reranking'),
  before: z.number().int().min(0).default(2).describe('Number of messages before each match'),
  after: z.number().int().min(0).default(1).describe('Number of messages after each match'),
  semanticWeight: z.number().min(0).max(1).default(0.6).describe('Weight for semantic similarity'),
  vectorWeight: z.number().min(0).max(1).default(0.3).describe('Weight for vector similarity'),
  positionWeight: z.number().min(0).max(1).default(0.1).describe('Weight for position bias'),
}).strict();

const rerankOutputSchema = z.object({
  messages: z.array(z.any()).describe('Reranked core messages'),
  uiMessages: z.array(z.any()).describe('Reranked UI messages'),
  rerankMetadata: z.object({
    topK: z.number().describe('Initial number of results retrieved'),
    finalK: z.number().describe('Final number of results after reranking'),
    before: z.number().describe('Context messages before'),
    after: z.number().describe('Context messages after'),
    initialResultCount: z.number().describe('Total initial results before reranking'),
    rerankingUsed: z.boolean().describe('Whether reranking was applied'),
    rerankingDuration: z.number().describe('Time taken for reranking in milliseconds'),
    averageRelevanceScore: z.number().describe('Average relevance score of reranked results'),
    userId: z.string().optional(),
    sessionId: z.string().optional(),
  }).describe('Metadata about the reranking process')
}).strict();

/**
 * Enhanced reranking tool using Mastra's rerank function with runtime context
 */
export const rerankTool = createTool({
  id: 'rerank',
  description: 'Search and rerank conversation messages using semantic similarity and configurable weights',
  inputSchema: rerankInputSchema,
  outputSchema: rerankOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof rerankInputSchema> & {
    input: z.infer<typeof rerankInputSchema>;
    runtimeContext?: RuntimeContext<RerankRuntimeContext>;
  }): Promise<z.infer<typeof rerankOutputSchema>> => {
    const startTime = Date.now();

    try {
      const validatedInput = rerankInputSchema.parse(input);      // Get runtime context values
      const userId = runtimeContext?.get('user-id') || 'anonymous';
      const sessionId = runtimeContext?.get('session-id') || 'default';
      const modelPreference = (runtimeContext?.get('model-preference') as string) || 'gemini-2.5-flash-lite-preview-06-17';
      const semanticWeight = Number(runtimeContext?.get('semantic-weight')) || validatedInput.semanticWeight;
      const vectorWeight = Number(runtimeContext?.get('vector-weight')) || validatedInput.vectorWeight;
      const positionWeight = Number(runtimeContext?.get('position-weight')) || validatedInput.positionWeight;
      const debug = runtimeContext?.get('debug') || false;

      if (debug) {
        logger.info('Rerank tool executed with runtime context', {
          userId,
          sessionId,
          modelPreference,
          weights: { semanticWeight, vectorWeight, positionWeight },
          query: validatedInput.query,
          threadId: validatedInput.threadId
        });
      }

      // First, get more results than needed for reranking using Upstash memory
      const initialResults = await searchUpstashMessages(
        validatedInput.threadId,
        validatedInput.query,
        validatedInput.topK,
        validatedInput.before,
        validatedInput.after
      );

      // If we have more results than needed, apply reranking
      if (initialResults.messages.length > validatedInput.finalK) {
        const model = createGemini25Provider(modelPreference);

        // Convert memory results to the format expected by rerank function
        const queryResults = initialResults.messages.map((msg: CoreMessage, index: number) => ({
          id: `msg_${index}`,
          score: 0.5, // Default score
          metadata: {
            text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            role: msg.role,
            index,
            userId,
            sessionId
          }
        }));

        // Rerank using Mastra's rerank function
        const rerankedResults = await rerank(
          queryResults,
          validatedInput.query,
          model,
          {
            weights: {
              semantic: semanticWeight,
              vector: vectorWeight,
              position: positionWeight
            },
            topK: validatedInput.finalK
          }
        );

        // Map reranked results back to messages
        const rerankedMessages = rerankedResults.map((result) => {
          const originalIndex = result.result.metadata?.index;
          if (typeof originalIndex === 'number') {
            return initialResults.messages[originalIndex];
          }
          return undefined;
        }).filter(Boolean) as CoreMessage[];

        // Map reranked results to UI messages
        const rerankedUIMessages = rerankedResults.map((result: RerankResult) => {
          const originalIndex = result.result.metadata?.index as number | undefined;
          if (typeof originalIndex === 'number') {
            return initialResults.uiMessages[originalIndex];
          }
          return undefined;
        }).filter(Boolean) as UIMessage[];

        const rerankMetadata = {
          topK: validatedInput.topK,
          finalK: validatedInput.finalK,
          before: validatedInput.before,
          after: validatedInput.after,
          initialResultCount: initialResults.messages.length,
          rerankingUsed: true,
          rerankingDuration: Date.now() - startTime,
          averageRelevanceScore: rerankedResults.length > 0 ? 
            rerankedResults.reduce((sum: number, r: RerankResult) => sum + r.score, 0) / rerankedResults.length : 0,
          userId,
          sessionId
        };

        if (debug) {
          logger.info('Reranked search completed', {
            originalCount: initialResults.messages.length,
            finalCount: rerankedMessages.length,
            avgScore: rerankMetadata.averageRelevanceScore,
            duration: rerankMetadata.rerankingDuration
          });
        }

        return rerankOutputSchema.parse({
          messages: rerankedMessages,
          uiMessages: rerankedUIMessages,
          rerankMetadata
        });

      } else {
        // Not enough results to warrant reranking, return original results
        const rerankMetadata = {
          topK: validatedInput.topK,
          finalK: validatedInput.finalK,
          before: validatedInput.before,
          after: validatedInput.after,
          initialResultCount: initialResults.messages.length,
          rerankingUsed: false,
          rerankingDuration: Date.now() - startTime,
          averageRelevanceScore: 0,
          userId,
          sessionId
        };

        if (debug) {
          logger.info('Reranking skipped - insufficient results', {
            resultCount: initialResults.messages.length,
            finalK: validatedInput.finalK
          });
        }

        return rerankOutputSchema.parse({
          messages: initialResults.messages,
          uiMessages: initialResults.uiMessages,
          rerankMetadata
        });
      }

    } catch (error) {
      logger.error('Rerank tool execution failed', { 
        error: error instanceof Error ? error.message : String(error),
        query: input.query,
        threadId: input.threadId
      });
      
      // Return empty results on error
      const rerankMetadata = {
        topK: input.topK || 10,
        finalK: input.finalK || 3,
        before: input.before || 2,
        after: input.after || 1,
        initialResultCount: 0,
        rerankingUsed: false,
        rerankingDuration: Date.now() - startTime,
        averageRelevanceScore: 0,
        userId: runtimeContext?.get('user-id') || 'anonymous',
        sessionId: runtimeContext?.get('session-id') || 'default'
      };

      return rerankOutputSchema.parse({
        messages: [],
        uiMessages: [],
        rerankMetadata
      });
    }
  },
});

/**
 * Runtime context instance for rerank tool with defaults
 */
export const rerankRuntimeContext = new RuntimeContext<RerankRuntimeContext>();
rerankRuntimeContext.set('model-preference', 'gemini-2.5-flash-lite-preview-06-17');
rerankRuntimeContext.set('semantic-weight', 0.6);
rerankRuntimeContext.set('vector-weight', 0.3);
rerankRuntimeContext.set('position-weight', 0.1);
rerankRuntimeContext.set('debug', false);
rerankRuntimeContext.set('quality-threshold', 0.7);

/**
 * Legacy function for backward compatibility
 */
export async function rerankSearchMessages(
  threadId: string,
  vectorSearchString: string,
  topK = 10,
  finalK = 3,
  before = 2,
  after = 1
): Promise<{ messages: CoreMessage[]; uiMessages: UIMessage[]; rerankMetadata: { topK: number; before: number; after: number } }> {
  const startTime = Date.now();

  try {
    // First, get more results than needed for reranking using Upstash memory
    const initialResults = await searchUpstashMessages(
      threadId,
      vectorSearchString,
      topK,
      before,
      after
    );

    // Use Mastra's rerank function with Google model for better relevance
    if (initialResults.messages.length > finalK) {
      const model = createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
        responseModalities: ["TEXT"],
        thinkingConfig: {
          thinkingBudget: 0, // Fixed thinking budget
          includeThoughts: false, // Disable thoughts for debugging and monitoring purposes
        },
      });

      // Convert memory results to the format expected by rerank function
      const queryResults = initialResults.messages.map((msg: CoreMessage, index: number) => ({
        id: `msg_${index}`,
        score: 0.5, // Default score
        metadata: {
          text: msg.content,
          role: msg.role,
          index
        }
      }));

      // Rerank using Mastra's rerank function
      const rerankedResults = await rerank(
        queryResults,
        vectorSearchString,
        model,
        {
          weights: {
            semantic: 0.6,
            vector: 0.3,
            position: 0.1
          },
          topK: finalK
        }
      );

      // Map reranked results back to messages
      const rerankedMessages = rerankedResults.map((result) => {
        const originalIndex = result.result.metadata?.index;
        if (typeof originalIndex === 'number') {
          return initialResults.messages[originalIndex];
        }
        return undefined;
      }).filter(Boolean) as CoreMessage[];
      // Map reranked results to UI messages
      const rerankedUIMessages = rerankedResults.map((result: RerankResult) => {
        const originalIndex = result.result.metadata?.index as number | undefined;
        if (typeof originalIndex === 'number') {
          return initialResults.uiMessages[originalIndex];
        }
        return undefined;
      }).filter(Boolean) as UIMessage[];

      const rerankMetadata = {
        topK,
        before,
        after,
        initialResultCount: initialResults.messages.length,
        rerankingUsed: true,
        rerankingDuration: Date.now() - startTime,
        averageRelevanceScore: rerankedResults.length > 0 ? rerankedResults.reduce((sum: number, r: RerankResult) => sum + r.score, 0) / rerankedResults.length : 0
      };

      logger.info('Reranked search completed', {
        threadId,
        query: vectorSearchString,
        ...rerankMetadata
      });

      return {
        messages: rerankedMessages,
        uiMessages: rerankedUIMessages,
        rerankMetadata: { topK, before, after }
      };
    } else {
      // Fallback to simple top-k without reranking
      const finalMessages = initialResults.messages.slice(0, finalK);
      const finalUIMessages = initialResults.uiMessages.slice(0, finalK);

      return {
        messages: finalMessages,
        uiMessages: finalUIMessages,
        rerankMetadata: { topK, before, after }
      };
    }
  } catch (error: unknown) {
    logger.error(`rerankSearchMessages failed: ${(error as Error).message}`);
    throw error;
  }
}