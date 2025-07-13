import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(() => []),
    }),
  ),
}));

describe("POST /api/workspaces", () => {
  const mockAuthClient = {
    auth: {
      getUser: vi.fn(),
    },
  };

  interface MockServiceClient {
    from: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  }

  const mockServiceClient: MockServiceClient = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    rpc: vi.fn(),
  };

  // Setup chain methods
  mockServiceClient.from.mockReturnValue(mockServiceClient);
  mockServiceClient.select.mockReturnValue(mockServiceClient);
  mockServiceClient.eq.mockReturnValue(mockServiceClient);
  mockServiceClient.insert.mockReturnValue(mockServiceClient);
  mockServiceClient.delete.mockReturnValue(mockServiceClient);

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset chain methods
    mockServiceClient.from.mockReturnValue(mockServiceClient);
    mockServiceClient.select.mockReturnValue(mockServiceClient);
    mockServiceClient.eq.mockReturnValue(mockServiceClient);
    mockServiceClient.insert.mockReturnValue(mockServiceClient);
    mockServiceClient.delete.mockReturnValue(mockServiceClient);

    // Mock the imports - ensure cookies is properly mocked
    vi.mocked(createClient).mockResolvedValue(mockAuthClient as any);
    vi.mocked(createServerClient).mockReturnValue(mockServiceClient as any);
  });

  it("returns 400 when name or slug is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }), // missing slug
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Name and slug are required");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
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
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    mockServiceClient.single.mockResolvedValueOnce({
      data: { id: "existing-org", slug: "test" },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "Test", slug: "test" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Workspace slug is already taken");
  });

  it("creates workspace and adds user as member", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockWorkspace = {
      id: "workspace-123",
      name: "Test Workspace",
      slug: "test-workspace",
    };

    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock RPC call for slug check
    mockServiceClient.rpc = vi.fn().mockResolvedValueOnce({
      data: true, // slug is available
      error: null,
    });

    // Mock RPC call for workspace creation
    mockServiceClient.rpc.mockResolvedValueOnce({
      data: mockWorkspace.id,
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/workspaces", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Workspace",
        slug: "test-workspace",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.workspace).toEqual({
      id: mockWorkspace.id,
      name: mockWorkspace.name,
      slug: mockWorkspace.slug,
    });

    // Verify RPC calls were made correctly
    expect(mockServiceClient.rpc).toHaveBeenCalledWith(
      "is_workspace_slug_available",
      {
        p_slug: "test-workspace",
      },
    );

    expect(mockServiceClient.rpc).toHaveBeenCalledWith(
      "create_workspace_with_member",
      {
        p_name: "Test Workspace",
        p_slug: "test-workspace",
        p_user_id: "user-123",
      },
    );
  });

  it("handles workspace creation failure", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock RPC call for slug check
    mockServiceClient.rpc = vi.fn().mockResolvedValueOnce({
      data: true, // slug is available
      error: null,
    });

    // Mock RPC call for workspace creation failure
    mockServiceClient.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("Failed to create workspace"),
    });

    const request = new NextRequest("http://localhost:3000/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: "Test", slug: "test" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create workspace");
  });

  it("handles slug availability check correctly", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock RPC call for slug check - slug already taken
    mockServiceClient.rpc = vi.fn().mockResolvedValueOnce({
      data: false, // slug is not available
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/workspaces", {
      method: "POST",
      body: JSON.stringify({
        name: "Test",
        slug: "test",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Workspace slug is already taken");
  });
});
