import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("POST /api/workspaces", () => {
  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  };

  const mockFrom = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any);
    mockSupabaseClient.from.mockReturnValue(mockFrom);
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
  });

  it("returns 400 when name or slug is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }), // missing slug
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request data");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "Test", slug: "test" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when slug is already taken", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockFrom.single.mockResolvedValue({
      data: { id: "existing-workspace" },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "Test Workspace", slug: "test-workspace" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Workspace slug already taken");
  });

  it("creates workspace and adds user as member", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // Mock slug check - no existing workspace
    mockFrom.single.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    // Mock RPC call for workspace creation
    mockSupabaseClient.rpc.mockResolvedValue({
      data: "workspace-123",
      error: null,
    });

    // Mock fetching the created workspace
    mockFrom.single.mockResolvedValueOnce({
      data: {
        id: "workspace-123",
        name: "Test Workspace",
        slug: "test-workspace",
        created_by: "user-123",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "Test Workspace", slug: "test-workspace" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.workspace).toEqual({
      id: "workspace-123",
      name: "Test Workspace",
      slug: "test-workspace",
      created_by: "user-123",
    });

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("create_workspace_with_member", {
      p_name: "Test Workspace",
      p_slug: "test-workspace",
      p_user_id: "user-123",
    });
  });

  it("handles workspace creation failure", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockFrom.single.mockResolvedValue({
      data: null,
      error: null,
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: new Error("Database error"),
    });

    const request = new NextRequest("http://localhost:3000/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "Test Workspace", slug: "test-workspace" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create workspace");
  });

  it("validates slug format", async () => {
    const request = new NextRequest("http://localhost:3000/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "Test", slug: "Test Workspace!" }), // invalid slug
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request data");
  });
});

describe("GET /api/workspaces", () => {
  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  const mockFrom = {
    select: vi.fn(),
    eq: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any);
    mockSupabaseClient.from.mockReturnValue(mockFrom);
    mockFrom.select.mockReturnValue(mockFrom);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns user workspaces", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockFrom.eq.mockResolvedValue({
      data: [
        {
          workspace_id: "ws-1",
          workspaces: {
            id: "ws-1",
            name: "Workspace 1",
            slug: "workspace-1",
            created_by: "user-123",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        },
        {
          workspace_id: "ws-2",
          workspaces: {
            id: "ws-2",
            name: "Workspace 2",
            slug: "workspace-2",
            created_by: "user-456",
            created_at: "2024-01-02T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
          },
        },
      ],
      error: null,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workspaces).toHaveLength(2);
    expect(data.workspaces[0].name).toBe("Workspace 1");
    expect(data.workspaces[1].name).toBe("Workspace 2");
  });

  it("returns 500 if database query fails", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockFrom.eq.mockResolvedValue({
      data: null,
      error: new Error("Database error"),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch workspaces");
  });
});