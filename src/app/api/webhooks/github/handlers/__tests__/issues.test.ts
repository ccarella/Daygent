import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleIssueEvent } from "../issues";
import * as dbUtils from "../../db-utils";
import type { IssuesEvent } from "../../types";
import { createServiceRoleClient } from "@/lib/supabase/server";

vi.mock("../../db-utils");
vi.mock("@/lib/supabase/server");

describe("Issues Webhook Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockIssueEvent = (
    action: IssuesEvent["action"] = "opened",
  ): IssuesEvent =>
    ({
      action,
      issue: {
        id: 12345,
        node_id: "I_123456",
        number: 123,
        title: "Test Issue",
        body: "Test issue body",
        state: "open",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        closed_at: null,
        url: "https://api.github.com/repos/org/test-repo/issues/123",
        repository_url: "https://api.github.com/repos/org/test-repo",
        labels_url:
          "https://api.github.com/repos/org/test-repo/issues/123/labels{/name}",
        comments_url:
          "https://api.github.com/repos/org/test-repo/issues/123/comments",
        events_url:
          "https://api.github.com/repos/org/test-repo/issues/123/events",
        html_url: "https://github.com/org/test-repo/issues/123",
        locked: false,
        active_lock_reason: null,
        milestone: null,
        comments: 0,
        author_association: "CONTRIBUTOR",
        reactions: {
          url: "https://api.github.com/repos/org/test-repo/issues/123/reactions",
          total_count: 0,
          "+1": 0,
          "-1": 0,
          laugh: 0,
          hooray: 0,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0,
        },
        user: {
          login: "testuser",
          id: 789,
          node_id: "U_789",
          avatar_url: "https://avatars.githubusercontent.com/u/789",
          gravatar_id: "",
          url: "https://api.github.com/users/testuser",
          html_url: "https://github.com/testuser",
          followers_url: "https://api.github.com/users/testuser/followers",
          following_url:
            "https://api.github.com/users/testuser/following{/other_user}",
          gists_url: "https://api.github.com/users/testuser/gists{/gist_id}",
          starred_url:
            "https://api.github.com/users/testuser/starred{/owner}{/repo}",
          subscriptions_url:
            "https://api.github.com/users/testuser/subscriptions",
          organizations_url: "https://api.github.com/users/testuser/orgs",
          repos_url: "https://api.github.com/users/testuser/repos",
          events_url: "https://api.github.com/users/testuser/events{/privacy}",
          received_events_url:
            "https://api.github.com/users/testuser/received_events",
          type: "User",
          site_admin: false,
        },
        assignee: null,
        assignees: [],
        labels: [],
      } as unknown as IssuesEvent["issue"],
      repository: {
        id: 456,
        node_id: "R_456",
        name: "test-repo",
        full_name: "org/test-repo",
        private: false,
        owner: {
          login: "org",
          id: 789,
          node_id: "O_789",
          avatar_url: "https://avatars.githubusercontent.com/u/789",
          gravatar_id: "",
          url: "https://api.github.com/users/org",
          html_url: "https://github.com/org",
          followers_url: "https://api.github.com/users/org/followers",
          following_url:
            "https://api.github.com/users/org/following{/other_user}",
          gists_url: "https://api.github.com/users/org/gists{/gist_id}",
          starred_url:
            "https://api.github.com/users/org/starred{/owner}{/repo}",
          subscriptions_url: "https://api.github.com/users/org/subscriptions",
          organizations_url: "https://api.github.com/users/org/orgs",
          repos_url: "https://api.github.com/users/org/repos",
          events_url: "https://api.github.com/users/org/events{/privacy}",
          received_events_url:
            "https://api.github.com/users/org/received_events",
          type: "Organization",
          site_admin: false,
        },
      } as unknown as IssuesEvent["repository"],
      sender: {
        login: "sender",
        id: 999,
        node_id: "U_999",
        avatar_url: "https://avatars.githubusercontent.com/u/999",
        gravatar_id: "",
        url: "https://api.github.com/users/sender",
        html_url: "https://github.com/sender",
        followers_url: "https://api.github.com/users/sender/followers",
        following_url:
          "https://api.github.com/users/sender/following{/other_user}",
        gists_url: "https://api.github.com/users/sender/gists{/gist_id}",
        starred_url:
          "https://api.github.com/users/sender/starred{/owner}{/repo}",
        subscriptions_url: "https://api.github.com/users/sender/subscriptions",
        organizations_url: "https://api.github.com/users/sender/orgs",
        repos_url: "https://api.github.com/users/sender/repos",
        events_url: "https://api.github.com/users/sender/events{/privacy}",
        received_events_url:
          "https://api.github.com/users/sender/received_events",
        type: "User",
        site_admin: false,
      },
      assignee:
        action === "assigned"
          ? {
              login: "assignee",
              id: 111,
              node_id: "U_111",
              avatar_url: "https://avatars.githubusercontent.com/u/111",
              gravatar_id: "",
              url: "https://api.github.com/users/assignee",
              html_url: "https://github.com/assignee",
              followers_url: "https://api.github.com/users/assignee/followers",
              following_url:
                "https://api.github.com/users/assignee/following{/other_user}",
              gists_url:
                "https://api.github.com/users/assignee/gists{/gist_id}",
              starred_url:
                "https://api.github.com/users/assignee/starred{/owner}{/repo}",
              subscriptions_url:
                "https://api.github.com/users/assignee/subscriptions",
              organizations_url: "https://api.github.com/users/assignee/orgs",
              repos_url: "https://api.github.com/users/assignee/repos",
              events_url:
                "https://api.github.com/users/assignee/events{/privacy}",
              received_events_url:
                "https://api.github.com/users/assignee/received_events",
              type: "User",
              site_admin: false,
            }
          : undefined,
    }) as unknown as IssuesEvent;

  it("should handle issue opened event", async () => {
    const mockRepo = { id: "repo-1", workspace_id: "ws-1" };

    vi.mocked(dbUtils.getRepositoryByGithubId).mockResolvedValue(mockRepo);

    const mockUpsert = vi.fn(() => ({ error: null }));
    const mockFromResult = {
      upsert: mockUpsert,
    };
    const mockSupabase = {
      from: vi.fn(() => mockFromResult),
    };
    vi.mocked(createServiceRoleClient).mockResolvedValue(mockSupabase as any);

    const event = createMockIssueEvent();
    await handleIssueEvent(event);

    expect(dbUtils.getRepositoryByGithubId).toHaveBeenCalledWith(456);
    expect(mockSupabase.from).toHaveBeenCalledWith("issues");
    expect(mockUpsert).toHaveBeenCalledWith({
      repository_id: "repo-1",
      workspace_id: "ws-1",
      github_issue_number: 123,
      github_issue_id: 12345,
      github_node_id: "I_123456",
      title: "Test Issue",
      body: "Test issue body",
      state: "open",
      author_github_login: "testuser",
      assignee_github_login: undefined,
      labels: [],
      github_created_at: "2024-01-01T00:00:00Z",
      github_updated_at: "2024-01-01T00:00:00Z",
      github_closed_at: null,
    });
  });

  it("should handle issue closed event", async () => {
    const mockRepo = { id: "repo-1", workspace_id: "ws-1" };

    vi.mocked(dbUtils.getRepositoryByGithubId).mockResolvedValue(mockRepo);

    const mockUpsert = vi.fn(() => ({ error: null }));
    const mockFromResult = {
      upsert: mockUpsert,
    };
    const mockSupabase = {
      from: vi.fn(() => mockFromResult),
    };
    vi.mocked(createServiceRoleClient).mockResolvedValue(mockSupabase as any);

    const event = createMockIssueEvent("closed");
    event.issue.state = "closed";
    event.issue.closed_at = "2024-01-01T01:00:00Z";

    await handleIssueEvent(event);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "closed",
        github_closed_at: "2024-01-01T01:00:00Z",
      }),
    );
  });

  it("should handle issue assigned event", async () => {
    const mockRepo = { id: "repo-1", workspace_id: "ws-1" };

    vi.mocked(dbUtils.getRepositoryByGithubId).mockResolvedValue(mockRepo);

    const mockEq = vi.fn(() => ({ error: null }));
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: mockEq,
      })),
    }));
    const mockFromResult = {
      update: mockUpdate,
    };
    const mockSupabase = {
      from: vi.fn(() => mockFromResult),
    };
    vi.mocked(createServiceRoleClient).mockResolvedValue(mockSupabase as any);

    const event = createMockIssueEvent("assigned");
    event.issue.assignee = {
      login: "assignee",
      id: 111,
      node_id: "U_111",
      avatar_url: "https://avatars.githubusercontent.com/u/111",
      gravatar_id: "",
      url: "https://api.github.com/users/assignee",
      html_url: "https://github.com/assignee",
      followers_url: "https://api.github.com/users/assignee/followers",
      following_url:
        "https://api.github.com/users/assignee/following{/other_user}",
      gists_url: "https://api.github.com/users/assignee/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/assignee/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/assignee/subscriptions",
      organizations_url: "https://api.github.com/users/assignee/orgs",
      repos_url: "https://api.github.com/users/assignee/repos",
      events_url: "https://api.github.com/users/assignee/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/assignee/received_events",
      type: "User",
      site_admin: false,
    };

    await handleIssueEvent(event);

    expect(dbUtils.getRepositoryByGithubId).toHaveBeenCalledWith(456);
    expect(mockSupabase.from).toHaveBeenCalledWith("issues");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        assignee_github_login: "assignee",
      }),
    );
  });

  it("should handle invalid payload", async () => {
    await handleIssueEvent({ invalid: "payload" } as any);

    expect(console.error).toHaveBeenCalledWith(
      "[Issue Handler] Invalid payload type",
    );
    expect(dbUtils.getRepositoryByGithubId).not.toHaveBeenCalled();
  });

  it("should handle repository not found", async () => {
    vi.mocked(dbUtils.getRepositoryByGithubId).mockResolvedValue(null);

    const event = createMockIssueEvent();
    await handleIssueEvent(event);

    // The handler uses console.warn, not console.error for repository not found
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await handleIssueEvent(event);

    expect(warnSpy).toHaveBeenCalledWith(
      "[Issue Handler] Repository not found: org/test-repo",
    );
    expect(createServiceRoleClient).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("should not throw on database errors", async () => {
    vi.mocked(dbUtils.getRepositoryByGithubId).mockRejectedValue(
      new Error("DB Error"),
    );

    const event = createMockIssueEvent();

    // Should not throw
    await expect(handleIssueEvent(event)).resolves.not.toThrow();

    expect(console.error).toHaveBeenCalledWith(
      "[Issue Handler] Error processing issue event:",
      expect.any(Error),
    );
  });
});
