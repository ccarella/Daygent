import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

vi.mock("@/services/github.server", () => ({
  getServerGitHubService: vi.fn(() => ({
    listUserRepositories: vi.fn().mockResolvedValue({
      repositories: [
        {
          id: 1,
          name: "test-repo",
          full_name: "testuser/test-repo",
          private: false,
          description: "Test repository",
          default_branch: "main",
        },
      ],
      pagination: {
        page: 1,
        per_page: 30,
        has_next: false,
        has_prev: false,
      },
    }),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
          },
        },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })),
    })),
  }),
}));

describe("GET /api/repositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return repositories with connection status", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/repositories?workspace_id=ws-123",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.repositories).toHaveLength(1);
    expect(data.repositories[0]).toMatchObject({
      id: 1,
      name: "test-repo",
      is_connected: false,
    });
    expect(data.pagination).toMatchObject({
      page: 1,
      per_page: 30,
      has_next: false,
      has_prev: false,
    });
  });

  it("should handle unauthorized requests", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Unauthorized" },
        }),
      },
    };
     
    vi.mocked(createClient).mockResolvedValueOnce(mockClient as any);

    const request = new NextRequest("http://localhost:3000/api/repositories");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should handle GitHub service errors", async () => {
    const { getServerGitHubService } = await import("@/services/github.server");
    vi.mocked(getServerGitHubService).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost:3000/api/repositories");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe(
      "GitHub service not available. Please re-authenticate.",
    );
  });

  it("should handle search parameters", async () => {
    const { getServerGitHubService } = await import("@/services/github.server");
    const mockSearchRepositories = vi.fn().mockResolvedValue({
      repositories: [],
      pagination: { page: 1, per_page: 30, has_next: false, has_prev: false },
    });

    const mockService = {
      searchRepositories: mockSearchRepositories,
    };
     
    vi.mocked(getServerGitHubService).mockResolvedValueOnce(mockService as any);

    const request = new NextRequest(
      "http://localhost:3000/api/repositories?search=test",
    );
    await GET(request);

    expect(mockSearchRepositories).toHaveBeenCalledWith("test", {
      page: 1,
      per_page: 30,
    });
  });
});
