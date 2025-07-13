import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
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

describe("GET /api/organizations/check-slug", () => {
  const mockAuthClient = {
    auth: {
      getUser: vi.fn(),
    },
  };

  interface MockServiceClient {
    from: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  }

  const mockServiceClient: MockServiceClient = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  // Setup chain methods
  mockServiceClient.from.mockReturnValue(mockServiceClient);
  mockServiceClient.select.mockReturnValue(mockServiceClient);
  mockServiceClient.eq.mockReturnValue(mockServiceClient);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(mockAuthClient as ReturnType<typeof createClient>);
    vi.mocked(createServerClient).mockReturnValue(mockServiceClient as ReturnType<typeof createServerClient>);
  });

  it("should return 400 if slug is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/organizations/check-slug");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Slug must be at least 2 characters long");
  });

  it("should return 400 if slug is too short", async () => {
    const request = new NextRequest("http://localhost:3000/api/organizations/check-slug?slug=a");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Slug must be at least 2 characters long");
  });

  it("should return 400 for invalid slug format", async () => {
    const request = new NextRequest("http://localhost:3000/api/organizations/check-slug?slug=Test-Org");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid slug format");
  });

  it("should return 401 if user is not authenticated", async () => {
    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("Unauthorized"),
    });

    const request = new NextRequest("http://localhost:3000/api/organizations/check-slug?slug=test-org");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return available: true if slug is not taken", async () => {
    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockServiceClient.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/organizations/check-slug?slug=new-org");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(true);
    expect(mockServiceClient.from).toHaveBeenCalledWith("organizations");
    expect(mockServiceClient.eq).toHaveBeenCalledWith("slug", "new-org");
  });

  it("should return available: false if slug is taken", async () => {
    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockServiceClient.maybeSingle.mockResolvedValueOnce({
      data: { id: "org-123" },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/organizations/check-slug?slug=existing-org");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);
  });

  it("should handle database errors gracefully", async () => {
    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockServiceClient.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error("Database error"),
    });

    const request = new NextRequest("http://localhost:3000/api/organizations/check-slug?slug=test-org");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to check slug availability");
  });

  it("should validate slug formats correctly", async () => {
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockServiceClient.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    // Valid slugs
    const validSlugs = ["test", "test-org", "my-awesome-org", "org123", "123org"];
    for (const slug of validSlugs) {
      const request = new NextRequest(`http://localhost:3000/api/organizations/check-slug?slug=${slug}`);
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.available).toBe(true);
    }

    // Invalid slugs
    const invalidSlugs = ["Test", "test org", "test_org", "test-", "-test", "test--org"];
    for (const slug of invalidSlugs) {
      const request = new NextRequest(`http://localhost:3000/api/organizations/check-slug?slug=${slug}`);
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid slug format");
    }
  });
});