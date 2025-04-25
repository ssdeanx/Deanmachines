import type * as google from 'googleapis'
import type { SetNonNullable, Simplify } from 'type-fest'
import {
  aiFunction,
  AIFunctionsProvider,
  pruneNullOrUndefinedDeep,
  type SetRequired
} from '@agentic/core'
import { z } from 'zod'

export namespace googleDocs {
  export type Document = Simplify<
    SetNonNullable<google.docs_v1.Schema$Document>
  >
}

/**
 * Simplified Google Docs API client.
 *
 * @see https://developers.google.com/workspace/drive/api
 *
 * @example
 * ```ts
 * import { GoogleDocsClient } from '@agentic/google-docs'
 * import { authenticate } from '@google-cloud/local-auth'
 * import { google } from 'googleapis'
 *
 * // (in a real app, store these auth credentials and reuse them)
 * const auth = await authenticate({
 *   scopes: ['https://www.googleapis.com/auth/documents.readonly'],
 *   keyfilePath: process.env.GOOGLE_CREDENTIALS_PATH
 * })
 * const docs = google.docs({ version: 'v1', auth })
 * const client = new GoogleDocsClient({ docs })
 * ```
 */
export class GoogleDocsClient extends AIFunctionsProvider {
  protected readonly docs: google.docs_v1.Docs

  constructor({ docs }: { docs: google.docs_v1.Docs }) {
    super()

    this.docs = docs
  }

  /**
   * Gets a Google Docs document by ID.
   */
  @aiFunction({
    name: 'google_docs_get_document',
    description: 'Gets a Google Docs document by ID.',
    inputSchema: z.object({
      documentId: z.string()
    })
  })
  async getDocument(
    args: Simplify<
      SetRequired<google.docs_v1.Params$Resource$Documents$Get, 'documentId'>
    >
  ): Promise<{ document: googleDocs.Document }> {
    const { documentId, ...opts } = args;
    const { data } = await this.docs.documents.get({
      ...opts,
      documentId
    });
    return { document: convertDocument(data) };
  }
}

export const GoogleDocsGetDocumentOutputSchema = z.object({
  document: z.unknown().describe("The full Google Docs document object (pruned of null/undefined fields)."),
});

function convertDocument(
  data: google.docs_v1.Schema$Document
): googleDocs.Document {
  return pruneNullOrUndefinedDeep(data)
}

// Patch the tool for Mastra compatibility
import { createMastraTools } from "@agentic/mastra";

// Register the provider instance (not the method!)
const dummyDocs = {
  documents: {
    get: async () => ({ data: {} }),
  },
} as any; // Only for registration/discovery, not for runtime
const googleDocsClient = new GoogleDocsClient({ docs: dummyDocs });

export const googleDocsTools = createMastraTools(googleDocsClient);
export const googleDocsGetDocumentTool = googleDocsTools["google_docs_get_document"];
(googleDocsGetDocumentTool as any).outputSchema = GoogleDocsGetDocumentOutputSchema;

