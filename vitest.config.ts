import { defineConfig } from "vitest/config";
 
export default defineConfig({
  test: {
    globalSetup: "./globalSetup.ts",
    setupFiles: ["./testSetup.ts"],
  },
});