import { Mem0Integration } from "@mastra/mem0";
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { RuntimeContext } from '@mastra/core/di';
import { z } from "zod";
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'Mem0Tools', level: 'info' });

/**
 * Runtime context type for Mem0 tools configuration
 */
export type Mem0RuntimeContext = {
  'user-id': string;
  'session-id'?: string;
  'memory-namespace'?: string;
  'debug'?: boolean;
  'async-save'?: boolean;
};

// Zod schemas
const rememberInputSchema = z.object({
  question: z
    .string()
    .min(1)
    .describe("Question used to look up the answer in saved memories."),
}).strict();

const rememberOutputSchema = z.object({
  answer: z.string().describe("Remembered answer"),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  namespace: z.string().optional(),
}).strict();

const memorizeInputSchema = z.object({
  statement: z.string().min(1).describe("A statement to save into memory"),
}).strict();

const memorizeOutputSchema = z.object({
  success: z.boolean().describe("Whether the memory was saved successfully"),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  namespace: z.string().optional(),
}).strict();

// Create memory tools
export const mem0RememberTool = createTool({
  id: "Mem0-remember",
  description:
    "Remember your agent memories that you've previously saved using the Mem0-memorize tool.",
  inputSchema: rememberInputSchema,
  outputSchema: rememberOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof rememberInputSchema> & {
    input: z.infer<typeof rememberInputSchema>;
    runtimeContext?: RuntimeContext<Mem0RuntimeContext>;
  }): Promise<z.infer<typeof rememberOutputSchema>> => {    
    // Get runtime context values
    const userId = (runtimeContext?.get('user-id') as string) || 'anonymous';
    const sessionId = runtimeContext?.get('session-id') || 'default';
    const namespace = runtimeContext?.get('memory-namespace') || 'default';
    const debug = runtimeContext?.get('debug') || false;
    
    if (debug) {
      logger.info('Mem0 remember tool executed', {
        question: input.question,
        userId,
        sessionId,
        namespace
      });
    }

    try {
      // Update Mem0 config with runtime user ID
      const userMem0 = new Mem0Integration({
        config: {
          apiKey: process.env.MEM0_API_KEY || "",
          user_id: userId,
        },
      });

      if (debug) {
        console.log(`Searching memory "${input.question}" for user ${userId}`);
      }
      
      const memory = await userMem0.searchMemory(input.question);
      
      if (debug) {
        console.log(`Found memory "${memory}" for user ${userId}`);
      }

      return rememberOutputSchema.parse({
        answer: memory,
        userId,
        sessionId,
        namespace
      });
    } catch (error) {
      logger.error('Mem0 remember failed', {
        question: input.question,
        userId,
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return rememberOutputSchema.parse({
        answer: `Unable to retrieve memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        userId,
        sessionId,
        namespace
      });
    }
  },
});

export const mem0MemorizeTool = createTool({
  id: "Mem0-memorize",
  description:
    "Save information to mem0 so you can remember it later using the Mem0-remember tool.",
  inputSchema: memorizeInputSchema,
  outputSchema: memorizeOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof memorizeInputSchema> & {
    input: z.infer<typeof memorizeInputSchema>;
    runtimeContext?: RuntimeContext<Mem0RuntimeContext>;
  }): Promise<z.infer<typeof memorizeOutputSchema>> => {    
    // Get runtime context values
    const userId = (runtimeContext?.get('user-id') as string) || 'anonymous';
    const sessionId = runtimeContext?.get('session-id') || 'default';
    const namespace = runtimeContext?.get('memory-namespace') || 'default';
    const debug = runtimeContext?.get('debug') || false;
    const asyncSave = runtimeContext?.get('async-save') ?? true;
    
    if (debug) {
      logger.info('Mem0 memorize tool executed', {
        statement: input.statement,
        userId,
        sessionId,
        namespace,
        asyncSave
      });
    }

    try {
      // Update Mem0 config with runtime user ID
      const userMem0 = new Mem0Integration({
        config: {
          apiKey: process.env.MEM0_API_KEY || "",
          user_id: userId,
        },
      });

      if (debug) {
        console.log(`Creating memory "${input.statement}" for user ${userId}`);
      }
      
      if (asyncSave) {
        // To reduce latency, memories can be saved async without blocking tool execution
        void userMem0.createMemory(input.statement).then(() => {
          if (debug) {
            console.log(`Memory "${input.statement}" saved for user ${userId}`);
          }
        }).catch((error) => {
          logger.error('Async memory save failed', {
            statement: input.statement,
            userId,
            error: error instanceof Error ? error.message : String(error)
          });
        });
      } else {
        // Synchronous save
        await userMem0.createMemory(input.statement);
        if (debug) {
          console.log(`Memory "${input.statement}" saved synchronously for user ${userId}`);
        }
      }

      return memorizeOutputSchema.parse({
        success: true,
        userId,
        sessionId,
        namespace
      });
    } catch (error) {
      logger.error('Mem0 memorize failed', {
        statement: input.statement,
        userId,
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return memorizeOutputSchema.parse({
        success: false,
        userId,
        sessionId,
        namespace
      });
    }
  },
});

/**
 * Runtime context instance for Mem0 tools with defaults
 */
export const mem0RuntimeContext = new RuntimeContext<Mem0RuntimeContext>();
mem0RuntimeContext.set('user-id', 'anonymous');
mem0RuntimeContext.set('memory-namespace', 'default');
mem0RuntimeContext.set('debug', false);
mem0RuntimeContext.set('async-save', true);

