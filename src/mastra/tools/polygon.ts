import { PolygonClient } from '@agentic/polygon';
import { aiFunction, AIFunctionsProvider, getEnv } from "@agentic/core";
import { createMastraTools } from "@agentic/mastra";
import { z } from "zod";

/**
 * Output schema for Polygon ticker details.
 */
export const TickerDetailsSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  market: z.string(),
  locale: z.string(),
  primary_exchange: z.string().optional(),
  type: z.string().optional(),
  active: z.boolean().optional(),
  currency_name: z.string().optional(),
  cik: z.string().optional(),
  composite_figi: z.string().optional(),
  share_class_figi: z.string().optional(),
  last_updated_utc: z.string().optional(),
}).partial();

/**
 * Output schema for Polygon ticker news.
 */
export const TickerNewsSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    publisher: z.object({
      name: z.string(),
      homepage_url: z.string().optional(),
      logo_url: z.string().optional(),
      favicon_url: z.string().optional(),
    }),
    title: z.string(),
    author: z.string().optional(),
    published_utc: z.string(),
    article_url: z.string(),
    tickers: z.array(z.string()),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    image_url: z.string().optional(),
  })),
  status: z.string(),
  request_id: z.string(),
  count: z.number().optional(),
});

/**
 * Output schema for Polygon aggregates (OHLCV).
 */
export const TickerAggregatesSchema = z.object({
  results: z.array(z.object({
    v: z.number(), // Volume
    vw: z.number(), // Volume weighted
    o: z.number(), // Open
    c: z.number(), // Close
    h: z.number(), // High
    l: z.number(), // Low
    t: z.number(), // Timestamp (ms)
    n: z.number(), // Number of transactions
  })),
  ticker: z.string(),
  status: z.string(),
  queryCount: z.number(),
  resultsCount: z.number(),
  adjusted: z.boolean(),
  request_id: z.string(),
  count: z.number(),
});

/**
 * Output schema for Polygon previous close.
 */
export const PreviousCloseSchema = z.object({
  ticker: z.string(),
  status: z.string(),
  adjusted: z.boolean().optional(),
  queryCount: z.number().optional(),
  resultsCount: z.number().optional(),
  request_id: z.string().optional(),
  results: z.array(z.object({
    v: z.number(), // Volume
    vw: z.number(), // Volume weighted
    o: z.number(), // Open
    c: z.number(), // Close
    h: z.number(), // High
    l: z.number(), // Low
    t: z.number(), // Timestamp (ms)
    n: z.number(), // Number of transactions
  })),
});

/**
 * Output schema for Polygon crypto aggregates (OHLCV).
 */
export const CryptoAggregatesSchema = z.object({
  results: z.array(z.object({
    v: z.number(), // Volume
    vw: z.number(), // Volume weighted
    o: z.number(), // Open
    c: z.number(), // Close
    h: z.number(), // High
    l: z.number(), // Low
    t: z.number(), // Timestamp (ms)
    n: z.number(), // Number of transactions
  })),
  ticker: z.string(),
  status: z.string(),
  queryCount: z.number(),
  resultsCount: z.number(),
  adjusted: z.boolean().optional(),
  request_id: z.string(),
  count: z.number(),
});

/**
 * Output schema for Polygon crypto tickers list.
 */
export const CryptoTickersSchema = z.object({
  results: z.array(z.object({
    ticker: z.string(),
    name: z.string().optional(),
    market: z.string().optional(),
    locale: z.string().optional(),
    active: z.boolean().optional(),
    currency_name: z.string().optional(),
    base_currency_symbol: z.string().optional(),
    base_currency_name: z.string().optional(),
    quote_currency_symbol: z.string().optional(),
    quote_currency_name: z.string().optional(),
    updated_utc: z.string().optional(),
  })),
  status: z.string(),
  request_id: z.string(),
  count: z.number().optional(),
});

/**
 * Output schema for Polygon crypto price (most recent daily close).
 */
