import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGitHubService } from "../github.service";

vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    users: {
      getAuthenticated: vi.fn().mockResolvedValue({
        data: {
          login: "testuser",
          id: 12345,
          avatar_url: "https://github.com/avatar.jpg",
        },
      }),
    },
    repos: {
      listForAuthenticatedUser: vi.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            name: "test-repo",
            full_name: "testuser/test-repo",
            private: false,
            description: "Test repository",
            default_branch: "main",
            html_url: "https://github.com/testuser/test-repo",
            updated_at: "2024-01-01T00:00:00Z",
            owner: {
              login: "testuser",
              avatar_url: "https://github.com/avatar.jpg",
              type: "User",
            },
          },
        ],
        headers: {
          link: '<https://api.github.com/user/repos?page=2>; rel="next"',
        },
      }),
      get: vi.fn().mockResolvedValue({
        data: {
          id: 1,
          name: "test-repo",
          full_name: "testuser/test-repo",
          private: false,
          description: "Test repository",
          default_branch: "main",
          html_url: "https://github.com/testuser/test-repo",
          updated_at: "2024-01-01T00:00:00Z",
          owner: {
            login: "testuser",
            avatar_url: "https://github.com/avatar.jpg",
            type: "User",
          },
        },
      }),
    },
    search: {
      repos: vi.fn().mockResolvedValue({
        data: {
          total_count: 1,
          items: [
            {
              id: 1,
              name: "test-repo",
              full_name: "testuser/test-repo",
              private: false,
              description: "Test repository",
              default_branch: "main",
              html_url: "https://github.com/testuser/test-repo",
              updated_at: "2024-01-01T00:00:00Z",
              owner: {
                login: "testuser",
                avatar_url: "https://github.com/avatar.jpg",
                type: "User",
              },
            },
          ],
        },
      }),
    },
    rateLimit: {
      get: vi.fn().mockResolvedValue({
        data: {
          rate: {
            limit: 5000,
            remaining: 4999,
            reset: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      }),
    },
  })),
}));

describe("GitHubService", () => {
  let service: ReturnType<typeof createGitHubService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createGitHubService("test-token");
  });

  it("should throw error when not initialized", () => {
    const uninitializedService = createGitHubService();
    expect(() => uninitializedService.getAuthenticatedUser()).rejects.toThrow(
      "GitHub service not initialized",
    );
  });

  it("should get authenticated user", async () => {
    const user = await service.getAuthenticatedUser();
    expect(user).toEqual({
      login: "testuser",
      id: 12345,
      avatar_url: "https://github.com/avatar.jpg",
    });
  });

  it("should list user repositories", async () => {
    const result = await service.listUserRepositories();

    expect(result.repositories).toHaveLength(1);
    expect(result.repositories[0]).toMatchObject({
      id: 1,
      name: "test-repo",
      full_name: "testuser/test-repo",
      private: false,
    });

    expect(result.pagination).toMatchObject({
      page: 1,
      per_page: 30,
      has_next: true,
      has_prev: false,
    });
  });

  it("should search repositories", async () => {
    const result = await service.searchRepositories("test");

    expect(result.repositories).toHaveLength(1);
    expect(result.repositories[0].name).toBe("test-repo");

    expect(result.pagination).toMatchObject({
      page: 1,
      per_page: 30,
      total_count: 1,
      has_next: false,
      has_prev: false,
    });
  });

  it("should get a single repository", async () => {
    const repo = await service.getRepository("testuser", "test-repo");

    expect(repo).toMatchObject({
      id: 1,
      name: "test-repo",
      full_name: "testuser/test-repo",
      private: false,
    });
  });

  it("should check rate limit", async () => {
    const rateLimit = await service.checkRateLimit();

    expect(rateLimit).toMatchObject({
      limit: 5000,
      remaining: 4999,
    });
    expect(rateLimit.reset).toBeInstanceOf(Date);
  });
});
