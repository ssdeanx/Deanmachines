// @ts-nocheck
// Declaration merging to enable compatibility between LibSQL classes and Mastra interfaces
import type { MastraVector, MastraStorage } from '@mastra/core';
import { LibSQLVector, LibSQLStore } from '@mastra/libsql';

declare module '@mastra/libsql' {
  interface LibSQLVector extends MastraVector {}
  interface LibSQLStore extends MastraStorage {}
}
