import {
  aiFunction,
  AIFunctionsProvider,
  assert,
  getEnv,
  omit
} from '@agentic/core'
import defaultKy, { type KyInstance } from 'ky'
import { z } from 'zod'
import { createMastraTools } from "@agentic/mastra";


export const BING_API_BASE_URL = 'https://api.bing.microsoft.com';

export interface BingSearchQuery {
  q: string;
  mkt?: string;
  offset?: number;
  count?: number;
  safeSearch?: 'Off' | 'Moderate' | 'Strict';
  textDecorations?: boolean;
  textFormat?: 'Raw' | 'HTML';
}

export interface BingSearchResponse {
  _type: string;
  entities: Entities;
  images: Images;
  places: Places;
  queryContext: QueryContext;
  rankingResponse: RankingResponse;
  relatedSearches: RelatedSearches;
  videos: Videos;
  webPages: WebPages;
}

export interface Entities {
  value: EntitiesValue[];
}

export interface EntitiesValue {
  bingId: string;
  contractualRules: PurpleContractualRule[];
  description: string;
  entityPresentationInfo: EntityPresentationInfo;
  id: string;
  image: Image;
  name: string;
  webSearchUrl: string;
}

export interface PurpleContractualRule {
  _type: string;
  license?: DeepLink;
  licenseNotice?: string;
  mustBeCloseToContent: boolean;
  targetPropertyName: string;
  text?: string;
  url?: string;
}

export interface DeepLink {
  name: string;
  url: string;
}

export interface EntityPresentationInfo {
  entityScenario: string;
  entityTypeHints: string[];
}

export interface Image {
  height: number;
  hostPageUrl: string;
  name: string;
  provider: Provider[];
  sourceHeight: number;
  sourceWidth: number;
  thumbnailUrl: string;
  width: number;
}

export interface Provider {
  _type: string;
  url: string;
}

export interface Images {
  id: string;
  isFamilyFriendly: boolean;
  readLink: string;
  value: ImagesValue[];
  webSearchUrl: string;
}

export interface ImagesValue {
  contentSize: string;
  contentUrl: string;
  encodingFormat: string;
  height: number;
  hostPageDisplayUrl: string;
  hostPageUrl: string;
  name: string;
  thumbnail: Thumbnail;
  thumbnailUrl: string;
  webSearchUrl: string;
  width: number;
}

export interface Thumbnail {
  height: number;
  width: number;
}

export interface Places {
  value: PlacesValue[];
}

export interface PlacesValue {
  _type: string;
  address: Address;
  entityPresentationInfo: EntityPresentationInfo;
  id: string;
  name: string;
  telephone: string;
  url: string;
  webSearchUrl: string;
}

export interface Address {
  addressCountry: string;
  addressLocality: string;
  addressRegion: string;
  neighborhood: string;
  postalCode: string;
}

export interface QueryContext {
  askUserForLocation: boolean;
  originalQuery: string;
}

export interface RankingResponse {
  mainline: Mainline;
  sidebar: Mainline;
}

export interface Mainline {
  items: Item[];
}

export interface Item {
  answerType: string;
  resultIndex?: number;
  value?: ItemValue;
}

export interface ItemValue {
  id: string;
}

export interface RelatedSearches {
  id: string;
  value: RelatedSearchesValue[];
}

export interface RelatedSearchesValue {
  displayText: string;
  text: string;
  webSearchUrl: string;
}

export interface Videos {
  id: string;
  isFamilyFriendly: boolean;
  readLink: string;
  scenario: string;
  value: VideosValue[];
  webSearchUrl: string;
}

export interface VideosValue {
  allowHttpsEmbed: boolean;
  allowMobileEmbed: boolean;
  contentUrl: string;
  creator: Creator;
  datePublished: Date;
  description: string;
  duration: string;
  embedHtml: string;
  encodingFormat: EncodingFormat;
  height: number;
  hostPageDisplayUrl: string;
  hostPageUrl: string;
  isAccessibleForFree: boolean;
  isSuperfresh: boolean;
  motionThumbnailUrl: string;
  name: string;
  publisher: Creator[];
  thumbnail: Thumbnail;
  thumbnailUrl: string;
  viewCount: number;
  webSearchUrl: string;
  width: number;
}

export interface Creator {
  name: string;
}

export enum EncodingFormat {
  Mp4 = 'mp4'
}

export interface WebPages {
  totalEstimatedMatches: number;
  value: WebPagesValue[];
  webSearchUrl: string;
}

export interface WebPagesValue {
  dateLastCrawled: Date;
  deepLinks?: DeepLink[];
  displayUrl: string;
  id: string;
  isFamilyFriendly: boolean;
  isNavigational: boolean;
  language: string;
  name: string;
  snippet: string;
  thumbnailUrl?: string;
  url: string;
  contractualRules?: FluffyContractualRule[];
}

export interface FluffyContractualRule {
  _type: string;
  license: DeepLink;
  licenseNotice: string;
  mustBeCloseToContent: boolean;
  targetPropertyIndex: number;
  targetPropertyName: string;
}

/**
 * Bing web search client.
 *
 * @see https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
 */
export class BingClient extends AIFunctionsProvider {
  protected readonly ky: KyInstance
  protected readonly apiKey: string
  protected readonly apiBaseUrl: string

  constructor({
    apiKey = getEnv('BING_API_KEY'),
    apiBaseUrl = BING_API_BASE_URL,
    ky = defaultKy
  }: {
    apiKey?: string
    apiBaseUrl?: string
    ky?: KyInstance
  } = {}) {
    assert(
      apiKey,
      'BingClient missing required "apiKey" (defaults to "BING_API_KEY")'
    )
    super()

    this.apiKey = apiKey
    this.apiBaseUrl = apiBaseUrl

    this.ky = ky.extend({
      prefixUrl: this.apiBaseUrl
    })
  }

  /**
   * Searches the web using the Bing search engine to return the most relevant web pages for a given query. Can also be used to find up-to-date news and information about many topics.
   */
  @aiFunction({
    name: 'bing_web_search',
    description:
      'Searches the web using the Bing search engine to return the most relevant web pages for a given query. Can also be used to find up-to-date news and information about many topics.',
    inputSchema: z.object({
      q: z.string().describe('search query')
    })
  })
  async search(queryOrOpts: string | BingSearchQuery) {
    const defaultQuery: Partial<BingSearchQuery> = {
      mkt: 'en-US'
    }

    const searchParams =
      typeof queryOrOpts === 'string'
        ? {
            ...defaultQuery,
            q: queryOrOpts
          }
        : {
            ...defaultQuery,
            ...queryOrOpts
          }

    // console.log(searchParams)
    const res = await this.ky
      .get('v7.0/search', {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey
        },
        searchParams
      })
      .json<BingSearchResponse>()

    return omit(res, 'rankingResponse')
  }
}
