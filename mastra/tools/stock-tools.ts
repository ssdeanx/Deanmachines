import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { generateId } from 'ai';
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'stockTools', level: 'info' });

// Enhanced Zod schemas with comprehensive validation
const stockInputSchema = z.object({
  symbol: z.string()
    .min(1, "Stock symbol cannot be empty")
    .max(10, "Stock symbol too long")
    .regex(/^[A-Z0-9.-]+$/, "Invalid stock symbol format")
    .transform(s => s.toUpperCase())
    .describe("The stock ticker symbol (e.g., AAPL, MSFT, GOOGL)"),
});

const stockOutputSchema = z.object({
  symbol: z.string().describe("Stock ticker symbol"),
  price: z.number().positive("Price must be positive").describe("Current stock price"),
  currency: z.string().default("USD").describe("Currency of the price"),
  timestamp: z.string().datetime().describe("Data timestamp in ISO format"),
  requestId: z.string().describe("Unique request identifier"),
  source: z.string().default("mastra-stock-data").describe("Data source"),
});

const threadInfoInputSchema = z.object({
  includeResource: z.boolean()
    .optional()
    .default(false)
    .describe("Whether to include resource information in the response"),
});

const threadInfoOutputSchema = z.object({
  threadId: z.string().describe("Current conversation thread ID"),
  resourceId: z.string().optional().describe("Resource ID if requested"),
  timestamp: z.string().datetime().describe("Response timestamp"),
  requestId: z.string().describe("Unique request identifier"),
});

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
  execute: async ({ context }) => {
    const requestId = generateId();
    logger.info(`[${requestId}] Stock price request started`, { symbol: context.symbol });
    
    try {
      const price = await getStockPrice(context.symbol);
      
      const result = {
        symbol: context.symbol,
        price: price,
        currency: "USD",
        timestamp: new Date().toISOString(),
        requestId,
        source: "mastra-stock-data",
      };
      
      logger.info(`[${requestId}] Stock price request completed successfully`, { 
        symbol: result.symbol,
        price: result.price 
      });
      
      return result;
    } catch (error) {
      logger.error(`[${requestId}] Stock price request failed`, { 
        symbol: context.symbol,
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
  execute: async ({ context }) => {
    const requestId = generateId();
    logger.info(`[${requestId}] Thread info request started`, { includeResource: context.includeResource });
    
    try {
      const result = {
        threadId: "current-thread-id", // This would typically come from actual thread context
        resourceId: context.includeResource ? "current-resource-id" : undefined,
        timestamp: new Date().toISOString(),
        requestId,
      };
      
      logger.info(`[${requestId}] Thread info request completed successfully`, { 
        threadId: result.threadId,
        includeResource: context.includeResource 
      });
      
      return result;
    } catch (error) {
      logger.error(`[${requestId}] Thread info request failed`, { 
        includeResource: context.includeResource,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },
});