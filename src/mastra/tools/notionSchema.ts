import { z } from 'zod'

/**
 * Zod schemas and TS types for Notion API endpoints.
 * These schemas must exactly match the shapes that your NotionClient
 * sends and receives, so that Mastra can validate inputs & outputs.
 */

/** -------------------------------------------------------------------------
 * GET /users/me
 * ----------------------------------------------------------------------- */
export const GetSelfParamsSchema = z.object({})
export const GetSelfResponseSchema = z.object({
  object: z.literal('user'),
  id: z.string().uuid(),
  name: z.string().optional(),
  avatar_url: z.string().url().nullable().optional(),
  type: z.union([z.literal('person'), z.literal('bot')]),
  person: z
    .object({
      email: z.string().email(),
    })
    .optional(),
  bot: z
    .object({
      owner: z
        .object({
          type: z.union([z.literal('workspace'), z.literal('user')]),
          workspace: z.boolean().optional(),
          user: z.string().uuid().optional(),
        })
        .optional(),
    })
    .optional(),
})
export type GetSelfParams = z.infer<typeof GetSelfParamsSchema>
export type GetSelfResponse = z.infer<typeof GetSelfResponseSchema>

/** -------------------------------------------------------------------------
 * GET /users/{user_id}
 * ----------------------------------------------------------------------- */
export const GetUserParamsSchema = z.object({
  user_id: z.string().uuid(),
})
export const GetUserResponseSchema = GetSelfResponseSchema
export type GetUserParams = z.infer<typeof GetUserParamsSchema>
export type GetUserResponse = z.infer<typeof GetUserResponseSchema>

/** -------------------------------------------------------------------------
 * GET /users
 * ----------------------------------------------------------------------- */
export const ListUsersParamsSchema = z.object({
  start_cursor: z.string().optional(),
  page_size: z.number().min(1).max(100).optional(),
})
export const ListUsersResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(GetSelfResponseSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
})
export type ListUsersParams = z.infer<typeof ListUsersParamsSchema>
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>

/** -------------------------------------------------------------------------
 * GET /pages/{page_id}
 * ----------------------------------------------------------------------- */
export const GetPageParamsSchema = z.object({
  page_id: z.string().uuid(),
})
export const GetPageResponseSchema = z.object({
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
export type GetPageParams = z.infer<typeof GetPageParamsSchema>
export type GetPageResponse = z.infer<typeof GetPageResponseSchema>

/** -------------------------------------------------------------------------
 * PATCH /pages/{page_id}
 * ----------------------------------------------------------------------- */
export const UpdatePageParamsSchema = z.object({
  page_id: z.string().uuid(),
  properties: z.record(z.any()).optional(),
})
export const UpdatePageResponseSchema = GetPageResponseSchema
export type UpdatePageParams = z.infer<typeof UpdatePageParamsSchema>
export type UpdatePageResponse = z.infer<typeof UpdatePageResponseSchema>

/** -------------------------------------------------------------------------
 * POST /pages
 * ----------------------------------------------------------------------- */
export const CreatePageParamsSchema = z.object({
  parent: z.union([
    z.object({ database_id: z.string().uuid() }),
    z.object({ page_id: z.string().uuid() }),
  ]),
  properties: z.record(z.any()),
  children: z
    .array(
      z.object({
        object: z.literal('block'),
        type: z.string(),
        [z.string()]: z.any(),
      })
    )
    .optional(),
})
export const CreatePageResponseSchema = GetPageResponseSchema
export type CreatePageParams = z.infer<typeof CreatePageParamsSchema>
export type CreatePageResponse = z.infer<typeof CreatePageResponseSchema>

/** -------------------------------------------------------------------------
 * GET /databases/{database_id}
 * ----------------------------------------------------------------------- */
export const GetDatabaseParamsSchema = z.object({
  database_id: z.string().uuid(),
})
export const GetDatabaseResponseSchema = z.object({
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
export type GetDatabaseParams = z.infer<typeof GetDatabaseParamsSchema>
export type GetDatabaseResponse = z.infer<typeof GetDatabaseResponseSchema>

/** -------------------------------------------------------------------------
 * POST /databases/{database_id}/query
 * ----------------------------------------------------------------------- */
export const QueryDatabaseParamsSchema = z.object({
  database_id: z.string().uuid(),
  filter: z.any().optional(),
  sorts: z.array(z.any()).optional(),
  start_cursor: z.string().optional(),
  page_size: z.number().min(1).max(100).optional(),
})
export const QueryDatabaseResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(GetPageResponseSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
})
export type QueryDatabaseParams = z.infer<typeof QueryDatabaseParamsSchema>
export type QueryDatabaseResponse = z.infer<typeof QueryDatabaseResponseSchema>

/** -------------------------------------------------------------------------
 * GET /blocks/{block_id}
 * ----------------------------------------------------------------------- */
export const GetBlockParamsSchema = z.object({
  block_id: z.string().uuid(),
})
export const BlockObjectSchema = z.object({
  object: z.literal('block'),
  id: z.string().uuid(),
  type: z.string(),
  [z.string()]: z.any(),
})
export const GetBlockResponseSchema = BlockObjectSchema
export type GetBlockParams = z.infer<typeof GetBlockParamsSchema>
export type GetBlockResponse = z.infer<typeof GetBlockResponseSchema>

/** -------------------------------------------------------------------------
 * GET /blocks/{block_id}/children
 * ----------------------------------------------------------------------- */
export const ListBlockChildrenParamsSchema = z.object({
  block_id: z.string().uuid(),
  start_cursor: z.string().optional(),
  page_size: z.number().min(1).max(100).optional(),
})
export const ListBlockChildrenResponseSchema = z.object({
  object: z.literal('list'),
  results: z.array(BlockObjectSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
})
export type ListBlockChildrenParams = z.infer<typeof ListBlockChildrenParamsSchema>
export type ListBlockChildrenResponse = z.infer<typeof ListBlockChildrenResponseSchema>

/** -------------------------------------------------------------------------
 * PATCH /blocks/{block_id}/children
 * ----------------------------------------------------------------------- */
export const AppendBlockChildrenParamsSchema = z.object({
  block_id: z.string().uuid(),
  children: z.array(
    z.object({
      object: z.literal('block'),
      type: z.string(),
      [z.string()]: z.any(),
    })
  ),
})
export const AppendBlockChildrenResponseSchema = ListBlockChildrenResponseSchema
export type AppendBlockChildrenParams = z.infer<
  typeof AppendBlockChildrenParamsSchema
>
export type AppendBlockChildrenResponse = z.infer<
  typeof AppendBlockChildrenResponseSchema
>