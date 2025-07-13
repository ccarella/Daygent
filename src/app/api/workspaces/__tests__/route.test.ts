import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
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

  // Mock environment variables
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

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
      created_by: mockUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock slug check - no existing workspace
    mockServiceClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows found" },
    });

    // Mock RPC call for workspace creation
    mockServiceClient.rpc = vi.fn().mockResolvedValueOnce({
      data: mockWorkspace.id,
      error: null,
    });

    // Mock fetching the created workspace
    mockServiceClient.single.mockResolvedValueOnce({
      data: mockWorkspace,
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

    expect(response.status).toBe(200);
    expect(data.workspace).toEqual(mockWorkspace);

    // Verify RPC call was made correctly
    expect(mockServiceClient.rpc).toHaveBeenCalledWith(
      "create_workspace_with_member",
      {
        p_name: "Test Workspace",
        p_slug: "test-workspace",
        p_user_id: mockUser.id,
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

    // Mock slug check - workspace already exists
    mockServiceClient.single.mockResolvedValueOnce({
      data: { slug: "test" },
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

describe("GET /api/workspaces", () => {
  const mockAuthClient = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(mockAuthClient as any);
  });

  it("returns 401 if user is not authenticated", async () => {
    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns user workspaces successfully", async () => {
    const mockUser = { id: "test-user-id" };
    const mockWorkspaces = [
      {
        workspace_id: "workspace-1",
        workspace: {
          id: "workspace-1",
          name: "Test Workspace 1",
          slug: "test-workspace-1",
          created_by: "test-user-id",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      {
        workspace_id: "workspace-2",
        workspace: {
          id: "workspace-2",
          name: "Test Workspace 2",
          slug: "test-workspace-2",
          created_by: "another-user-id",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ];

    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValueOnce({
      data: mockWorkspaces,
      error: null,
    });

    mockAuthClient.from.mockReturnValueOnce({
      select: mockSelect,
      eq: mockEq,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockAuthClient.from).toHaveBeenCalledWith("workspace_members");
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining("workspace:workspaces(*)"));
    expect(mockEq).toHaveBeenCalledWith("user_id", mockUser.id);
    expect(data.workspaces).toHaveLength(2);
    expect(data.workspaces[0]).toEqual(mockWorkspaces[0].workspace);
    expect(data.workspaces[1]).toEqual(mockWorkspaces[1].workspace);
  });

  it("returns 500 if database query fails", async () => {
    const mockUser = { id: "test-user-id" };

    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: "Database error" },
    });

    mockAuthClient.from.mockReturnValueOnce({
      select: mockSelect,
      eq: mockEq,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch workspaces");
  });

  it("returns empty array if user has no workspaces", async () => {
    const mockUser = { id: "test-user-id" };

    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockAuthClient.from.mockReturnValueOnce({
      select: mockSelect,
      eq: mockEq,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workspaces).toEqual([]);
  });
});
