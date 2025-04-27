import { z } from 'zod'

/**
 * Zod schemas and TS types for Notion API *input* (request) shapes.
 * These must match the inputs accepted by NotionClient methods.
 */

// Get current user (no input)
export const GetSelfParamsSchema = z.object({})
export type GetSelfParams = z.infer<typeof GetSelfParamsSchema>

// Get user
export const GetUserParamsSchema = z.object({
  user_id: z.string().uuid(),
})
export type GetUserParams = z.infer<typeof GetUserParamsSchema>

// List users
export const ListUsersParamsSchema = z.object({
  start_cursor: z.string().optional(),
  page_size: z.number().min(1).max(100).optional(),
})
export type ListUsersParams = z.infer<typeof ListUsersParamsSchema>

// Get page (add filter_properties)
export const GetPageParamsSchema = z.object({
  page_id: z.string().uuid(),
  filter_properties: z.any().optional(),
})
export type GetPageParams = z.infer<typeof GetPageParamsSchema>

// Get database
export const GetDatabaseParamsSchema = z.object({
  database_id: z.string().uuid(),
})
export type GetDatabaseParams = z.infer<typeof GetDatabaseParamsSchema>

// Query database (add filter_properties, archived)
export const QueryDatabaseParamsSchema = z.object({
  database_id: z.string().uuid(),
  filter: z.any().optional(),
  sorts: z.array(z.any()).optional(),
  start_cursor: z.string().optional(),
  page_size: z.number().min(1).max(100).optional(),
  filter_properties: z.any().optional(),
  archived: z.boolean().optional(),
})
export type QueryDatabaseParams = z.infer<typeof QueryDatabaseParamsSchema>

// Get block
export const GetBlockParamsSchema = z.object({
  block_id: z.string().uuid(),
})
export type GetBlockParams = z.infer<typeof GetBlockParamsSchema>

// List block children
export const ListBlockChildrenParamsSchema = z.object({
  block_id: z.string().uuid(),
  start_cursor: z.string().optional(),
  page_size: z.number().min(1).max(100).optional(),
})
export type ListBlockChildrenParams = z.infer<typeof ListBlockChildrenParamsSchema>

// Append block children
export const AppendBlockChildrenParamsSchema = z.object({
  block_id: z.string().uuid(),
  children: z.array(z.any()),
})
export type AppendBlockChildrenParams = z.infer<typeof AppendBlockChildrenParamsSchema>

// Create page (add children)
export const CreatePageParamsSchema = z.object({
  parent: z.union([
    z.object({ database_id: z.string().uuid() }),
    z.object({ page_id: z.string().uuid() }),
  ]),
  properties: z.record(z.any()),
  children: z.array(z.any()).optional(),
})
export type CreatePageParams = z.infer<typeof CreatePageParamsSchema>

// Update page (add archived)
export const UpdatePageParamsSchema = z.object({
  page_id: z.string().uuid(),
  properties: z.record(z.any()).optional(),
  archived: z.boolean().optional(),
})
export type UpdatePageParams = z.infer<typeof UpdatePageParamsSchema>

// Search
export const SearchParamsSchema = z.object({
  query: z.string().optional(),
  sort: z.object({
    direction: z.enum(['ascending', 'descending']),
    timestamp: z.literal('last_edited_time'),
  }).optional(),
  filter: z.object({
    value: z.enum(['page', 'database']),
    property: z.literal('object'),
  }).optional(),
  start_cursor: z.string().optional(),
  page_size: z.number().min(1).max(100).optional(),
})
export type SearchParams = z.infer<typeof SearchParamsSchema>

// List databases
export const ListDatabasesParamsSchema = z.object({
  start_cursor: z.string().optional(),
  page_size: z.number().min(1).max(100).optional(),
})
export type ListDatabasesParams = z.infer<typeof ListDatabasesParamsSchema>

// Create database (add all creatable fields)
export const CreateDatabaseParamsSchema = z.object({
  parent: z.union([
    z.object({ type: z.literal('page_id'), page_id: z.string().uuid() }),
    z.object({ type: z.literal('workspace'), workspace: z.literal(true) }),
  ]),
  title: z.array(z.any()),
  properties: z.record(z.any()),
  icon: z.any().optional(),
  cover: z.any().optional(),
  description: z.any().optional(),
  is_inline: z.boolean().optional(),
})
export type CreateDatabaseParams = z.infer<typeof CreateDatabaseParamsSchema>

// Update database (add all patchable fields)
export const UpdateDatabaseParamsSchema = z.object({
  database_id: z.string().uuid(),
  title: z.array(z.any()).optional(),
  description: z.any().optional(),
  icon: z.any().optional(),
  cover: z.any().optional(),
  properties: z.record(z.any()).optional(),
  is_inline: z.boolean().optional(),
  archived: z.boolean().optional(),
})
export type UpdateDatabaseParams = z.infer<typeof UpdateDatabaseParamsSchema>

// Delete block
export const DeleteBlockParamsSchema = z.object({
  block_id: z.string().uuid(),
})
export type DeleteBlockParams = z.infer<typeof DeleteBlockParamsSchema>

// Update block
export const UpdateBlockParamsSchema = z.object({
  block_id: z.string().uuid(),
  // Block-specific fields (e.g. paragraph, heading_1, etc.) are dynamic
  // For now, allow any
}).catchall(z.any())
export type UpdateBlockParams = z.infer<typeof UpdateBlockParamsSchema>

// Get page property (add start_cursor, page_size)
export const GetPagePropertyParamsSchema = z.object({
  page_id: z.string().uuid(),
  property_id: z.string().uuid(),
  start_cursor: z.string().optional(),
  page_size: z.number().min(1).max(100).optional(),
})
export type GetPagePropertyParams = z.infer<typeof GetPagePropertyParamsSchema>

// List comments
export const ListCommentsParamsSchema = z.object({
  block_id: z.string().uuid(),
  start_cursor: z.string().optional(),
  page_size: z.number().min(1).max(100).optional(),
})
export type ListCommentsParams = z.infer<typeof ListCommentsParamsSchema>

// Create comment
export const CreateCommentParamsSchema = z.object({
  parent: z.object({
    page_id: z.string().uuid(),
  }).or(z.object({
    block_id: z.string().uuid(),
  })),
  rich_text: z.array(z.any()),
})
export type CreateCommentParams = z.infer<typeof CreateCommentParamsSchema>

// OAuth token
export const OauthTokenParamsSchema = z.object({
  grant_type: z.string(),
  code: z.string(),
  redirect_uri: z.string(),
  external_account: z.any().optional(),
})
export type OauthTokenParams = z.infer<typeof OauthTokenParamsSchema>
