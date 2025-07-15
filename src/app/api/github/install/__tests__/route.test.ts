import { NextRequest } from "next/server";
import { POST } from "../route";
import { createClient } from "@/lib/supabase/server";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("GitHub Install Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Reset environment variables
    delete process.env.GITHUB_APP_NAME;
  });

  it("returns error when GITHUB_APP_NAME is not set", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: "workspace-123" },
              }),
            })),
          })),
        })),
      })),
    };

    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new NextRequest(
      "http://localhost:3000/api/github/install",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: "workspace-123",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(
      "GitHub App is not configured. Please contact support.",
    );
  });

  it("returns install URL when GITHUB_APP_NAME is set", async () => {
    // Set the environment variable
    process.env.GITHUB_APP_NAME = "test-app";

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: "workspace-123" },
              }),
            })),
          })),
        })),
      })),
    };

    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new NextRequest(
      "http://localhost:3000/api/github/install",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: "workspace-123",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.install_url).toContain(
      "https://github.com/apps/test-app/installations/new",
    );
    expect(data.state).toContain("workspace-123:");
  });

  it("returns error when workspace_id is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/github/install",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("workspace_id is required");
  });

  it("returns error when user is not authenticated", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };

    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new NextRequest(
      "http://localhost:3000/api/github/install",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: "workspace-123",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns error when user doesn't have access to workspace", async () => {
    process.env.GITHUB_APP_NAME = "test-app";

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Not found" },
              }),
            })),
          })),
        })),
      })),
    };

    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new NextRequest(
      "http://localhost:3000/api/github/install",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: "workspace-123",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You don't have access to this workspace");
  });
});
