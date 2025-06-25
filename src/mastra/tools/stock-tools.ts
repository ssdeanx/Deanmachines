import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { RuntimeContext } from '@mastra/core/di';
import { z } from "zod";
import { generateId } from 'ai';
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'stockTools', level: 'info' });

/**
 * Runtime context type for stock tools configuration
 */
export type StockRuntimeContext = {
  'user-id'?: string;
  'session-id'?: string;
  'currency-preference'?: 'USD' | 'EUR' | 'GBP' | 'JPY';
  'data-source'?: string;
  'include-extended-hours'?: boolean;
  'debug'?: boolean;
};

// Enhanced Zod schemas with comprehensive validation
const stockInputSchema = z.object({
  symbol: z.string()
    .min(1, "Stock symbol cannot be empty")
    .max(10, "Stock symbol too long")
    .regex(/^[A-Z0-9.-]+$/, "Invalid stock symbol format")
    .transform(s => s.toUpperCase())
    .describe("The stock ticker symbol (e.g., AAPL, MSFT, GOOGL)"),
}).strict();

const stockOutputSchema = z.object({
  symbol: z.string().describe("Stock ticker symbol"),
  price: z.number().positive("Price must be positive").describe("Current stock price"),
  currency: z.string().default("USD").describe("Currency of the price"),
  timestamp: z.string().datetime().describe("Data timestamp in ISO format"),
  requestId: z.string().describe("Unique request identifier"),
  source: z.string().default("mastra-stock-data").describe("Data source"),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
}).strict();

const threadInfoInputSchema = z.object({
  includeResource: z.boolean()
    .optional()
    .default(false)
    .describe("Whether to include resource information in the response"),
}).strict();

const threadInfoOutputSchema = z.object({
  threadId: z.string().describe("Current conversation thread ID"),
  resourceId: z.string().optional().describe("Resource ID if requested"),
  timestamp: z.string().datetime().describe("Response timestamp"),
  requestId: z.string().describe("Unique request identifier"),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
}).strict();

// API response schema for validation
const stockApiResponseSchema = z.object({
  prices: z.record(z.string(), z.union([z.string(), z.number()]))
    .refine(data => data["4. close"] != null, {
      message: "Stock price data missing '4. close' field"
    }),
});

// Enhanced helper function with validation and error handling
const getStockPrice = async (symbol: string) => {
  const response = await fetch(
    `https://mastra-stock-data.vercel.app/api/stock-data?symbol=${symbol}`,
  );
  
  if (!response.ok) {
    throw new Error(`Stock API error: ${response.status} - ${response.statusText}`);
  }
  
  const data = await response.json();
  const validatedData = stockApiResponseSchema.parse(data);
  
  const priceValue = validatedData.prices["4. close"];
  if (typeof priceValue === 'string') {
    return parseFloat(priceValue);
  }
  return Number(priceValue);
};

// Create an enhanced tool to get stock prices
export const stockPriceTool = createTool({
  id: "getStockPrice",
  description: "Fetches the current stock price for a given ticker symbol with comprehensive validation",
  inputSchema: stockInputSchema,
  outputSchema: stockOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof stockInputSchema> & {
    input: z.infer<typeof stockInputSchema>;
    runtimeContext?: RuntimeContext<StockRuntimeContext>;
  }): Promise<z.infer<typeof stockOutputSchema>> => {
    const requestId = generateId();
    
    // Get runtime context values
    const userId = runtimeContext?.get('user-id') || 'anonymous';
    const sessionId = runtimeContext?.get('session-id') || 'default';
    const currencyPreference = (runtimeContext?.get('currency-preference') as string) || 'USD';
    const dataSource = (runtimeContext?.get('data-source') as string) || 'mastra-stock-data';
    const debug = runtimeContext?.get('debug') || false;
    
    if (debug) {
      logger.info(`[${requestId}] Stock price request started`, { 
        symbol: input.symbol,
        userId,
        sessionId,
        currencyPreference
      });
    }
    
    try {
      const price = await getStockPrice(input.symbol);
      
      const result = stockOutputSchema.parse({
        symbol: input.symbol,
        price: price,
        currency: currencyPreference,
        timestamp: new Date().toISOString(),
        requestId,
        source: dataSource,
        userId,
        sessionId
      });
      
      if (debug) {
        logger.info(`[${requestId}] Stock price request completed successfully`, { 
          symbol: result.symbol,
          price: result.price,
          userId,
          sessionId
        });
      }
      
      return result;
    } catch (error) {
      logger.error(`[${requestId}] Stock price request failed`, { 
        symbol: input.symbol,
        userId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },
});

// Create a tool that uses the thread context
export const threadInfoTool = createTool({
  id: "getThreadInfo",
  description: "Returns information about the current conversation thread with comprehensive validation",
  inputSchema: threadInfoInputSchema,
  outputSchema: threadInfoOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof threadInfoInputSchema> & {
    input: z.infer<typeof threadInfoInputSchema>;
    runtimeContext?: RuntimeContext<StockRuntimeContext>;
  }): Promise<z.infer<typeof threadInfoOutputSchema>> => {
    const requestId = generateId();
    
    // Get runtime context values
    const userId = runtimeContext?.get('user-id') || 'anonymous';
    const sessionId = runtimeContext?.get('session-id') || 'default';
    const debug = runtimeContext?.get('debug') || false;
    
    if (debug) {
      logger.info(`[${requestId}] Thread info request started`, { 
        includeResource: input.includeResource,
        userId,
        sessionId
      });
    }
    
    try {
      const result = threadInfoOutputSchema.parse({
        threadId: sessionId, // Use session ID as thread ID
        resourceId: input.includeResource ? `resource-${userId}-${sessionId}` : undefined,
        timestamp: new Date().toISOString(),
        requestId,
        userId,
        sessionId
      });
      
      if (debug) {
        logger.info(`[${requestId}] Thread info request completed successfully`, { 
          threadId: result.threadId,
          includeResource: input.includeResource,
          userId,
          sessionId
        });
      }
      
      return result;
    } catch (error) {
      logger.error(`[${requestId}] Thread info request failed`, { 
        includeResource: input.includeResource,
        userId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },
});

/**
 * Runtime context instance for stock tools with defaults
 */
export const stockRuntimeContext = new RuntimeContext<StockRuntimeContext>();
stockRuntimeContext.set('currency-preference', 'USD');
stockRuntimeContext.set('data-source', 'mastra-stock-data');
stockRuntimeContext.set('include-extended-hours', false);
stockRuntimeContext.set('debug', false);