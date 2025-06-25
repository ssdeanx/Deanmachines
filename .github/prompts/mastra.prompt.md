# Mastra URLs


https://mastra.ai/en/examples/rag/usage/cleanup-rag
https://mastra.ai/en/examples/rag/usage/filter-rag
https://mastra.ai/en/examples/rag/rerank/rerank

https://mastra.ai/en/examples/rag/chunking/chunk-text
https://mastra.ai/en/examples/rag/chunking/chunk-markdown
https://mastra.ai/en/examples/rag/chunking/chunk-html
https://mastra.ai/en/examples/rag/chunking/chunk-json
https://mastra.ai/en/examples/rag/chunking/adjust-chunk-size
https://mastra.ai/en/examples/rag/chunking/adjust-chunk-delimiters

https://mastra.ai/en/examples/rag/embedding/embed-text-chunk
https://mastra.ai/en/examples/rag/embedding/embed-chunk-array
https://mastra.ai/en/examples/rag/embedding/metadata-extraction

https://mastra.ai/en/examples/rag/query/hybrid-vector-search
https://mastra.ai/en/examples/rag/query/retrieve-results

https://mastra.ai/en/examples/agents/dynamic-agents

https://mastra.ai/en/examples/memory/memory-with-libsql
https://mastra.ai/en/examples/memory/memory-processors

https://mastra.ai/en/examples/evals/word-inclusion
https://mastra.ai/en/examples/evals/toxicity
https://mastra.ai/en/examples/evals/tone-consistency
https://mastra.ai/en/examples/evals/textual-difference
https://mastra.ai/en/examples/evals/summarization
https://mastra.ai/examples/evals/prompt-alignment
https://mastra.ai/examples/evals/keyword-coverage
https://mastra.ai/examples/evals/hallucination
https://mastra.ai/examples/evals/faithfulness
https://mastra.ai/en/examples/evals/contextual-recall
https://mastra.ai/examples/evals/context-precision
https://mastra.ai/examples/evals/context-position
http://mastra.ai/en/examples/evals/content-similarity
https://mastra.ai/examples/evals/completeness
https://mastra.ai/examples/evals/bias
https://mastra.ai/examples/evals/answer-relevancy

http://mastra.ai/en/examples/evals/custom-eval

https://mastra.ai/en/reference/agents/getModel
https://mastra.ai/en/reference/agents/agent
https://mastra.ai/en/reference/agents/createTool
https://mastra.ai/en/reference/agents/getWorkflows
https://mastra.ai/en/reference/agents/getVoice
https://mastra.ai/en/reference/agents/getInstructions
https://mastra.ai/en/reference/agents/getTools
https://mastra.ai/en/reference/agents/getMemory

# Mastra RAG Example: Chunking, Embedding, and Upserting

Upsert Embeddings
After generating embeddings, you need to store them in a database that supports vector similarity search. This example shows how to store embeddings in various vector databases for later retrieval.

The LibSQLVector class provides methods to create collections and insert embeddings into LibSQL, a fork of SQLite with vector extensions.

```ts
import { google } from "@ai-sdk/google";
import { LibSQLVector } from "@mastra/core/vector/libsql";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
 
const doc = MDocument.fromText("Your text content...");
 
const chunks = await doc.chunk();
 
const { embeddings } = await embedMany({
  values: chunks.map((chunk) => chunk.text),
  model: google.embedding("text-embedding-004"),
});
 
const libsql = new LibSQLVector({
  connectionUrl: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN, // Optional: for Turso cloud databases
});
 
await libsql.createIndex({
  indexName: "test_collection",
  dimension: 1536,
});
 
await libsql.upsert({
  indexName: "test_collection",
  vectors: embeddings,
  metadata: chunks?.map((chunk) => ({ text: chunk.text })),
});
```