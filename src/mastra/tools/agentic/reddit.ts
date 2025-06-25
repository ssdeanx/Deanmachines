import { RedditClient } from '@agentic/reddit';
import { aiFunction, AIFunctionsProvider } from "@agentic/core";
import { createMastraTools } from "@agentic/mastra";
import { z } from "zod";
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'reddit', level: 'info' });



/**
 * Schema for a single Reddit post.
 */
export const SubredditPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  score: z.number(),
  url: z.string().optional(),
  permalink: z.string().optional(),
  selftext: z.string().optional(),
  subreddit: z.string().optional(),
  created_utc: z.number().optional(),
  num_comments: z.number().optional(),
  flair: z.string().optional(),
  media: z.unknown().optional(),
  stickied: z.boolean().optional(),
  over_18: z.boolean().optional(),
  // Add more fields as needed
});
export const SubredditPostsSchema = z.array(SubredditPostSchema);

/**
 * Input schema for fetching subreddit posts.
 */
const getSubredditPostsInputSchema = z.object({
  subreddit: z.string(),
  type: z.enum(["hot", "new", "top", "rising"]).default("hot"),
  limit: z.number().int().min(1).max(100).default(10),
});

/**
 * Interface for Reddit API child structure
 */
interface RedditChild {
  data: {
    id: string;
    title: string;
    author: string;
    score: number;
    url?: string;
    permalink?: string;
    selftext?: string;
    subreddit?: string;
    created_utc?: number;
    num_comments?: number;
    flair?: string;
    media?: unknown;
    stickied?: boolean;
    over_18?: boolean;
  };
}

/**
 * Interface for Reddit API listing response
 */
interface RedditListingData {
  children: RedditChild[];
}

/**
 * Interface for Reddit API response
 */
interface RedditApiResponse {
  data?: RedditListingData;
}

/**
 * Mastra-compatible Reddit client with error handling and expanded schema.
 */
export class MastraRedditClient extends AIFunctionsProvider {
  private readonly client: RedditClient;

  constructor() {
    super();
    this.client = new RedditClient();
  }

  /**
   * Fetch posts from a subreddit.
   * @param subreddit The subreddit name.
   * @param type The listing type (hot, new, top, rising).
   * @param limit Number of posts to fetch.
   */
  @aiFunction({
    name: "getSubredditPosts",
    description: "Fetch posts from a subreddit (hot, new, top, or rising).",
    inputSchema: getSubredditPostsInputSchema,
  })
  async getSubredditPosts({
    subreddit,
    type,
    limit,
  }: z.infer<typeof getSubredditPostsInputSchema>) {
    logger.info('Starting Reddit subreddit posts fetch', { 
      subreddit, 
      type, 
      limit 
    });

    try {
      logger.debug('Calling Reddit API', { subreddit, type });
      
      const result = await this.client.getSubredditPosts({ subreddit, type, limit });
      
      // Type-safe extraction of posts from the Reddit API result structure
      const apiResponse = result as unknown as RedditApiResponse;
      const posts = apiResponse.data?.children?.map((child: RedditChild) => child.data) || [];
      
      logger.info('Reddit subreddit posts fetched successfully', { 
        subreddit,
        type,
        postCount: posts.length,
        limit 
      });

      // Return the posts array
      return posts;
    } catch (error: unknown) {
      logger.error('Reddit subreddit posts fetch failed', { 
        subreddit,
        type,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown error fetching subreddit posts.",
      };
    }
  }
}

/**
 * Helper to create Mastra-compatible Reddit tools.
 */
export function createMastraRedditTools() {
  const redditClient = new MastraRedditClient();
  const mastraTools = createMastraTools(redditClient);
  if (mastraTools.getSubredditPosts) {
    (mastraTools.getSubredditPosts as unknown as { outputSchema?: z.ZodSchema }).outputSchema = SubredditPostsSchema;
  }
  return mastraTools;
}

export { createMastraTools };