import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleIssueEvent } from "../issues";

// Mock dependencies
vi.mock("../../db-utils", () => ({
  getRepositoryByGithubId: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(),
}));

import { getRepositoryByGithubId } from "../../db-utils";
import { createServiceRoleClient } from "@/lib/supabase/server";

describe("handleIssueEvent with new schema", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createServiceRoleClient as any).mockResolvedValue(mockSupabase);
  });

  it("should handle issue opened event", async () => {
    const mockRepository = {
      id: "repo-123",
      workspace_id: "workspace-123",
      github_id: 12345,
    };

    (getRepositoryByGithubId as any).mockResolvedValue(mockRepository);

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({
      upsert: mockUpsert,
    });

    const payload = {
      action: "opened",
      issue: {
        number: 1,
        id: 101,
        node_id: "MDU6SXNzdWUxMDE=",
        title: "New Issue",
        body: "Issue description",
        state: "open",
        user: { login: "testuser" },
        assignee: { login: "assignee1" },
        labels: [
          { name: "bug", color: "d73a4a", description: "Something isn't working" },
          { name: "enhancement", color: "a2eeef", description: "New feature" },
        ],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        closed_at: null,
      },
      repository: { id: 12345, full_name: "owner/repo" },
    };

    await handleIssueEvent(payload);

    expect(getRepositoryByGithubId).toHaveBeenCalledWith(12345);
    expect(mockSupabase.from).toHaveBeenCalledWith("issues");
    expect(mockUpsert).toHaveBeenCalledWith({
      repository_id: "repo-123",
      workspace_id: "workspace-123",
      github_issue_number: 1,
      github_issue_id: 101,
      github_node_id: "MDU6SXNzdWUxMDE=",
      title: "New Issue",
      body: "Issue description",
      state: "open",
      author_github_login: "testuser",
      assignee_github_login: "assignee1",
      labels: [
        { name: "bug", color: "d73a4a", description: "Something isn't working" },
        { name: "enhancement", color: "a2eeef", description: "New feature" },
      ],
      github_created_at: "2024-01-01T00:00:00Z",
      github_updated_at: "2024-01-01T00:00:00Z",
      github_closed_at: null,
    });
  });

  it("should handle issue closed event", async () => {
    const mockRepository = {
      id: "repo-123",
      workspace_id: "workspace-123",
      github_id: 12345,
    };

    (getRepositoryByGithubId as any).mockResolvedValue(mockRepository);

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({
      upsert: mockUpsert,
    });

    const payload = {
      action: "closed",
      issue: {
        number: 1,
        id: 101,
        node_id: "MDU6SXNzdWUxMDE=",
        title: "Closed Issue",
        body: "Issue description",
        state: "closed",
        user: { login: "testuser" },
        assignee: null,
        labels: [],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        closed_at: "2024-01-02T00:00:00Z",
      },
      repository: { id: 12345, full_name: "owner/repo" },
    };

    await handleIssueEvent(payload);

    expect(mockUpsert).toHaveBeenCalledWith({
      repository_id: "repo-123",
      workspace_id: "workspace-123",
      github_issue_number: 1,
      github_issue_id: 101,
      github_node_id: "MDU6SXNzdWUxMDE=",
      title: "Closed Issue",
      body: "Issue description",
      state: "closed",
      author_github_login: "testuser",
      assignee_github_login: null,
      labels: [],
      github_created_at: "2024-01-01T00:00:00Z",
      github_updated_at: "2024-01-02T00:00:00Z",
      github_closed_at: "2024-01-02T00:00:00Z",
    });
  });

  it("should handle issue assigned event", async () => {
    const mockRepository = {
      id: "repo-123",
      workspace_id: "workspace-123",
      github_id: 12345,
    };

    (getRepositoryByGithubId as any).mockResolvedValue(mockRepository);

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    mockSupabase.from.mockReturnValue({
      update: mockUpdate,
    });

    const payload = {
      action: "assigned",
      issue: {
        number: 1,
        assignee: { login: "newassignee" },
        updated_at: "2024-01-02T00:00:00Z",
      },
      repository: { id: 12345, full_name: "owner/repo" },
    };

    await handleIssueEvent(payload);

    expect(mockSupabase.from).toHaveBeenCalledWith("issues");
    expect(mockUpdate).toHaveBeenCalledWith({
      assignee_github_login: "newassignee",
      github_updated_at: "2024-01-02T00:00:00Z",
    });
  });

  it("should handle issue labeled event", async () => {
    const mockRepository = {
      id: "repo-123",
      workspace_id: "workspace-123",
      github_id: 12345,
    };

    (getRepositoryByGithubId as any).mockResolvedValue(mockRepository);

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    mockSupabase.from.mockReturnValue({
      update: mockUpdate,
    });

    const payload = {
      action: "labeled",
      issue: {
        number: 1,
        labels: [
          { name: "bug", color: "d73a4a", description: "Something isn't working" },
          { name: "priority", color: "ff0000", description: "High priority" },
        ],
        updated_at: "2024-01-02T00:00:00Z",
      },
      repository: { id: 12345, full_name: "owner/repo" },
    };

    await handleIssueEvent(payload);

    expect(mockUpdate).toHaveBeenCalledWith({
      labels: [
        { name: "bug", color: "d73a4a", description: "Something isn't working" },
        { name: "priority", color: "ff0000", description: "High priority" },
      ],
      github_updated_at: "2024-01-02T00:00:00Z",
    });
  });

  it("should skip processing if repository not found", async () => {
    (getRepositoryByGithubId as any).mockResolvedValue(null);

    const payload = {
      action: "opened",
      issue: { number: 1 },
      repository: { id: 12345, full_name: "owner/repo" },
    };

    await handleIssueEvent(payload);

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("should handle invalid payload gracefully", async () => {
    const invalidPayload = {
      // Missing required fields
      action: "opened",
    };

    await handleIssueEvent(invalidPayload);

    expect(getRepositoryByGithubId).not.toHaveBeenCalled();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});