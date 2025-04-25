import { aiFunction, AIFunctionsProvider, assert, getEnv } from "@agentic/core";
import { createMastraTools } from "@agentic/mastra";
import { Octokit } from "octokit";
import { z } from "zod";

export namespace github {
  export interface User {
    id: number;
    login: string;
    name: string;
    bio: string;
    node_id: string;
    gravatar_id: string;
    type: string;
    site_admin: boolean;
    company: string;
    blog?: string;
    location?: string;
    hireable?: boolean;
    twitter_username?: string;
    email?: string;
    public_repos: number;
    public_gists: number;
    followers: number;
    following: number;
    avatar_url: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    created_at: string;
    updated_at: string;
  }
}

/**
 * GitHub tools for Mastra, now thread-aware.
 * All tool input schemas accept an optional threadId for tracing and debugging.
 * Each tool logs the threadId (if present) at the start of execution.
 */
// --- Zod Output Schema for GitHub User (SCHEMA-GITHUB-USER) ---
const GitHubUserSchema = z.object({
  login: z.string(),
  id: z.number().int(),
  node_id: z.string(),
  avatar_url: z.string().url(),
  gravatar_id: z.string().nullable(),
  url: z.string().url(),
  html_url: z.string().url(),
  followers_url: z.string().url(),
  following_url: z.string().url(),
  gists_url: z.string().url(),
  starred_url: z.string().url(),
  subscriptions_url: z.string().url(),
  organizations_url: z.string().url(),
  repos_url: z.string().url(),
  events_url: z.string().url(),
  received_events_url: z.string().url(),
  type: z.string(),
  site_admin: z.boolean(),
  name: z.string().nullable(),
  company: z.string().nullable(),
  blog: z.string().nullable(),
  location: z.string().nullable(),
  email: z.string().email().nullable(),
  hireable: z.boolean().nullable(),
  bio: z.string().nullable(),
  twitter_username: z.string().nullable().optional(),
  public_repos: z.number().int(),
  public_gists: z.number().int(),
  followers: z.number().int(),
  following: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
}).describe("Schema for GitHub user data based on GitHub REST API v3");

// --- Zod Output Schemas for GitHub Tools ---
const GitHubRepoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  owner: GitHubUserSchema,
  html_url: z.string().url(),
  description: z.string().nullable(),
  fork: z.boolean(),
  url: z.string().url(),
  forks_count: z.number().int(),
  stargazers_count: z.number().int(),
  watchers_count: z.number().int(),
  language: z.string().nullable(),
  open_issues_count: z.number().int(),
  default_branch: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: z.string(),
});

const GitHubReposListSchema = z.object({
  repositories: z.array(GitHubRepoSchema),
});

const GitHubIssueSchema = z.object({
  id: z.number().int(),
  number: z.number().int(),
  title: z.string(),
  user: GitHubUserSchema,
  state: z.string(),
  comments: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  body: z.string().nullable(),
});

const GitHubIssuesListSchema = z.object({
  issues: z.array(GitHubIssueSchema),
});

const GitHubPullSchema = z.object({
  id: z.number().int(),
  number: z.number().int(),
  title: z.string(),
  user: GitHubUserSchema,
  state: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  merged_at: z.string().nullable(),
  body: z.string().nullable(),
});

const GitHubPullsListSchema = z.object({
  pulls: z.array(GitHubPullSchema),
});

const GitHubBranchSchema = z.object({
  name: z.string(),
  protected: z.boolean().optional(),
});

const GitHubBranchesListSchema = z.object({
  branches: z.array(GitHubBranchSchema),
});

const GitHubCommitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    message: z.string(),
    author: z.object({
      name: z.string(),
      email: z.string(),
      date: z.string(),
    }),
  }),
  author: GitHubUserSchema.nullable(),
  committer: GitHubUserSchema.nullable(),
  html_url: z.string().url(),
});

const GitHubCommitsListSchema = z.object({
  commits: z.array(GitHubCommitSchema),
});