export const CryptoPriceSchema = z.object({
  symbol: z.string().describe("The crypto pair symbol (e.g., BTC-USD)"),
  price: z.number().describe("The most recent closing price"),
  volume: z.number().describe("The volume for the day of the closing price"),
  timestamp: z.number().describe("The Unix timestamp (ms) of the closing price bar"),
}).or(z.object({ // Add schema for the error case
  error: z.literal(true),
  message: z.string(),
}));

/**
 * Output schema for Polygon crypto snapshot (all tickers).
 * @deprecated The underlying client does not support this endpoint.
 */
// export const CryptoSnapshotAllSchema = z.object({
//   status: z.string(),
//   tickers: z.array(z.object({
//     ticker: z.string(),
//     day: z.object({
//       o: z.number().optional(),
//       h: z.number().optional(),
//       l: z.number().optional(),
//       c: z.number().optional(),
//       v: z.number().optional(),
//       vw: z.number().optional(),
//     }).optional(),
//     lastTrade: z.object({
//       p: z.number().optional(),
//       s: z.number().optional(),
//       t: z.number().optional(),
//     }).optional(),
//     min: z.object({}).optional(),
//     prevDay: z.object({}).optional(),
//     todaysChange: z.number().optional(),
//     todaysChangePerc: z.number().optional(),
//     updated: z.number().optional(),
//   })),
// });

/**
 * Output schema for Polygon crypto snapshot (single ticker).
 * @deprecated The underlying client does not support this endpoint.
 */
// export const CryptoSnapshotTickerSchema = z.object({
//   status: z.string(),
//   ticker: z.string(),
//   day: z.object({
//     o: z.number().optional(),
//     h: z.number().optional(),
//     l: z.number().optional(),
//     c: z.number().optional(),
//     v: z.number().optional(),
//     vw: z.number().optional(),
//   }).optional(),
//   lastTrade: z.object({
//     p: z.number().optional(),
//     s: z.number().optional(),
//     t: z.number().optional(),
//   }).optional(),
//   min: z.object({}).optional(),
//   prevDay: z.object({}).optional(),
//   todaysChange: z.number().optional(),
//   todaysChangePerc: z.number().optional(),
//   updated: z.number().optional(),
// });

export class MastraPolygonClient extends AIFunctionsProvider {
  private readonly client: PolygonClient;

  constructor({ apiKey }: { apiKey: string }) {
    super();
    if (!apiKey) throw new Error("Polygon API key is required");
    this.client = new PolygonClient({ apiKey });
  }

  @aiFunction({
    name: "tickerDetails",
    description: "Get details for a given stock ticker symbol using Polygon.io.",
    inputSchema: z.object({
      ticker: z.string().describe("The stock ticker symbol (e.g., AAPL, MSFT)")
    }),
  })
  async tickerDetails({ ticker }: { ticker: string }) {
    try {
      const details = await this.client.tickerDetails({ ticker });
      return details;
    } catch (error: any) {
      return {
        error: true,
        message: error?.message || "Unknown error fetching ticker details.",
      };
    }
  }

  @aiFunction({
    name: "tickerNews",
    description: "Get recent news articles for a given stock ticker symbol using Polygon.io.",
    inputSchema: z.object({
      ticker: z.string().describe("The stock ticker symbol (e.g., AAPL, MSFT)"),
      limit: z.number().int().min(1).max(50).default(10).optional(),
    }),
  })
  async tickerNews({ ticker, limit }: { ticker: string; limit?: number }) {
    try {
      const news = await this.client.tickerNews({ ticker, limit });
      return news;
    } catch (error: any) {
      return {
        error: true,
        message: error?.message || "Unknown error fetching ticker news.",
      };
    }
  }

