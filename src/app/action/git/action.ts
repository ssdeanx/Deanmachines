"use server";

import { mastra } from "../../../mastra";

// this is a server action that can be called from a client component

// This is example replace it with git usage in a client component: 
export async function getRepoInfo(formData: FormData) {
  const repo = formData.get("repo")?.toString();
  const agent = mastra.getAgent("git");

  const result = await agent.generate(`What's the latest commit in ${repo}?`);

  return result.text;
}