import { RedditClient } from '@agentic/reddit';
import { aiFunction, AIFunctionsProvider } from "@agentic/core";
import { createMastraTools } from "@agentic/mastra";
import { z } from "zod";

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
  media: z.any().optional(),
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
    try {
      const posts = await this.client.getSubredditPosts({ subreddit, type, limit });
      // Optionally: map/validate posts to match the schema exactly
      return posts;
    } catch (error: any) {
      return {
        error: true,
        message: error?.message || "Unknown error fetching subreddit posts.",
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
    (mastraTools.getSubredditPosts as any).outputSchema = SubredditPostsSchema;
  }
  return mastraTools;
}

export { createMastraTools };