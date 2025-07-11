import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "../route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  })),
}));

describe("/api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST", () => {
    it("should create a new project successfully", async () => {
      const mockUser = { id: "user-123" };
      const mockRepository = { id: "repo-123", organization_id: "org-123" };
      const mockProject = {
        id: "project-123",
        name: "Test Project",
        description: "Test description",
        repository_id: "repo-123",
        status: "active",
        created_by: "user-123",
      };

      const { createClient } = await import("@/lib/supabase/server");
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "organization_members") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { role: "member" },
                error: null,
              }),
            };
          }
          if (table === "repositories") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockRepository,
                error: null,
              }),
            };
          }
          if (table === "projects") {
            // Track number of times this table is accessed
            const mockProjectsTable = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null, // No existing project
                error: null,
              }),
              insert: vi.fn().mockReturnThis(),
            };

            // Override single for insert chain to return the created project
            mockProjectsTable.insert = vi.fn().mockImplementation(() => {
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: mockProject,
                  error: null,
                }),
              };
            });

            return mockProjectsTable;
          }
          if (table === "activities") {
            return {
              insert: vi.fn().mockResolvedValue({
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabase,
      );

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({
          organization_id: "org-123",
          repository_id: "repo-123",
          name: "Test Project",
          description: "Test description",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Project created successfully");
      expect(data.project).toEqual(mockProject);
    });

    it("should return 400 if required fields are missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({
          organization_id: "org-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 401 if user is not authenticated", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error("Not authenticated"),
          }),
        },
      };

      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabase,
      );

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({
          organization_id: "org-123",
          repository_id: "repo-123",
          name: "Test Project",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 409 if project name already exists", async () => {
      const mockUser = { id: "user-123" };
      const mockRepository = { id: "repo-123", organization_id: "org-123" };

      const { createClient } = await import("@/lib/supabase/server");
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "organization_members") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { role: "member" },
                error: null,
              }),
            };
          }
          if (table === "repositories") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockRepository,
                error: null,
              }),
            };
          }
          if (table === "projects") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: "existing-project" },
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabase,
      );

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({
          organization_id: "org-123",
          repository_id: "repo-123",
          name: "Test Project",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe(
        "A project with this name already exists in the repository",
      );
    });
  });

  describe("GET", () => {
    it("should fetch projects successfully", async () => {
      const mockUser = { id: "user-123" };
      const mockProjects = [
        {
          id: "project-1",
          name: "Project 1",
          description: "Description 1",
          status: "active",
          repositories: {
            id: "repo-1",
            name: "repo1",
            full_name: "owner/repo1",
          },
        },
      ];

      const { createClient } = await import("@/lib/supabase/server");
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "organization_members") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { role: "member" },
                error: null,
              }),
            };
          }
          if (table === "projects") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: mockProjects,
                error: null,
              }),
            };
          }
          return {};
        }),
      };

      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSupabase,
      );

      const request = new NextRequest(
        "http://localhost:3000/api/projects?organization_id=org-123",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projects).toEqual(mockProjects);
    });

    it("should return 400 if organization_id is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/projects");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Organization ID is required");
    });
  });
});
