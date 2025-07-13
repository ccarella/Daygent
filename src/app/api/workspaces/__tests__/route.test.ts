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
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}));

describe("POST /api/organizations", () => {
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
  }

  const mockServiceClient: MockServiceClient = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
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
    vi.mocked(createClient).mockResolvedValue(mockAuthClient as ReturnType<typeof createClient>);
    vi.mocked(createServerClient).mockReturnValue(mockServiceClient);
  });

  it("returns 400 when name or slug is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/organizations", {
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

    const request = new NextRequest("http://localhost:3000/api/organizations", {
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

    const request = new NextRequest("http://localhost:3000/api/organizations", {
      method: "POST",
      body: JSON.stringify({ name: "Test", slug: "test" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Organization slug is already taken");
  });

  it("creates organization and adds user as owner", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockOrg = {
      id: "org-123",
      name: "Test Organization",
      slug: "test-org",
      description: "Test description",
    };

    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock slug check - not found
    mockServiceClient.single.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    // Mock organization creation - returns org data  
    mockServiceClient.single.mockResolvedValueOnce({
      data: mockOrg,
      error: null,
    });

    // Mock organization insert needs to chain with select().single()
    mockServiceClient.insert.mockReturnValueOnce(mockServiceClient);
    
    // After the org creation, we need to mock member and activity inserts
    // These just return { error: null }
    mockServiceClient.insert.mockImplementation(() => ({ error: null }));

    const request = new NextRequest("http://localhost:3000/api/organizations", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Organization",
        slug: "test-org",
        description: "Test description",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.organization).toEqual(mockOrg);

    // Verify organization was created with correct data
    expect(mockServiceClient.insert).toHaveBeenCalledWith({
      name: "Test Organization",
      slug: "test-org",
      description: "Test description",
    });

    // Verify user was added as owner
    expect(mockServiceClient.insert).toHaveBeenCalledWith({
      organization_id: "org-123",
      user_id: "user-123",
      role: "owner",
    });
  });

  it("cleans up organization if member creation fails", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockOrg = { id: "org-123", name: "Test", slug: "test" };

    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock slug check - not found
    mockServiceClient.single.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    // Mock organization creation
    mockServiceClient.single.mockResolvedValueOnce({
      data: mockOrg,
      error: null,
    });

    // Mock organization insert needs to chain with select().single()
    mockServiceClient.insert.mockReturnValueOnce(mockServiceClient);
    
    // Mock member insertion failure (second insert call)
    mockServiceClient.insert.mockReturnValueOnce({
      error: new Error("RLS policy violation"),
    });

    const request = new NextRequest("http://localhost:3000/api/organizations", {
      method: "POST",
      body: JSON.stringify({ name: "Test", slug: "test" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to add user as organization owner");

    // Verify cleanup was attempted
    expect(mockServiceClient.delete).toHaveBeenCalled();
    expect(mockServiceClient.eq).toHaveBeenCalledWith("id", "org-123");
  });

  it("handles null description correctly", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockOrg = {
      id: "org-123",
      name: "Test",
      slug: "test",
      description: null,
    };

    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockServiceClient.single.mockResolvedValueOnce({ data: null, error: null });
    mockServiceClient.single.mockResolvedValueOnce({ data: mockOrg, error: null });
    
    // Mock organization insert chains with select().single()
    mockServiceClient.insert.mockReturnValueOnce(mockServiceClient);
    // Subsequent inserts return just error status
    mockServiceClient.insert.mockImplementation(() => ({ error: null }));

    const request = new NextRequest("http://localhost:3000/api/organizations", {
      method: "POST",
      body: JSON.stringify({
        name: "Test",
        slug: "test",
        description: null,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockServiceClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
      })
    );
  });
});