  @aiFunction({
    name: "tickerAggregates",
    description: "Get daily OHLCV (open, high, low, close, volume) aggregates for a ticker and date range.",
    inputSchema: z.object({
      ticker: z.string().describe("The stock ticker symbol (e.g., AAPL, MSFT)"),
      from: z.string().describe("Start date (YYYY-MM-DD)"),
      to: z.string().describe("End date (YYYY-MM-DD)"),
      adjusted: z.boolean().optional().default(true),
      limit: z.number().int().min(1).max(5000).optional(),
    }),
  })
  async tickerAggregates({
    ticker,
    from,
    to,
    adjusted = true,
    limit,
  }: {
    ticker: string;
    from: string;
    to: string;
    adjusted?: boolean;
    limit?: number;
  }) {
    try {
      const aggregates = await this.client.aggregates({
        ticker,
        multiplier: 1,
        timespan: "day",
        from,
        to,
        adjusted,
        limit,
      });
      return aggregates;
    } catch (error: any) {
      return {
        error: true,
        message: error?.message || "Unknown error fetching ticker aggregates.",
      };
    }
  }

  @aiFunction({
    name: "tickerPreviousClose",
    description: "Get the previous day's open, high, low, and close (OHLC) for a given stock ticker symbol using Polygon.io.",
    inputSchema: z.object({
      ticker: z.string().describe("The stock ticker symbol (e.g., AAPL, MSFT)")
    }),
  })
  async tickerPreviousClose({ ticker }: { ticker: string }) {
    try {
      const prevCloseData = await this.client.previousClose(ticker);
      return prevCloseData;
    } catch (error: any) {
      return {
        error: true,
        message: error?.message || "Unknown error fetching ticker price.",
      };
    }
  }

