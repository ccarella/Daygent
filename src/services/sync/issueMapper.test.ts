import { describe, it, expect } from "vitest";
import {
  mapGitHubStateToStatus,
  extractPriorityFromLabels,
  mapGitHubIssueToSyncData,
  formatIssueBodyForGitHub,
  extractOriginalDescription,
  extractPullRequestReferences,
  generateSyncSummary,
  GitHubIssue,
} from "./issueMapper";

describe("issueMapper", () => {
  describe("mapGitHubStateToStatus", () => {
    it("should map OPEN state to open status", () => {
      expect(mapGitHubStateToStatus("OPEN")).toBe("open");
    });

    it("should map CLOSED with COMPLETED reason to completed status", () => {
      expect(mapGitHubStateToStatus("CLOSED", "COMPLETED")).toBe("completed");
    });

    it("should map CLOSED with NOT_PLANNED reason to cancelled status", () => {
      expect(mapGitHubStateToStatus("CLOSED", "NOT_PLANNED")).toBe("cancelled");
    });

    it("should map CLOSED without reason to completed status", () => {
      expect(mapGitHubStateToStatus("CLOSED")).toBe("completed");
    });
  });

  describe("extractPriorityFromLabels", () => {
    it("should extract urgent priority from labels", () => {
      const labels = {
        totalCount: 1,
        nodes: [{ id: "1", name: "urgent", color: "red" }],
      };
      expect(extractPriorityFromLabels(labels)).toBe("urgent");
    });

    it("should extract high priority from labels", () => {
      const labels = {
        totalCount: 1,
        nodes: [{ id: "1", name: "priority: high", color: "orange" }],
      };
      expect(extractPriorityFromLabels(labels)).toBe("high");
    });

    it("should return null when no priority labels found", () => {
      const labels = {
        totalCount: 1,
        nodes: [{ id: "1", name: "bug", color: "red" }],
      };
      expect(extractPriorityFromLabels(labels)).toBeNull();
    });

    it("should handle case-insensitive label matching", () => {
      const labels = {
        totalCount: 1,
        nodes: [{ id: "1", name: "URGENT", color: "red" }],
      };
      expect(extractPriorityFromLabels(labels)).toBe("urgent");
    });
  });

  describe("mapGitHubIssueToSyncData", () => {
    const mockIssue: GitHubIssue = {
      id: "123",
      number: 42,
      title: "Test Issue",
      body: "Issue description",
      state: "OPEN",
      url: "https://github.com/test/repo/issues/42",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      closedAt: null,
      author: { login: "testuser" },
      assignees: { totalCount: 0, nodes: [] },
      labels: { totalCount: 0, nodes: [] },
      comments: { totalCount: 0 },
    };

    it("should map GitHub issue to sync data format", () => {
      const result = mapGitHubIssueToSyncData(mockIssue);

      expect(result).toEqual({
        github_issue_number: 42,
        github_issue_id: 123,
        title: "Test Issue",
        original_description: "Issue description",
        status: "open",
        assigned_to: null,
        updated_at: "2024-01-02T00:00:00Z",
        completed_at: null,
      });
    });

    it("should include assignee user ID when provided", () => {
      const result = mapGitHubIssueToSyncData(mockIssue, "user-123");
      expect(result.assigned_to).toBe("user-123");
    });
  });

  describe("formatIssueBodyForGitHub", () => {
    it("should format body with AI enhancements", () => {
      const result = formatIssueBodyForGitHub(
        "Original description",
        "Enhanced description",
        "open",
        "high",
      );

      expect(result).toContain("Original description");
      expect(result).toContain("🤖 AI-Enhanced Description");
      expect(result).toContain("Enhanced description");
      expect(result).toContain("**Status**: open");
      expect(result).toContain("**Priority**: high");
    });

    it("should not add AI section when no expanded description", () => {
      const result = formatIssueBodyForGitHub(
        "Original description",
        null,
        "open",
        null,
      );

      expect(result).toBe("Original description");
      expect(result).not.toContain("AI-Enhanced");
    });
  });

  describe("extractOriginalDescription", () => {
    it("should extract original description before AI section", () => {
      const body = `Original description

---
<!-- Daygent:Start -->
## 🤖 AI-Enhanced Description
Enhanced content
<!-- Daygent:End -->`;

      const result = extractOriginalDescription(body);
      expect(result).toBe("Original description");
    });

    it("should return full body when no AI section present", () => {
      const body = "Just the original description";
      const result = extractOriginalDescription(body);
      expect(result).toBe(body);
    });

    it("should handle null body", () => {
      expect(extractOriginalDescription(null)).toBeNull();
    });
  });

  describe("extractPullRequestReferences", () => {
    it("should extract PR numbers from title", () => {
      const result = extractPullRequestReferences(
        "Fix issue #123 and #456",
        null,
      );
      expect(result).toEqual([123, 456]);
    });

    it("should extract PR numbers from body", () => {
      const result = extractPullRequestReferences(
        "Test issue",
        "This fixes #789",
      );
      expect(result).toEqual([789]);
    });

    it("should return unique PR numbers", () => {
      const result = extractPullRequestReferences(
        "Fix #123",
        "Also fixes #123 and #456",
      );
      expect(result).toEqual([123, 456]);
    });

    it("should handle no PR references", () => {
      const result = extractPullRequestReferences("No references", "Just text");
      expect(result).toEqual([]);
    });
  });

  describe("generateSyncSummary", () => {
    it("should generate summary for created issues", () => {
      const result = generateSyncSummary(10, 5, 0, 0);
      expect(result).toBe("Synced 10 issues: 5 created");
    });

    it("should generate summary for updated issues", () => {
      const result = generateSyncSummary(10, 0, 8, 0);
      expect(result).toBe("Synced 10 issues: 8 updated");
    });

    it("should generate summary with errors", () => {
      const result = generateSyncSummary(10, 3, 5, 2);
      expect(result).toBe("Synced 10 issues: 3 created, 5 updated, 2 errors");
    });

    it("should handle no changes", () => {
      const result = generateSyncSummary(10, 0, 0, 0);
      expect(result).toBe("No changes");
    });
  });
});