const GitHubReleaseSchema = z.object({
  id: z.number().int(),
  tag_name: z.string(),
  name: z.string().nullable(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  created_at: z.string(),
  published_at: z.string(),
  body: z.string().nullable(),
  html_url: z.string().url(),
});

const GitHubReleasesListSchema = z.object({
  releases: z.array(GitHubReleaseSchema),
});

const GitHubCodeSearchItemSchema = z.object({
  name: z.string(),
  path: z.string(),
  sha: z.string(),
  url: z.string().url(),
  html_url: z.string().url(),
  repository: GitHubRepoSchema,
});

const GitHubCodeSearchResultsSchema = z.object({
  items: z.array(GitHubCodeSearchItemSchema),
});

/**
 * Agentic GitHub client.
 */
export class GitHubClient extends AIFunctionsProvider {
  protected readonly apiKey: string;
  protected readonly octokit: Octokit;

  constructor({
    apiKey = getEnv("GITHUB_API_KEY"),
  }: {
    apiKey?: string;
  } = {}) {
    assert(
      apiKey,
      'GitHubClient missing required "apiKey" (defaults to "GITHUB_API_KEY")'
    );
    super();

    this.apiKey = apiKey;
    this.octokit = new Octokit({ auth: apiKey });
  }

  /**
   * Get a user by username.
   */
  @aiFunction({
    name: "github_get_user_by_username",
    description: "Get a user by username.",
    inputSchema: z.object({
      username: z.string().describe("The username of the user to get."),
      threadId: z.string().optional().describe("The thread ID for tracing."),
    }),
  })
  async getUserByUsername(
    input: { username: string; threadId?: string }
  ): Promise<github.User> {
    if (input.threadId) {
      console.info(JSON.stringify({
        event: "github_get_user_by_username",
        threadId: input.threadId,
        username: input.username,
      }));
    }
    const res = await this.octokit.request(`GET /users/${input.username}`, {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    return res.data;
  }

  /**
   * Search repositories by keyword, language, etc.
   */
  @aiFunction({
    name: "github_search_repositories",
    description: "Search public repositories on GitHub by keyword, language, etc.",
    inputSchema: z.object({
      q: z.string().describe("Search query (e.g. 'topic:ai language:typescript')"),
      sort: z.enum(["stars", "forks", "updated", "help-wanted-issues"]).optional().describe("Sort field (stars, forks, updated, help-wanted-issues)"),
      order: z.enum(["asc", "desc"]).optional().describe("Order (asc or desc)"),
      per_page: z.number().int().optional().default(10),
      threadId: z.string().optional().describe("The thread ID for tracing."),
    }),
  })
  async searchRepositories(input: { q: string; sort?: "stars"|"forks"|"updated"|"help-wanted-issues"; order?: "asc"|"desc"; per_page?: number; threadId?: string }) {
    if (input.threadId) {
      console.info(JSON.stringify({
        event: "github_search_repositories",
        threadId: input.threadId,
        q: input.q,
      }));
    }
    const res = await this.octokit.request('GET /search/repositories', input);
    return { repositories: res.data.items };
  }

  /**
   * List repositories for a user.
   */
  @aiFunction({
    name: "github_list_user_repos",
    description: "List public repositories for a user.",
    inputSchema: z.object({
      username: z.string().describe("GitHub username"),
      per_page: z.number().int().optional().default(10),
      threadId: z.string().optional().describe("The thread ID for tracing."),
    }),
  })
  async listUserRepos(input: { username: string; per_page?: number; threadId?: string }) {
    if (input.threadId) {
      console.info(JSON.stringify({
        event: "github_list_user_repos",
        threadId: input.threadId,
        username: input.username,
      }));
    }
    const res = await this.octokit.request('GET /users/{username}/repos', input);
    return { repositories: res.data };
  }

  /**
   * Get repository details.
   */
  @aiFunction({
    name: "github_get_repo",
    description: "Get details for a specific repository.",
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      threadId: z.string().optional().describe("The thread ID for tracing."),
    }),
  })
  async getRepo(input: { owner: string; repo: string; threadId?: string }) {
    if (input.threadId) {
      console.info(JSON.stringify({
        event: "github_get_repo",
        threadId: input.threadId,
        owner: input.owner,
        repo: input.repo,
      }));
    }
    const res = await this.octokit.request('GET /repos/{owner}/{repo}', input);
    return res.data;
  }

  /**
   * List issues for a repository.
   */
  @aiFunction({
    name: "github_list_repo_issues",
    description: "List issues for a repository.",
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(["open", "closed", "all"]).optional().default('open'),
      per_page: z.number().int().optional().default(10),
      threadId: z.string().optional().describe("The thread ID for tracing."),
    }),
  })
  async listRepoIssues(input: { owner: string; repo: string; state?: "open"|"closed"|"all"; per_page?: number; threadId?: string }) {
    if (input.threadId) {
      console.info(JSON.stringify({
        event: "github_list_repo_issues",
        threadId: input.threadId,
        owner: input.owner,
        repo: input.repo,
      }));
    }
    const res = await this.octokit.request('GET /repos/{owner}/{repo}/issues', input);
    return { issues: res.data };
  }

  /**
   * List pull requests for a repository.
   */
  @aiFunction({
    name: "github_list_repo_pulls",
    description: "List pull requests for a repository.",
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(["open", "closed", "all"]).optional().default('open'),
      per_page: z.number().int().optional().default(10),
      threadId: z.string().optional().describe("The thread ID for tracing."),
    }),
  })
  async listRepoPulls(input: { owner: string; repo: string; state?: "open"|"closed"|"all"; per_page?: number; threadId?: string }) {
    if (input.threadId) {
      console.info(JSON.stringify({
        event: "github_list_repo_pulls",
        threadId: input.threadId,
        owner: input.owner,
        repo: input.repo,
      }));
    }
    const res = await this.octokit.request('GET /repos/{owner}/{repo}/pulls', input);
    return { pulls: res.data };
  }

  /**
   * List branches for a repository.
   */
  @aiFunction({
    name: "github_list_repo_branches",
    description: "List branches for a repository.",
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      threadId: z.string().optional().describe("The thread ID for tracing."),
    }),
  })
  async listRepoBranches(input: { owner: string; repo: string; threadId?: string }) {
    if (input.threadId) {
      console.info(JSON.stringify({
        event: "github_list_repo_branches",
        threadId: input.threadId,
        owner: input.owner,
        repo: input.repo,
      }));
    }
    const res = await this.octokit.request('GET /repos/{owner}/{repo}/branches', input);
    return { branches: res.data };
  }

  /**
   * List commits for a repository.
   */
  @aiFunction({
    name: "github_list_repo_commits",
    description: "List commits for a repository.",
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      per_page: z.number().int().optional().default(10),
      threadId: z.string().optional().describe("The thread ID for tracing."),
    }),
  })
  async listRepoCommits(input: { owner: string; repo: string; per_page?: number; threadId?: string }) {
    if (input.threadId) {
      console.info(JSON.stringify({
        event: "github_list_repo_commits",
        threadId: input.threadId,
        owner: input.owner,
        repo: input.repo,
      }));
    }
    const res = await this.octokit.request('GET /repos/{owner}/{repo}/commits', input);
    return { commits: res.data };
  }

  /**
   * List releases for a repository.
   */
  @aiFunction({
    name: "github_list_repo_releases",
    description: "List releases for a repository.",
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      per_page: z.number().int().optional().default(10),
      threadId: z.string().optional().describe("The thread ID for tracing."),
    }),
  })
  async listRepoReleases(input: { owner: string; repo: string; per_page?: number; threadId?: string }) {
    if (input.threadId) {
      console.info(JSON.stringify({
        event: "github_list_repo_releases",
        threadId: input.threadId,
        owner: input.owner,
        repo: input.repo,
      }));
    }
    const res = await this.octokit.request('GET /repos/{owner}/{repo}/releases', input);
    return { releases: res.data };
  }

  /**
   * Search code in public repositories.
   */
  @aiFunction({
    name: "github_search_code",
    description: "Search code in public repositories.",
    inputSchema: z.object({
      q: z.string().describe("Search query (e.g. 'repo:owner/repo filename:main.js')"),
      per_page: z.number().int().optional().default(10),
      threadId: z.string().optional().describe("The thread ID for tracing."),
    }),
  })
  async searchCode(input: { q: string; per_page?: number; threadId?: string }) {
    if (input.threadId) {
      console.info(JSON.stringify({
        event: "github_search_code",
        threadId: input.threadId,
        q: input.q,
      }));
    }
    const res = await this.octokit.request('GET /search/code', input);
    return { items: res.data.items };
  }
}