  @aiFunction({
    name: "cryptoAggregates",
    description: "Get daily OHLCV (open, high, low, close, volume) aggregates for a crypto pair and date range.",
    inputSchema: z.object({
      from: z.string().describe("Crypto symbol (e.g., BTC)"),
      to: z.string().describe("Quote currency (e.g., USD)"),
      start: z.string().describe("Start date (YYYY-MM-DD)"),
      end: z.string().describe("End date (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(5000).optional(),
    }),
  })
  async cryptoAggregates({
    from,
    to,
    start,
    end,
    limit,
  }: {
    from: string;
    to: string;
    start: string;
    end: string;
    limit?: number;
  }) {
    try {
      const ticker = `X:${from}${to}`;
      const aggregates = await this.client.aggregates({
        ticker,
        multiplier: 1,
        timespan: "day",
        from: start,
        to: end,
        limit,
      });
      return aggregates;
    } catch (error: any) {
      return {
        error: true,
        message: error?.message || "Unknown error fetching crypto aggregates.",
      };
    }
  }

  @aiFunction({
    name: "cryptoPrice",
    description: "Get the most recent daily closing price for a crypto pair (e.g., BTC-USD) using Polygon.io.",
    inputSchema: z.object({
      from: z.string().describe("Crypto symbol (e.g., BTC)"),
      to: z.string().describe("Quote currency (e.g., USD)"),
    }),
  })
  async cryptoPrice({ from, to }: { from: string; to: string }) {
    try {
      const ticker = `X:${from}${to}`;
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const toDateStr = today.toISOString().split('T')[0];
      const fromDateStr = yesterday.toISOString().split('T')[0];

      // Fetch aggregates for the last 2 days to find the most recent closing price
      const aggregates = await this.client.aggregates({
        ticker,
        multiplier: 1,
        timespan: "day",
        from: fromDateStr,
        to: toDateStr,
        limit: 2, // Get up to two bars (yesterday and today)
      });

      // Find the most recent bar from the results
      const latestBar = aggregates.results?.sort((a, b) => b.t - a.t)[0]; // Sort descending by timestamp

      if (latestBar) {
        return {
          symbol: `${from}-${to}`,
          price: latestBar.c, // Use the closing price
          volume: latestBar.v,
          timestamp: latestBar.t,
        };
      } else {
        return {
          error: true,
          message: `No recent price data found for ${from}-${to}.`,
        };
      }
    } catch (error: any) {
      return {
        error: true,
        message: error?.message || "Unknown error fetching crypto price.",
      };
    }
  }

  @aiFunction({
    name: "cryptoTickers",
    description: "List all supported crypto tickers from Polygon.io.",
    inputSchema: z.object({
      search: z.string().optional().describe("Search query for filtering tickers"),
      limit: z.number().int().min(1).max(1000).optional(),
    }),
  })
  async cryptoTickers({ search, limit }: { search?: string; limit?: number }) {
    try {
      const params: any = { market: "crypto" };
      if (search) params.search = search;
      if (limit) params.limit = limit;
      const result = await this.client.tickers(params);
      return result;
    } catch (error: any) {
      return {
        error: true,
        message: error?.message || "Unknown error fetching crypto tickers.",
      };
    }
  }

  // @aiFunction({
  //   name: "cryptoSnapshotAll",
  //   description: "Get snapshot data for all supported crypto tickers from Polygon.io.",
  //   inputSchema: z.object({}),
  // })
  // async cryptoSnapshotAll() {
  //   try {
  //     // TODO: Implement using direct API call if needed, client doesn't support this.
  //     // const result = await this.client.cryptoSnapshotAll();
  //     // return result;
  //     throw new Error("cryptoSnapshotAll is not implemented in the underlying client.");
  //   } catch (error: any) {
  //     return {
  //       error: true,
  //       message: error?.message || "Unknown error fetching crypto snapshot (all).",
  //     };
  //   }
  // }

  // @aiFunction({
  //   name: "cryptoSnapshotTicker",
  //   description: "Get snapshot data for a single crypto ticker from Polygon.io.",
  //   inputSchema: z.object({
  //     ticker: z.string().describe("The crypto ticker symbol (e.g., X:BTCUSD)"),
  //   }),
  // })
  // async cryptoSnapshotTicker({ ticker }: { ticker: string }) {
  //   try {
  //     // TODO: Implement using direct API call if needed, client doesn't support this.
  //     // const result = await this.client.cryptoSnapshotTicker({ ticker });
  //     // return result;
  //      throw new Error("cryptoSnapshotTicker is not implemented in the underlying client.");
  //   } catch (error: any) {
  //     return {
  //       error: true,
  //       message: error?.message || "Unknown error fetching crypto snapshot (ticker).",
  //     };
  //   }
  // }
}

/**
 * Helper to create Mastra-compatible Polygon tools.
 */
export function createMastraPolygonTools(config: { apiKey?: string } = {}) {
  const apiKey = config.apiKey ?? getEnv("POLYGON_API_KEY");
  if (!apiKey) throw new Error("POLYGON_API_KEY is required in env or config");
  const polygonClient = new MastraPolygonClient({ apiKey });
  const mastraTools = createMastraTools(polygonClient);
  if (mastraTools.tickerDetails) {
    (mastraTools.tickerDetails as any).outputSchema = TickerDetailsSchema;
  }
  if (mastraTools.tickerNews) {
    (mastraTools.tickerNews as any).outputSchema = TickerNewsSchema;
  }
  if (mastraTools.tickerAggregates) {
    (mastraTools.tickerAggregates as any).outputSchema = TickerAggregatesSchema;
  }
  if (mastraTools.cryptoTickers) {
    (mastraTools.cryptoTickers as any).outputSchema = CryptoTickersSchema;
  }
  // if (mastraTools.cryptoSnapshotAll) {
  //   (mastraTools.cryptoSnapshotAll as any).outputSchema = CryptoSnapshotAllSchema;
  //   (mastraTools.cryptoSnapshotTicker as any).outputSchema = CryptoSnapshotTickerSchema;
  // }
  if (mastraTools.tickerPreviousClose) {
    (mastraTools.tickerPreviousClose as any).outputSchema = PreviousCloseSchema;
  }
  if (mastraTools.cryptoAggregates) {
    (mastraTools.cryptoAggregates as any).outputSchema = CryptoAggregatesSchema;
  }
  // Add the output schema for cryptoPrice
  if (mastraTools.cryptoPrice) {
    (mastraTools.cryptoPrice as any).outputSchema = CryptoPriceSchema;
  }
  // Note: cryptoPrice does not have a dedicated schema defined above,
  // but its return type is implicitly defined in the method.
  // If strict output validation is needed, define a schema for it.

  return mastraTools;
}

// Re-export createMastraTools if needed elsewhere, though it's already imported.
// Consider if this re-export is necessary or if direct import is preferred.
export { createMastraTools };