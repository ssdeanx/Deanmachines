import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    serverExternalPackages: ["@mastra/*", "@ai-sdk/*", "ai", "isolated-vm", "shelljs", "isomorphic-git", "jsinspect-plus", "langsmith", "cheerio", "dayjs", "class-variance-authority", "clsx", "quick-lru", "zod"],
  /* config options here */
};

export default nextConfig;