/**
 * Creates a configured GitHub client
 *
 * Note: This function returns a standard AIFunctionsProvider that should be
 * wrapped with `createMastraTools` from @agentic/mastra when added to extraTools in index.ts.
 *
 * @param config - Configuration options for the GitHub client
 * @returns A GitHubClient instance
 */
export function createGitHubClient(
  config: {
    apiKey?: string;
  } = {}
) {
  return new GitHubClient(config);
}

/**
 * Helper function to create a Mastra-compatible GitHub client
 *
 * @param config - Configuration options for the GitHub client
 * @returns An object map of Mastra-compatible tools with output schemas patched
 */
export function createMastraGitHubTools(
  config: {
    apiKey?: string;
  } = {}
) {
  const gitHubClient = createGitHubClient(config);
  const mastraTools = createMastraTools(gitHubClient);
  // Patch outputSchema for each tool for Mastra compatibility
  if (mastraTools.github_get_user_by_username) {
    (mastraTools.github_get_user_by_username as any).outputSchema = GitHubUserSchema;
  }
  if (mastraTools.github_search_repositories) {
    (mastraTools.github_search_repositories as any).outputSchema = GitHubReposListSchema;
  }
  if (mastraTools.github_list_user_repos) {
    (mastraTools.github_list_user_repos as any).outputSchema = GitHubReposListSchema;
  }
  if (mastraTools.github_get_repo) {
    (mastraTools.github_get_repo as any).outputSchema = GitHubRepoSchema;
  }
  if (mastraTools.github_list_repo_issues) {
    (mastraTools.github_list_repo_issues as any).outputSchema = GitHubIssuesListSchema;
  }
  if (mastraTools.github_list_repo_pulls) {
    (mastraTools.github_list_repo_pulls as any).outputSchema = GitHubPullsListSchema;
  }
  if (mastraTools.github_list_repo_branches) {
    (mastraTools.github_list_repo_branches as any).outputSchema = GitHubBranchesListSchema;
  }
  if (mastraTools.github_list_repo_commits) {
    (mastraTools.github_list_repo_commits as any).outputSchema = GitHubCommitsListSchema;
  }
  if (mastraTools.github_list_repo_releases) {
    (mastraTools.github_list_repo_releases as any).outputSchema = GitHubReleasesListSchema;
  }
  if (mastraTools.github_search_code) {
    (mastraTools.github_search_code as any).outputSchema = GitHubCodeSearchResultsSchema;
  }
  return mastraTools;
}

// Export adapter for convenience
export { createMastraTools, GitHubUserSchema, GitHubRepoSchema, GitHubReposListSchema, GitHubIssueSchema, GitHubIssuesListSchema, GitHubPullSchema, GitHubPullsListSchema, GitHubBranchSchema, GitHubBranchesListSchema, GitHubCommitSchema, GitHubCommitsListSchema, GitHubReleaseSchema, GitHubReleasesListSchema, GitHubCodeSearchItemSchema, GitHubCodeSearchResultsSchema };
