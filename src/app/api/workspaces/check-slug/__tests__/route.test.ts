import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("POST /api/workspaces/check-slug", () => {
  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
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

  it("should return 400 if slug is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/workspaces/check-slug",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Slug must be at least 3 characters long");
  });

  it("should return 400 if slug is too short", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/workspaces/check-slug",
      {
        method: "POST",
        body: JSON.stringify({ slug: "ab" }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Slug must be at least 3 characters long");
  });

  it("should return 400 for invalid slug format", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/workspaces/check-slug",
      {
        method: "POST",
        body: JSON.stringify({ slug: "Test Workspace" }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Slug must contain only lowercase letters, numbers, and hyphens",
    );
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/workspaces/check-slug",
      {
        method: "POST",
        body: JSON.stringify({ slug: "test-workspace" }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return available: true if slug is not taken", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockFrom.single.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/workspaces/check-slug",
      {
        method: "POST",
        body: JSON.stringify({ slug: "new-workspace" }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(true);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("workspaces");
    expect(mockFrom.eq).toHaveBeenCalledWith("slug", "new-workspace");
  });

  it("should return available: false if slug is taken", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockFrom.single.mockResolvedValueOnce({
      data: { id: "workspace-123" },
      error: null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/workspaces/check-slug",
      {
        method: "POST",
        body: JSON.stringify({ slug: "existing-workspace" }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);
  });

  it("should validate slug formats correctly", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockFrom.single.mockResolvedValue({
      data: null,
      error: null,
    });

    // Valid slugs
    const validSlugs = [
      "test",
      "test-workspace",
      "my-awesome-workspace",
      "workspace123",
      "123workspace",
      "test-123-workspace",
    ];
    for (const slug of validSlugs) {
      const request = new NextRequest(
        "http://localhost:3000/api/workspaces/check-slug",
        {
          method: "POST",
          body: JSON.stringify({ slug }),
        },
      );
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.available).toBe(true);
    }

    // Invalid slugs
    const invalidSlugs = [
      "Test",
      "test workspace",
      "test_workspace",
      "test!",
      "@test",
      "test.workspace",
    ];
    for (const slug of invalidSlugs) {
      const request = new NextRequest(
        "http://localhost:3000/api/workspaces/check-slug",
        {
          method: "POST",
          body: JSON.stringify({ slug }),
        },
      );
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Slug must contain only lowercase letters, numbers, and hyphens",
      );
    }
  });
});
