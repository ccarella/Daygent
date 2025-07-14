import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "../route";

// Mock getInstallationOctokit
vi.mock("@/services/github-app.server", () => ({
  getInstallationOctokit: vi.fn(() => ({
    paginate: {
      iterator: vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield {
            data: [
              {
                number: 1,
                id: 101,
                node_id: "MDU6SXNzdWUxMDE=",
                title: "Test Issue 1",
                body: "Test issue body",
                state: "open",
                user: { login: "testuser" },
                assignee: { login: "assignee1" },
                labels: [
                  { name: "bug", color: "d73a4a", description: "Something isn't working" },
                ],
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                closed_at: null,
              },
              {
                number: 2,
                id: 102,
                node_id: "MDU6SXNzdWUxMDI=",
                title: "Test Issue 2",
                body: "Another test issue",
                state: "closed",
                user: { login: "testuser2" },
                assignee: null,
                labels: [],
                created_at: "2024-01-02T00:00:00Z",
                updated_at: "2024-01-02T00:00:00Z",
                closed_at: "2024-01-03T00:00:00Z",
              },
              {
                number: 3,
                pull_request: {}, // This should be skipped
                title: "PR not an issue",
              },
            ],
          };
        },
      }),
    },
    rest: {
      issues: {
        listForRepo: vi.fn(),
      },
    },
  })),
}));

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

describe("/api/repositories/[id]/sync-issues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  describe("POST", () => {
    it("should sync issues successfully", async () => {
      // Mock repository query
      const mockRepository = {
        id: "repo-123",
        workspace_id: "workspace-123",
        owner: "testowner",
        name: "testrepo",
        installation_id: 12345,
      };

      // Mock database queries
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "repositories") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockRepository,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "workspace_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { workspace_id: "workspace-123" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "sync_status") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { sync_in_progress: false },
                  error: null,
                }),
              }),
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === "issues") {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "issue-123" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const request = new NextRequest("http://localhost:3000/api/repositories/repo-123/sync-issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_sync: false }),
      });

      const response = await POST(request, { params: { id: "repo-123" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.synced).toBe(2); // Should sync 2 issues (skip PR)
    });

    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest("http://localhost:3000/api/repositories/repo-123/sync-issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_sync: false }),
      });

      const response = await POST(request, { params: { id: "repo-123" } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if repository not found", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "repositories") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116" },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const request = new NextRequest("http://localhost:3000/api/repositories/repo-123/sync-issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_sync: false }),
      });

      const response = await POST(request, { params: { id: "repo-123" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Repository not found");
    });

    it("should return 409 if sync is already in progress", async () => {
      // Mock repository query
      const mockRepository = {
        id: "repo-123",
        workspace_id: "workspace-123",
        owner: "testowner",
        name: "testrepo",
        installation_id: 12345,
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "repositories") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockRepository,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "workspace_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { workspace_id: "workspace-123" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "sync_status") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { sync_in_progress: true }, // Already in progress
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const request = new NextRequest("http://localhost:3000/api/repositories/repo-123/sync-issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_sync: false }),
      });

      const response = await POST(request, { params: { id: "repo-123" } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Sync already in progress");
    });
  });

  describe("GET /sync-status", () => {
    it("should return sync status successfully", async () => {
      const mockSyncStatus = {
        sync_in_progress: false,
        last_issue_sync: "2024-01-01T00:00:00Z",
        last_issue_cursor: "cursor-123",
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "repositories") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { workspace_id: "workspace-123" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "workspace_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { workspace_id: "workspace-123" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "sync_status") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSyncStatus,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const request = new NextRequest("http://localhost:3000/api/repositories/repo-123/sync-status");

      const response = await GET(request, { params: { id: "repo-123" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSyncStatus);
    });

    it("should return default status if none exists", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "repositories") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { workspace_id: "workspace-123" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "workspace_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { workspace_id: "workspace-123" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "sync_status") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116" }, // Not found
                }),
              }),
            }),
          };
        }
        return {};
      });

      const request = new NextRequest("http://localhost:3000/api/repositories/repo-123/sync-status");

      const response = await GET(request, { params: { id: "repo-123" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        sync_in_progress: false,
        last_issue_sync: null,
        last_issue_cursor: null,
      });
    });
  });
});