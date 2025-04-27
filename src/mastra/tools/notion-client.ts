import {
  aiFunction,
  AIFunctionsProvider,
  assert,
  getEnv,
  pick,
  sanitizeSearchParams,
  AIFunctionSet,
} from "@agentic/core";
import {
  UserObjectSchema,
  UserObject,
  ListUsersResponseSchema,
  ListUsersResponse,
  PageObjectSchema,
  PageObject,
  DatabaseObjectSchema,
  DatabaseObject,
  QueryDatabaseResponseSchema,
  QueryDatabaseResponse,
  BlockObjectSchema,
  BlockObject,
  ListBlockChildrenResponseSchema,
  ListBlockChildrenResponse,
  AppendBlockChildrenResponseSchema,
  AppendBlockChildrenResponse,
  CreatePageResponseSchema,
  UpdatePageResponseSchema,
  SearchResponseSchema,
  ListDatabasesResponseSchema,
  CreatePageResponse,
  UpdatePageResponse,
  SearchResponse,
  ListDatabasesResponse,
  CreateDatabaseResponseSchema,
  UpdateDatabaseResponseSchema,
  DeleteBlockResponseSchema,
  UpdateBlockResponseSchema,
  GetPagePropertyResponseSchema,
  ListCommentsResponseSchema,
  CreateCommentResponseSchema,
  CreateDatabaseResponse,
  UpdateDatabaseResponse,
  DeleteBlockResponse,
  UpdateBlockResponse,
  GetPagePropertyResponse,
  ListCommentsResponse,
  CreateCommentResponse,
} from './notionSchema'
import {
  GetSelfParamsSchema,
  GetUserParamsSchema,
  ListUsersParamsSchema,
  GetPageParamsSchema,
  GetDatabaseParamsSchema,
  QueryDatabaseParamsSchema,
  GetBlockParamsSchema,
  ListBlockChildrenParamsSchema,
  AppendBlockChildrenParamsSchema,
  CreatePageParamsSchema,
  UpdatePageParamsSchema,
  SearchParamsSchema,
  ListDatabasesParamsSchema,
  CreateDatabaseParamsSchema,
  UpdateDatabaseParamsSchema,
  DeleteBlockParamsSchema,
  UpdateBlockParamsSchema,
  GetPagePropertyParamsSchema,
  ListCommentsParamsSchema,
  CreateCommentParamsSchema,
} from './notion'
import { z } from 'zod'
import defaultKy, { type KyInstance } from 'ky'
import { createMastraTools } from "@agentic/mastra";
import { createAISDKTools } from "./ai-sdk";
import { createGenkitTools } from "./genkit";
import type { Genkit } from "genkit";

/**
 * A Mastra‐compatible Notion client that exposes each endpoint
 * as an @aiFunction.  Register via createMastraTools().
 */
export class NotionClient extends AIFunctionsProvider {
  protected readonly ky: KyInstance
  protected readonly apiKey: string
  protected readonly apiBaseUrl: string

