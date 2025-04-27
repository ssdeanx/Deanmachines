import {
  aiFunction,
  AIFunctionsProvider,
  assert,
  getEnv,
  pick,
} from "@agentic/core";
import { notion } from './notion'
import type {
  GetSelfParams,
  GetSelfResponse,
  GetUserParams,
  GetUserResponse,
  ListUsersParams,
  ListUsersResponse,
  GetPageParams,
  GetPageResponse,
  UpdatePageParams,
  UpdatePageResponse,
  CreatePageParams,
  CreatePageResponse,
  GetDatabaseParams,
  GetDatabaseResponse,
  QueryDatabaseParams,
  QueryDatabaseResponse,
  GetBlockParams,
  GetBlockResponse,
  ListBlockChildrenParams,
  ListBlockChildrenResponse,
  AppendBlockChildrenParams,
  AppendBlockChildrenResponse
} from './notionSchema'
import { z } from 'zod'
import defaultKy, { type KyInstance } from 'ky'
import { createMastraTools } from "@agentic/mastra";
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
    apiBaseUrl = notion.apiBaseUrl,
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
    inputSchema: notion.GetSelfParamsSchema
  })
  async getSelf(
    _params: GetSelfParams
  ): Promise<GetSelfResponse> {
    return this.ky.get('/users/me').json<GetSelfResponse>()
  }
  /**
   * Get user.
   */
  @aiFunction({
    name: 'notion_get_user',
    description: `Get user.`,
    inputSchema: notion.GetUserParamsSchema
  })
  async getUser(params: GetUserParams): Promise<GetUserResponse> {
    return this.ky
      .get(`/users/${params.user_id}`)
      .json<GetUserResponse>()
  }
  /**
   * List users.
   */
  @aiFunction({
    name: 'notion_list_users',
    description: `List users.`,
    inputSchema: notion.ListUsersParamsSchema
  })
  async listUsers(
    params: ListUsersParams
  ): Promise<ListUsersResponse> {
    return this.ky
      .get('/users', {
        searchParams: params
      })
      .json<ListUsersResponse>()
  }

  /**
   * Create page.
   */
  @aiFunction({
    name: 'notion_create_page',
    description: `Create page.`,
    inputSchema: CreatePageParamsSchema
  })
  async createPage(
    params: CreatePageParams
  ): Promise<CreatePageResponse> {
    return this.ky
      .post('/pages', {
        json: pick(params, 'parent', 'properties', 'icon', 'cover')
      })
      .json<CreatePageResponse>()
  }
  /**
   * Get page.
   */
  @aiFunction({
    name: 'notion_get_page',
    description: `Get page.`,
    inputSchema: GetPageParamsSchema
  })
  async getPage(params: GetPageParams): Promise<GetPageResponse> {
    return this.ky
      .get(`/pages/${params.page_id}`, {
        searchParams: params
      })
      .json<GetPageResponse>()
  }

  /**
   * Update page.
   */
  @aiFunction({
    name: 'notion_update_page',
    description: `Update page.`,
    inputSchema: UpdatePageParamsSchema
  })
  async updatePage(
    params: UpdatePageParams
  ): Promise<UpdatePageResponse> {
    return this.ky
      .patch(`/pages/${params.page_id}`, {
        json: pick(params, 'properties', 'archived')
      })
      .json<UpdatePageResponse>()
  }

  /**
   * Get page property.
   */
  @aiFunction({
    name: 'notion_get_page_property',
    description: `Get page property.`,
    inputSchema: GetPagePropertyParamsSchema
  })
  async getPageProperty(
    params: notion.GetPagePropertyParams
  ): Promise<notion.GetPagePropertyResponse> {
    return this.ky
      .get(`/pages/${params.page_id}/properties/${params.property_id}`, {
        searchParams: params
      })
      .json<notion.GetPagePropertyResponse>()
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
    params: GetBlockParams
  ): Promise<GetBlockResponse> {
    return this.ky
      .get(`/blocks/${params.block_id}`)
      .json<GetBlockResponse>()
  }

  /**
   * Delete block.
   */
  @aiFunction({
    name: 'notion_delete_block',
    description: `Delete block.`,
    inputSchema: DeleteBlockParamsSchema
  })  async deleteBlock(
    params: GetBlockParams
  ): Promise<GetBlockResponse> {
    return this.ky
      .delete(`/blocks/${params.block_id}`)
      .json<GetBlockResponse>()
  }

  /**
   * Update block.
   */
  @aiFunction({
    name: 'notion_update_block',
    description: `Update block.`,
    inputSchema: UpdateBlockParamsSchema
  })  async updateBlock(    params: notion.UpdateBlockParams  ): Promise<UpdateBlockResponse> {
    return this.ky
      .patch(`/blocks/${params.block_id}`, {
        json: pick(
          params,
          'paragraph',
          'heading_1',
          'heading_2',
          'heading_3',
          'bulleted_list_item',
          'numbered_list_item',
          'quote',
          'to_do',
          'toggle',
          'code',
          'embed',
          'image',
          'video',
          'file',
          'pdf',
          'bookmark',
          'equation',
          'divider',
          'table_of_contents',
          'breadcrumb',
          'column_list',
          'column',
          'link_to_page',
          'table_row',
          'archived'
        )
      })
      .json<UpdateBlockResponse>()
  }  /**
   * List block children.
   */
  @aiFunction({
    name: 'notion_list_block_children',
    description: `List block children.`,
    inputSchema: notion.ListBlockChildrenParamsSchema
  })
  async listBlockChildren(
    params: ListBlockChildrenParams
  ): Promise<ListBlockChildrenResponse> {
    return this.ky
      .get(`/blocks/${params.block_id}/children`, {
        searchParams: pick(params, 'start_cursor', 'page_size')
      })
      .json<ListBlockChildrenResponse>()
  }

  /**
   * Append block children.
   */
  @aiFunction({
    name: 'notion_append_block_children',
    description: `Append block children.`,
    inputSchema: notion.AppendBlockChildrenParamsSchema
  })  async appendBlockChildren(    params: notion.AppendBlockChildrenParams
  ): Promise<notion.AppendBlockChildrenResponse> {
    return this.ky
      .patch(`/blocks/${params.block_id}/children`, {
        json: pick(params, 'children')
      })
      .json<notion.AppendBlockChildrenResponse>()
  }

  /**
   * Get database.
   */
  @aiFunction({
    name: 'notion_get_database',
    description: `Get database.`,
    inputSchema: notion.GetDatabaseParamsSchema
  })
  async getDatabase(
    params: GetDatabaseParams
  ): Promise<GetDatabaseResponse> {
    return this.ky
      .get(`/databases/${params.database_id}`)
      .json<GetDatabaseResponse>()
  }

  /**
   * Update database.
   */
  @aiFunction({
    name: 'notion_update_database',
    description: `Update database.`,
    inputSchema: notion.GetDatabaseParamsSchema
  })
  async updateDatabase(
    params: notion.UpdateDatabaseParams
  ): Promise<notion.UpdateDatabaseResponse> {
    return this.ky
      .patch(`/databases/${params.database_id}`, {
        json: pick(
          params,
          'title',
          'description',
          'icon',
          'cover',
          'properties',
          'is_inline',
          'archived'
        )
      })
      .json<notion.UpdateDatabaseResponse>()
  }
  /**
   * Query database.
   */
  @aiFunction({
    name: 'notion_query_database',
    description: `Query database.`,
    inputSchema: notion.QueryDatabaseParamsSchema
  })
  async queryDatabase(
    params: QueryDatabaseParams
  ): Promise<QueryDatabaseResponse> {
    return this.ky
      .post(`/databases/${params.database_id}/query`, {
        searchParams: pick(params, 'filter_properties'),
        json: pick(
          params,
          'sorts',
          'filter',
          'start_cursor',
          'page_size',
          'archived'
        )
      })
      .json<QueryDatabaseResponse>()
  }
  /**
   * List databases.
   */
  @aiFunction({
    name: 'notion_list_databases',
    description: `List databases.`,
    inputSchema: notion.GetDatabaseParamsSchema
  })
  async listDatabases(
    params: notion.ListDatabasesParams
  ): Promise<notion.ListDatabasesResponse> {
    return this.ky
      .get('/databases', {
        searchParams: pick(params, 'start_cursor', 'page_size')
      })
      .json<notion.ListDatabasesResponse>()
  }

  /**
   * Create database.
   */
  @aiFunction({
    name: 'notion_create_database',
    description: `Create database.`,
    inputSchema: notion.GetDatabaseParamsSchema
  })
  async createDatabase(
    params: notion.CreateDatabaseParams
  ): Promise<notion.CreateDatabaseResponse> {
    return this.ky
      .post('/databases', {
        json: pick(
          params,
          'parent',
          'properties',
          'icon',
          'cover',
          'title',
          'description',
          'is_inline'
        )
      })
      .json<notion.CreateDatabaseResponse>()
  }

  /**
   * Search.
   */
  @aiFunction({
    name: 'notion_search',
    description: `Search.`,
    inputSchema: notion.GetUserParamsSchema
  })
  async search(params: notion.SearchParams): Promise<notion.SearchResponse> {
    return this.ky
      .post('/search', {
        json: pick(
          params,
          'query',
          'sort',
          'filter',
          'start_cursor',
          'page_size'
        )
      })
      .json<notion.SearchResponse>()
  }

  /**
   * List comments.
   */
  @aiFunction({
    name: 'notion_list_comments',
    description: `List comments.`,
    inputSchema: notion.ListUsersParamsSchema
  })
  async listComments(
    params: notion.ListCommentsParams
  ): Promise<notion.ListCommentsResponse> {
    return this.ky
      .get('/comments', {
        searchParams: pick(params, 'block_id', 'start_cursor', 'page_size')
      })
      .json<notion.ListCommentsResponse>()
  }
  /**
   * Create comment.
   */
  @aiFunction({
    name: 'notion_create_comment',
    description: `Create comment.`,
    // TODO: Improve handling of union params
    inputSchema: notion.CreatePageParamsSchema as any
  })  async createComment(
    params: notion.CreateCommentParams
  ): Promise<notion.CreateCommentResponse> {
    return this.ky
      .post('/comments', {
        json: params
      })
      .json<notion.CreateCommentResponse>()
  }

  /**
   * OAuth token.
   */
  @aiFunction({
    name: 'notion_oauth_token',
    description: `OAuth token.`,
    inputSchema: notion.OauthTokenParamsSchema
  })
  async oauthToken(
    params: notion.OauthTokenParams
  ): Promise<notion.OauthTokenResponse> {
    return this.ky
      .post('/oauth/token', {
        json: pick(
          params,
          'grant_type',
          'code',
          'redirect_uri',
          'external_account'
        )
      })
      .json<notion.OauthTokenResponse>()
  }
}
