import type * as wikibase from 'wikibase-sdk'
import { AIFunctionsProvider, assert, getEnv, throttleKy } from '@agentic/core'
import { createMastraTools } from '@agentic/mastra'
import defaultKy, { type KyInstance } from 'ky'
import pThrottle from 'p-throttle'
import wdk from 'wikibase-sdk/wikidata.org'
import { z } from 'zod'

export namespace wikidata {
  // Allow up to 200 requests per second by default.
  export const throttle = pThrottle({
    limit: 200,
    interval: 1000
  })

  export type SimplifiedEntityMap = Record<string, SimplifiedEntity>

  export interface SimplifiedEntity {
    id: string
    type: string
    claims: Claims
    modified: string
    labels?: Descriptions
    descriptions?: Descriptions
    aliases?: any
    sitelinks?: Sitelinks
  }

  export interface Claims {
    [key: string]: Claim[]
  }

  export interface Claim {
    value: string
    qualifiers: Record<string, string[] | number[]>
    references: Record<string, string[]>[]
  }

  export type Descriptions = Record<string, string>
  export type Sitelinks = Record<string, string>
}

/**
 * Output schemas for Wikidata API responses
 */
const WikidataClaimSchema = z.object({
  value: z.string(),
  qualifiers: z.record(z.union([z.array(z.string()), z.array(z.number())])),
  references: z.array(z.record(z.array(z.string())))
});

const WikidataEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  claims: z.record(z.array(WikidataClaimSchema)),
  modified: z.string(),
  labels: z.record(z.string()).optional(),
  descriptions: z.record(z.string()).optional(),
  aliases: z.any().optional(),
  sitelinks: z.record(z.string()).optional()
});

const WikidataEntityMapSchema = z.record(WikidataEntitySchema);

/**
 * Basic Wikidata client.
 *
 * @see https://github.com/maxlath/wikibase-sdk
 *
 * TODO: support any wikibase instance
 */
export class WikidataClient extends AIFunctionsProvider {
  protected readonly ky: KyInstance
  protected readonly apiUserAgent: string

  constructor({
    apiUserAgent = getEnv('WIKIDATA_API_USER_AGENT') ??
      'Agentic (https://github.com/transitive-bullshit/agentic)',
    throttle = true,
    ky = defaultKy
  }: {
    apiBaseUrl?: string
    apiUserAgent?: string
    throttle?: boolean
    ky?: KyInstance
  } = {}) {
    assert(apiUserAgent, 'WikidataClient missing required "apiUserAgent"')
    super()

    this.apiUserAgent = apiUserAgent

    const throttledKy = throttle ? (throttleKy(ky, wikidata.throttle) as typeof ky) : ky

    this.ky = throttledKy.extend({
      headers: {
        'user-agent': apiUserAgent
      }
    })
  }

  async getEntityById(
    idOrOpts: string | { id: string; languages?: string[] }
  ): Promise<wikidata.SimplifiedEntity> {
    const { id, languages = ['en'] } =
      typeof idOrOpts === 'string' ? { id: idOrOpts } : idOrOpts

    const url = wdk.getEntities({
      ids: id as wikibase.EntityId,
      languages
    })

    const res = await this.ky.get(url).json<any>()
    const entities = wdk.simplify.entities(res.entities, {
      // TODO: Make this configurable and double-check defaults.
      keepQualifiers: true,
      keepReferences: true
    })

    const entity = entities[id]
    return entity as wikidata.SimplifiedEntity
  }

  async getEntitiesByIds(
    idsOrOpts: string[] | { ids: string; languages?: string[] }
  ): Promise<wikidata.SimplifiedEntityMap> {
    const { ids, languages = ['en'] } = Array.isArray(idsOrOpts)
      ? { ids: idsOrOpts }
      : idsOrOpts

    // TODO: Separate between wdk.getEntities and wdk.getManyEntities depending
    // on how many `ids` there are.
    const url = wdk.getEntities({
      ids: ids as wikibase.EntityId[],
      languages
    })

    const res = await this.ky.get(url).json<any>()
    const entities = wdk.simplify.entities(res.entities, {
      keepQualifiers: true,
      keepReferences: true
    })

    return entities as wikidata.SimplifiedEntityMap
  }
}

/**
 * Helper function to create a Mastra-compatible Wikidata client
 *
 * @param config - Configuration options for the Wikidata client
 * @returns An array of Mastra-compatible tools
 */
export function createMastraWikidataTools(config: {
  apiBaseUrl?: string;
  apiUserAgent?: string;
  throttle?: boolean;
  ky?: KyInstance;
} = {}) {
  const wikidataClient = new WikidataClient(config);
  const mastraTools = createMastraTools(wikidataClient);
  
  // Patch outputSchema for getEntityById
  if (mastraTools.wikidata_get_entity_by_id) {
    (mastraTools.wikidata_get_entity_by_id as any).outputSchema = WikidataEntitySchema;
  }
  
  // Patch outputSchema for getEntitiesByIds
  if (mastraTools.wikidata_get_entities_by_ids) {
    (mastraTools.wikidata_get_entities_by_ids as any).outputSchema = WikidataEntityMapSchema;
  }
  
  return mastraTools;
}

// Export adapter and schemas for convenience
export { createMastraTools, WikidataEntitySchema, WikidataEntityMapSchema };
