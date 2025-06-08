import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Helper function to fetch stock data
const getStockPrice = async (symbol: string) => {
  const response = await fetch(
    `https://mastra-stock-data.vercel.app/api/stock-data?symbol=${symbol}`,
  );
  const data = await response.json();
  return data.prices["4. close"];
};

// Create a tool to get stock prices
export const stockPriceTool = createTool({
  id: "getStockPrice",
  description: "Fetches the current stock price for a given ticker symbol",
  inputSchema: z.object({
    symbol: z.string().describe("The stock ticker symbol (e.g., AAPL, MSFT)"),
  }),
  outputSchema: z.object({
    symbol: z.string(),
    price: z.number(),
    currency: z.string(),
    timestamp: z.string(),
  }),
  execute: async ({ context }) => {
    const price = await getStockPrice(context.symbol);

    return {
      symbol: context.symbol,
      price: parseFloat(price),
      currency: "USD",
      timestamp: new Date().toISOString(),
    };
  },
});

// Create a tool that uses the thread context
export const threadInfoTool = createTool({
  id: "getThreadInfo",
  description: "Returns information about the current conversation thread",
  inputSchema: z.object({
    includeResource: z.boolean().optional().default(false),
  }),
  execute: async (context) => {
    return {
      threadId: context.threadId,
      resourceId: context.context.includeResource ? context.resourceId : undefined,
      timestamp: new Date().toISOString(),
    };
  },
});