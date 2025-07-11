import { Octokit } from "@octokit/rest";
import type { OctokitResponse } from "@octokit/types";

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  html_url: string;
  updated_at: string | null;
  owner: {
    login: string;
    avatar_url: string;
    type: string;
  };
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface PaginationInfo {
  page: number;
  per_page: number;
  total_count?: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface RepositoriesResponse {
  repositories: GitHubRepository[];
  pagination: PaginationInfo;
}

class GitHubService {
  private octokit: Octokit | null = null;

  constructor(private accessToken?: string) {
    if (accessToken) {
      this.initialize(accessToken);
    }
  }

  initialize(accessToken: string) {
    this.accessToken = accessToken;
    this.octokit = new Octokit({
      auth: accessToken,
    });
  }

  private ensureInitialized(): Octokit {
    if (!this.octokit) {
      throw new Error(
        "GitHub service not initialized. Please provide an access token.",
      );
    }
    return this.octokit;
  }

  async getAuthenticatedUser() {
    const octokit = this.ensureInitialized();
    const { data } = await octokit.users.getAuthenticated();
    return data;
  }

  async listUserRepositories(
    options: {
      page?: number;
      per_page?: number;
      sort?: "created" | "updated" | "pushed" | "full_name";
      direction?: "asc" | "desc";
      visibility?: "all" | "public" | "private";
      affiliation?: string;
    } = {},
  ): Promise<RepositoriesResponse> {
    const octokit = this.ensureInitialized();

    const {
      page = 1,
      per_page = 30,
      sort = "updated",
      direction = "desc",
      visibility = "all",
      affiliation = "owner,collaborator,organization_member",
    } = options;

    try {
      const response: OctokitResponse<GitHubRepository[]> =
        await octokit.repos.listForAuthenticatedUser({
          page,
          per_page,
          sort,
          direction,
          visibility,
          affiliation,
        });

      const linkHeader = response.headers.link;
      const pagination: PaginationInfo = {
        page,
        per_page,
        has_next: linkHeader?.includes('rel="next"') || false,
        has_prev: linkHeader?.includes('rel="prev"') || false,
      };

      return {
        repositories: response.data as GitHubRepository[],
        pagination,
      };
    } catch (error) {
      console.error("Error fetching repositories:", error);
      throw error;
    }
  }

  async searchRepositories(
    query: string,
    options: {
      page?: number;
      per_page?: number;
    } = {},
  ): Promise<RepositoriesResponse> {
    const octokit = this.ensureInitialized();

    const { page = 1, per_page = 30 } = options;

    try {
      const user = await this.getAuthenticatedUser();
      const searchQuery = `${query} user:${user.login}`;

      const response = await octokit.search.repos({
        q: searchQuery,
        page,
        per_page,
        sort: "updated",
        order: "desc",
      });

      const pagination: PaginationInfo = {
        page,
        per_page,
        total_count: response.data.total_count,
        has_next: response.data.total_count > page * per_page,
        has_prev: page > 1,
      };

      return {
        repositories: response.data.items as GitHubRepository[],
        pagination,
      };
    } catch (error) {
      console.error("Error searching repositories:", error);
      throw error;
    }
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const octokit = this.ensureInitialized();

    try {
      const { data } = await octokit.repos.get({
        owner,
        repo,
      });
      return data as GitHubRepository;
    } catch (error) {
      console.error(`Error fetching repository ${owner}/${repo}:`, error);
      throw error;
    }
  }

  async checkRateLimit() {
    const octokit = this.ensureInitialized();

    try {
      const { data } = await octokit.rateLimit.get();
      return {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000),
      };
    } catch (error) {
      console.error("Error checking rate limit:", error);
      throw error;
    }
  }
}

export const createGitHubService = (accessToken?: string) => {
  return new GitHubService(accessToken);
};

export type { GitHubService };
