import { Memory } from "@mastra/memory";
import { PostgresStore, PgVector } from "@mastra/pg";
import { PinoLogger } from "@mastra/loggers";
import { env } from "./config/environment";
import { google } from "@ai-sdk/google";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { UIMessage } from 'ai';
// Initialize logger for memory operations
const logger = new PinoLogger({ level: env.LOG_LEVEL });

logger.info("Initializing memory with PostgreSQL storage and vector search...");

 
// PostgreSQL connection details

const connectionString = `${env.SUPABASE_URL}`;
 
// Initialize memory with PostgreSQL storage and vector search
export const memory = new Memory({
    
  storage: new PostgresStore({
    connectionString,
  }),
  vector: new PgVector({ connectionString }),
  embedder: google.textEmbeddingModel('gemini-embedding-exp-03-07'),
  options: {
    lastMessages: 10,
    semanticRecall: {
      topK: 3,
      messageRange: 2,
    },
    workingMemory: {
      enabled: true,
      template: `
---
# {{agent_name}} WM
Ctx: S:{{session_id}} U:{{user_id}} Q:"{{user_query_summary}}" Sent:{{sentiment_score}} UnresQ:{{unresolved_questions_count}}
Hist: {{summarized_history_short}}
Notes: {{assistant_scratchpad_summary}}
Plan: CurAct:"{{current_action}}" Next:"{{next_action_preview}}"
Entities: {{key_entities_list}}
Goals: {{active_goals_short}}
Hypo: {{current_hypotheses_brief}}
Signals: {{critical_signals_list}}
Flags: Learn:{{is_learning}} Clarify:{{needs_clarification}} Load:{{is_high_load}} Plan:{{is_planning}} Wait:{{is_waiting}} Exec:{{is_executing}}
Peers: {{collaborating_agents_ids}}
SharedKB: {{relevant_shared_kb_snippets}}
LearnEvents: {{recent_learning_highlights}}
---
      `,
    },
  },
});
 