  constructor({
    apiKey = getEnv('NOTION_API_KEY'),
    apiBaseUrl = 'https://api.notion.com/v1',
    ky = defaultKy
  }: {
    apiKey?: string
    apiBaseUrl?: string
    ky?: KyInstance
  } = {}) {
    assert(
      apiKey,
      'NotionClient missing required "apiKey" (defaults to "NOTION_API_KEY")'
    )
    super()

    this.apiKey = apiKey
    this.apiBaseUrl = apiBaseUrl

    this.ky = ky.extend({
      prefixUrl: apiBaseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
  }

  /**
   * Get current user.
   */
  @aiFunction({
    name: 'notion_get_self',
    description: `Get current user.`,
    inputSchema: GetSelfParamsSchema
  })
  async getSelf(): Promise<z.infer<typeof UserObjectSchema>> {
    return this.ky.get('/users/me').json<z.infer<typeof UserObjectSchema>>()
  }

  /**
   * Get user.
   */
  @aiFunction({
    name: 'notion_get_user',
    description: `Get user.`,
    inputSchema: GetUserParamsSchema
  })
  async getUser(params: z.infer<typeof GetUserParamsSchema>): Promise<z.infer<typeof UserObjectSchema>> {
    return this.ky
      .get(`/users/${params.user_id}`)
      .json<z.infer<typeof UserObjectSchema>>()
  }

  /**
   * List users.
   */
  @aiFunction({
    name: 'notion_list_users',
    description: `List users.`,
    inputSchema: ListUsersParamsSchema
  })
  async listUsers(
    params: z.infer<typeof ListUsersParamsSchema>
  ): Promise<z.infer<typeof ListUsersResponseSchema>> {
    return this.ky
      .get('/users', {
        searchParams: sanitizeSearchParams(pick(params, 'start_cursor', 'page_size'))
      })
      .json<z.infer<typeof ListUsersResponseSchema>>()
  }

  /**
   * Get page.
   */
  @aiFunction({
    name: 'notion_get_page',
    description: `Get page.`,
    inputSchema: GetPageParamsSchema
  })
  async getPage(params: z.infer<typeof GetPageParamsSchema>): Promise<z.infer<typeof PageObjectSchema>> {
    return this.ky
      .get(`/pages/${params.page_id}`, {
        searchParams: sanitizeSearchParams(pick(params, 'filter_properties'))
      })
      .json<z.infer<typeof PageObjectSchema>>()
  }

  /**
   * Get database.
   */
  @aiFunction({
    name: 'notion_get_database',
    description: `Get database.`,
    inputSchema: GetDatabaseParamsSchema
  })
  async getDatabase(
    params: z.infer<typeof GetDatabaseParamsSchema>
  ): Promise<z.infer<typeof DatabaseObjectSchema>> {
    return this.ky
      .get(`/databases/${params.database_id}`)
      .json<z.infer<typeof DatabaseObjectSchema>>()
  }

  /**
   * Query database.
   */
  @aiFunction({
    name: 'notion_query_database',
    description: `Query database.`,
    inputSchema: QueryDatabaseParamsSchema
  })
  async queryDatabase(
    params: z.infer<typeof QueryDatabaseParamsSchema>
  ): Promise<z.infer<typeof QueryDatabaseResponseSchema>> {
    return this.ky
      .post(`/databases/${params.database_id}/query`, {
        searchParams: sanitizeSearchParams(pick(params, 'filter_properties')),
        json: pick(
          params,
          'sorts',
          'filter',
          'start_cursor',
          'page_size',
          'archived'
        )
      })
      .json<z.infer<typeof QueryDatabaseResponseSchema>>()
  }

  /**
   * Get block.
   */
  @aiFunction({
    name: 'notion_get_block',
    description: `Get block.`,
    inputSchema: GetBlockParamsSchema
  })
  async getBlock(
    params: z.infer<typeof GetBlockParamsSchema>
  ): Promise<z.infer<typeof BlockObjectSchema>> {
    return this.ky
      .get(`/blocks/${params.block_id}`)
      .json<z.infer<typeof BlockObjectSchema>>()
  }

  /**
   * List block children.
   */
  @aiFunction({
    name: 'notion_list_block_children',
    description: `List block children.`,
    inputSchema: ListBlockChildrenParamsSchema
  })
  async listBlockChildren(
    params: z.infer<typeof ListBlockChildrenParamsSchema>
  ): Promise<z.infer<typeof ListBlockChildrenResponseSchema>> {
    return this.ky
      .get(`/blocks/${params.block_id}/children`, {
        searchParams: sanitizeSearchParams(pick(params, 'start_cursor', 'page_size'))
      })
      .json<z.infer<typeof ListBlockChildrenResponseSchema>>()
  }

  /**
   * Append block children.
   */
  @aiFunction({
    name: 'notion_append_block_children',
    description: `Append block children.`,
    inputSchema: AppendBlockChildrenParamsSchema
  })
  async appendBlockChildren(
    params: z.infer<typeof AppendBlockChildrenParamsSchema>
  ): Promise<z.infer<typeof AppendBlockChildrenResponseSchema>> {
    return this.ky
      .patch(`/blocks/${params.block_id}/children`, {
        json: pick(params, 'children')
      })
      .json<z.infer<typeof AppendBlockChildrenResponseSchema>>()
  }

  /**
   * Create page.
   */
  @aiFunction({
    name: 'notion_create_page',
    description: `Create a new Notion page.`,
    inputSchema: CreatePageParamsSchema
  })
  async createPage(params: z.infer<typeof CreatePageParamsSchema>): Promise<z.infer<typeof CreatePageResponseSchema>> {
    return this.ky
      .post('/pages', { json: pick(params, 'parent', 'properties', 'children') })
      .json<z.infer<typeof CreatePageResponseSchema>>();
  }

  /**
   * Update page.
   */
  @aiFunction({
    name: 'notion_update_page',
    description: `Update a Notion page's properties.`,
    inputSchema: UpdatePageParamsSchema
  })
  async updatePage(params: z.infer<typeof UpdatePageParamsSchema>): Promise<z.infer<typeof UpdatePageResponseSchema>> {
    return this.ky
      .patch(`/pages/${params.page_id}`, { json: pick(params, 'properties', 'archived') })
      .json<z.infer<typeof UpdatePageResponseSchema>>();
  }

  /**
   * Search.
   */
  @aiFunction({
    name: 'notion_search',
    description: `Search across all Notion pages and databases.`,
    inputSchema: SearchParamsSchema
  })
  async search(params: z.infer<typeof SearchParamsSchema>): Promise<z.infer<typeof SearchResponseSchema>> {
    return this.ky
      .post('/search', { json: pick(params, 'query', 'sort', 'filter', 'start_cursor', 'page_size') })
      .json<z.infer<typeof SearchResponseSchema>>();
  }

  /**
   * List databases.
   */
  @aiFunction({
    name: 'notion_list_databases',
    description: `List all databases in the workspace.`,
    inputSchema: ListDatabasesParamsSchema
  })
  async listDatabases(params: z.infer<typeof ListDatabasesParamsSchema>): Promise<z.infer<typeof ListDatabasesResponseSchema>> {
    return this.ky
      .get('/databases', {
        searchParams: sanitizeSearchParams(pick(params, 'start_cursor', 'page_size'))
      })
      .json<z.infer<typeof ListDatabasesResponseSchema>>();
  }

  /**
   * Create database.
   */
  @aiFunction({
    name: 'notion_create_database',
    description: `Create a new Notion database.`,
    inputSchema: CreateDatabaseParamsSchema
  })
  async createDatabase(params: z.infer<typeof CreateDatabaseParamsSchema>): Promise<z.infer<typeof CreateDatabaseResponseSchema>> {
    return this.ky
      .post('/databases', { json: pick(params, 'parent', 'properties', 'icon', 'cover', 'title', 'description', 'is_inline') })
      .json<z.infer<typeof CreateDatabaseResponseSchema>>();
  }

  /**
   * Update database.
   */
  @aiFunction({
    name: 'notion_update_database',
    description: `Update a Notion database.`,
    inputSchema: UpdateDatabaseParamsSchema
  })
  async updateDatabase(params: z.infer<typeof UpdateDatabaseParamsSchema>): Promise<z.infer<typeof UpdateDatabaseResponseSchema>> {
    return this.ky
      .patch(`/databases/${params.database_id}`, { json: pick(params, 'title', 'description', 'icon', 'cover', 'properties', 'is_inline', 'archived') })
      .json<z.infer<typeof UpdateDatabaseResponseSchema>>();
  }

  /**
   * Delete block.
   */
  @aiFunction({
    name: 'notion_delete_block',
    description: `Delete a Notion block.`,
    inputSchema: DeleteBlockParamsSchema
  })
  async deleteBlock(params: z.infer<typeof DeleteBlockParamsSchema>): Promise<z.infer<typeof DeleteBlockResponseSchema>> {
    return this.ky
      .delete(`/blocks/${params.block_id}`)
      .json<z.infer<typeof DeleteBlockResponseSchema>>();
  }

  /**
   * Update block.
   */
  @aiFunction({
    name: 'notion_update_block',
    description: `Update a Notion block.`,
    inputSchema: UpdateBlockParamsSchema
  })
  async updateBlock(params: z.infer<typeof UpdateBlockParamsSchema>): Promise<z.infer<typeof UpdateBlockResponseSchema>> {
    return this.ky
      .patch(`/blocks/${params.block_id}`, { json: params })
      .json<z.infer<typeof UpdateBlockResponseSchema>>();
  }

  /**
   * Get page property.
   */
  @aiFunction({
    name: 'notion_get_page_property',
    description: `Get a property value from a Notion page.`,
    inputSchema: GetPagePropertyParamsSchema
  })
  async getPageProperty(params: z.infer<typeof GetPagePropertyParamsSchema>): Promise<z.infer<typeof GetPagePropertyResponseSchema>> {
    return this.ky
      .get(`/pages/${params.page_id}/properties/${params.property_id}`, {
        searchParams: sanitizeSearchParams(pick(params, 'start_cursor', 'page_size'))
      })
      .json<z.infer<typeof GetPagePropertyResponseSchema>>();
  }

  /**
   * List comments.
   */
  @aiFunction({
    name: 'notion_list_comments',
    description: `List comments for a Notion block.`,
    inputSchema: ListCommentsParamsSchema
  })
  async listComments(params: z.infer<typeof ListCommentsParamsSchema>): Promise<z.infer<typeof ListCommentsResponseSchema>> {
    return this.ky
      .get('/comments', {
        searchParams: sanitizeSearchParams(pick(params, 'block_id', 'start_cursor', 'page_size'))
      })
      .json<z.infer<typeof ListCommentsResponseSchema>>();
  }

  /**
   * Create comment.
   */
  @aiFunction({
    name: 'notion_create_comment',
    description: `Create a comment on a Notion page or block.`,
    inputSchema: CreateCommentParamsSchema
  })
  async createComment(params: z.infer<typeof CreateCommentParamsSchema>): Promise<z.infer<typeof CreateCommentResponseSchema>> {
    return this.ky
      .post('/comments', { json: params })
      .json<z.infer<typeof CreateCommentResponseSchema>>();
  }

  /**
   * OAuth token.
   */
  @aiFunction({
    name: 'notion_oauth_token',
    description: `OAuth token.`,
    inputSchema: z.object({
      grant_type: z.string(),
      code: z.string(),
      redirect_uri: z.string(),
      external_account: z.any().optional()
    })
  })
  async oauthToken(
    params: { grant_type: string; code: string; redirect_uri: string; external_account?: any }
  ): Promise<any> {
    // Fix: pick expects the first argument to be an object, and the rest as string keys
    // If params is an object, this is correct:
    return this.ky
      .post('/oauth/token', {
        json: pick(params, 'grant_type', 'code', 'redirect_uri', 'external_account')
      })
      .json<any>()
  }
}
/**
 * Helper to create Mastra-compatible Notion tools.
 */
export function createMastraNotionTools(config: { apiKey?: string } = {}) {
  const apiKey = config.apiKey ?? getEnv("NOTION_API_KEY");
  if (!apiKey) throw new Error("NOTION_API_KEY is required in env or config");
  const notionClient = new NotionClient({ apiKey });
  // Always extract functions from the client using Array.from
  const fns = Array.from(notionClient.functions);
  const mastraTools = createMastraTools(...fns);

  // Patch outputSchema for each tool (Mastra expects this pattern)
  if (mastraTools.notion_get_self) {
    (mastraTools.notion_get_self as any).outputSchema = UserObjectSchema;
  }
  if (mastraTools.notion_get_user) {
    (mastraTools.notion_get_user as any).outputSchema = UserObjectSchema;
  }
  if (mastraTools.notion_list_users) {
    (mastraTools.notion_list_users as any).outputSchema = ListUsersResponseSchema;
  }
  if (mastraTools.notion_get_page) {
    (mastraTools.notion_get_page as any).outputSchema = PageObjectSchema;
  }
  if (mastraTools.notion_get_database) {
    (mastraTools.notion_get_database as any).outputSchema = DatabaseObjectSchema;
  }
  if (mastraTools.notion_query_database) {
    (mastraTools.notion_query_database as any).outputSchema = QueryDatabaseResponseSchema;
  }
  if (mastraTools.notion_get_block) {
    (mastraTools.notion_get_block as any).outputSchema = BlockObjectSchema;
  }
  if (mastraTools.notion_list_block_children) {
    (mastraTools.notion_list_block_children as any).outputSchema = ListBlockChildrenResponseSchema;
  }
  if (mastraTools.notion_append_block_children) {
    (mastraTools.notion_append_block_children as any).outputSchema = AppendBlockChildrenResponseSchema;
  }
  if (mastraTools.notion_create_page) {
    (mastraTools.notion_create_page as any).outputSchema = CreatePageResponseSchema;
  }
  if (mastraTools.notion_update_page) {
    (mastraTools.notion_update_page as any).outputSchema = UpdatePageResponseSchema;
  }
  if (mastraTools.notion_search) {
    (mastraTools.notion_search as any).outputSchema = SearchResponseSchema;
  }
  if (mastraTools.notion_list_databases) {
    (mastraTools.notion_list_databases as any).outputSchema = ListDatabasesResponseSchema;
  }
  if (mastraTools.notion_create_database) {
    (mastraTools.notion_create_database as any).outputSchema = CreateDatabaseResponseSchema;
  }
  if (mastraTools.notion_update_database) {
    (mastraTools.notion_update_database as any).outputSchema = UpdateDatabaseResponseSchema;
  }
  if (mastraTools.notion_delete_block) {
    (mastraTools.notion_delete_block as any).outputSchema = DeleteBlockResponseSchema;
  }
  if (mastraTools.notion_update_block) {
    (mastraTools.notion_update_block as any).outputSchema = UpdateBlockResponseSchema;
  }
  if (mastraTools.notion_get_page_property) {
    (mastraTools.notion_get_page_property as any).outputSchema = GetPagePropertyResponseSchema;
  }
  if (mastraTools.notion_list_comments) {
    (mastraTools.notion_list_comments as any).outputSchema = ListCommentsResponseSchema;
  }
  if (mastraTools.notion_create_comment) {
    (mastraTools.notion_create_comment as any).outputSchema = CreateCommentResponseSchema;
  }
  if (mastraTools.notion_oauth_token) {
    (mastraTools.notion_oauth_token as any).outputSchema = z.any();
  }
  return mastraTools;
}

// Export adapter for convenience
export { createMastraTools };

export function createAISDKNotionTools(config: { apiKey?: string } = {}) {
  const apiKey = config.apiKey ?? getEnv("NOTION_API_KEY");
  if (!apiKey) throw new Error("NOTION_API_KEY is required");
  const client = new NotionClient({ apiKey });
  // Always extract functions from the client using Array.from
  const fns = Array.from(client.functions);
  return createAISDKTools(...fns);
}

export function createGenkitNotionTools(genkit: Genkit, config: { apiKey?: string } = {}) {
  const apiKey = config.apiKey ?? getEnv("NOTION_API_KEY");
  if (!apiKey) throw new Error("NOTION_API_KEY is required");
  const client = new NotionClient({ apiKey });
  // Always extract functions from the client using Array.from
  const fns = Array.from(client.functions);
  return createGenkitTools(genkit, ...fns);
}
