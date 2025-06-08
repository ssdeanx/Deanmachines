import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { fastembed } from "@mastra/fastembed";
 
export const storage = new LibSQLStore({
    url: 'file:./memory.db',
})

export const vector = new LibSQLVector({
    connectionUrl: 'file:./memory.db',
})

 
export const memory = new Memory({
    vector, 
    storage,
})