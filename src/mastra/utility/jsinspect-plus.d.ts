/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "jsinspect-plus" {
  import { EventEmitter } from "events";
  export class Inspector extends EventEmitter {
    constructor(paths: string[], options?: any);
    on(event: string, callback: (...args: any[]) => void): this;
    run(): void;
  }
  export const reporters: any;
  // Default export for compatibility
  const _default: { Inspector: typeof Inspector; reporters: any };
  export default _default;
} 