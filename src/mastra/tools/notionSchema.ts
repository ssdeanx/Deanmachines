import { z } from 'zod'

/**
 * Zod schemas and TS types for Notion API *output* (response) shapes.
 * These must match the outputs returned by NotionClient methods.
 */

// User object (used for /users/me, /users/{user_id}, /users)
export const UserObjectSchema = z.object({
  object: z.literal('user'),
  id: z.string().uuid(),
  name: z.string().optional(),
  avatar_url: z.string().url().nullable().optional(),
  type: z.union([z.literal('person'), z.literal('bot')]),
  person: z.object({
    email: z.string().email(),
  }).optional(),
  bot: z.object({
    owner: z.object({
      type: z.union([z.literal('workspace'), z.literal('user')]),
      workspace: z.boolean().optional(),
      user: z.string().uuid().optional(),
    }).optional(),
  }).optional(),
})
export type UserObject = z.infer<typeof UserObjectSchema>

// List users response
export const ListUsersResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(UserObjectSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
})
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>

// Page object (used for /pages/{page_id}, create/update page, query database)
export const PageObjectSchema = z.object({
  object: z.literal('page'),
  id: z.string().uuid(),
  created_time: z.string(),
  last_edited_time: z.string(),
  parent: z.union([
    z.object({ database_id: z.string().uuid(), type: z.literal('database_id') }),
    z.object({ page_id: z.string().uuid(), type: z.literal('page_id') }),
  ]),
  properties: z.record(z.any()),
  url: z.string().url(),
})
export type PageObject = z.infer<typeof PageObjectSchema>

// Create page response (same as PageObjectSchema)
export const CreatePageResponseSchema = PageObjectSchema;
export type CreatePageResponse = z.infer<typeof CreatePageResponseSchema>;

// Update page response (same as PageObjectSchema)
export const UpdatePageResponseSchema = PageObjectSchema;
export type UpdatePageResponse = z.infer<typeof UpdatePageResponseSchema>;

// Database object (used for /databases/{database_id}, create/update database)
export const DatabaseObjectSchema = z.object({
  object: z.literal('database'),
  id: z.string().uuid(),
  created_time: z.string(),
  last_edited_time: z.string(),
  title: z.array(
    z.object({
      type: z.literal('text'),
      text: z.object({ content: z.string(), link: z.string().url().nullable() }),
      annotations: z.any(),
      plain_text: z.string(),
      href: z.string().url().nullable(),
    })
  ),
  properties: z.record(z.any()),
})
export type DatabaseObject = z.infer<typeof DatabaseObjectSchema>

// Database create/update response (same as DatabaseObjectSchema)
export const CreateDatabaseResponseSchema = DatabaseObjectSchema;
export type CreateDatabaseResponse = z.infer<typeof CreateDatabaseResponseSchema>;
export const UpdateDatabaseResponseSchema = DatabaseObjectSchema;
export type UpdateDatabaseResponse = z.infer<typeof UpdateDatabaseResponseSchema>;

// Query database response (POST /databases/{database_id}/query)
export const QueryDatabaseResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(PageObjectSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
})
export type QueryDatabaseResponse = z.infer<typeof QueryDatabaseResponseSchema>

// Search response
export const SearchResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(
    z.union([PageObjectSchema, DatabaseObjectSchema])
  ),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// List databases response
export const ListDatabasesResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(DatabaseObjectSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});
export type ListDatabasesResponse = z.infer<typeof ListDatabasesResponseSchema>;

// Block object (used for /blocks/{block_id}, block children)
export const BlockObjectSchema = z.object({
  object: z.literal('block'),
  id: z.string().uuid(),
  type: z.string(),
  // All other block-specific fields are dynamic
}).catchall(z.any())
export type BlockObject = z.infer<typeof BlockObjectSchema>

// Delete block response (same as BlockObjectSchema)
export const DeleteBlockResponseSchema = BlockObjectSchema;
export type DeleteBlockResponse = z.infer<typeof DeleteBlockResponseSchema>;

// Update block response (same as BlockObjectSchema)
export const UpdateBlockResponseSchema = BlockObjectSchema;
export type UpdateBlockResponse = z.infer<typeof UpdateBlockResponseSchema>;

// List block children response (GET /blocks/{block_id}/children)
export const ListBlockChildrenResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(BlockObjectSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
})
export type ListBlockChildrenResponse = z.infer<typeof ListBlockChildrenResponseSchema>

// Append block children response (PATCH /blocks/{block_id}/children)
export const AppendBlockChildrenResponseSchema = ListBlockChildrenResponseSchema
export type AppendBlockChildrenResponse = z.infer<typeof AppendBlockChildrenResponseSchema>

// Get page property response (dynamic, so use z.any())
export const GetPagePropertyResponseSchema = z.any();
export type GetPagePropertyResponse = z.infer<typeof GetPagePropertyResponseSchema>;

// Comment object
export const CommentObjectSchema = z.object({
  object: z.literal('comment'),
  id: z.string().uuid(),
  parent: z.any(),
  discussion_id: z.string(),
  rich_text: z.array(z.any()),
  created_by: z.any(),
  created_time: z.string(),
  last_edited_time: z.string(),
});
export type CommentObject = z.infer<typeof CommentObjectSchema>;

// List comments response
export const ListCommentsResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(CommentObjectSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});
export type ListCommentsResponse = z.infer<typeof ListCommentsResponseSchema>;

// Create comment response (same as CommentObjectSchema)
export const CreateCommentResponseSchema = CommentObjectSchema;
export type CreateCommentResponse = z.infer<typeof CreateCommentResponseSchema>;

// OAuth token response (generic, as Notion returns a token object)
export const OauthTokenResponseSchema = z.any();
export type OauthTokenResponse = z.infer<typeof OauthTokenResponseSchema>;