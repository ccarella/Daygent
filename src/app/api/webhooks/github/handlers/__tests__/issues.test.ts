import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleIssueEvent } from '../issues';
import { IssuesEvent } from '@octokit/webhooks-types';

// Mock db-utils
vi.mock('../../db-utils', () => ({
  getRepositoryByGithubId: vi.fn(),
  getOrCreateUserByGithubId: vi.fn(),
  syncIssue: vi.fn(),
  logActivity: vi.fn(),
}));

import * as dbUtils from '../../db-utils';

describe('Issue Event Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  const createMockIssueEvent = (overrides: Partial<IssuesEvent> = {}): IssuesEvent => ({
    action: 'opened',
    issue: {
      id: 1,
      number: 123,
      title: 'Test Issue',
      body: 'Test issue body',
      state: 'open',
      assignee: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      closed_at: null,
      user: {
        id: 100,
        login: 'testuser',
        type: 'User',
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    repository: {
      id: 12345,
      name: 'test-repo',
      full_name: 'owner/test-repo',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    sender: {
      id: 100,
      login: 'testuser',
      email: 'test@example.com',
      type: 'User',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    ...overrides,
  } as IssuesEvent);

  it('should handle issue opened event', async () => {
    const mockRepo = { id: 'repo-1', organization_id: 'org-1' };
    const mockUser = { id: 'user-1' };
    const mockIssue = { id: 'issue-1', project_id: 'project-1' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(dbUtils.getRepositoryByGithubId).mockResolvedValue(mockRepo as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(dbUtils.getOrCreateUserByGithubId).mockResolvedValue(mockUser as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(dbUtils.syncIssue).mockResolvedValue(mockIssue as any);

    const event = createMockIssueEvent();
    await handleIssueEvent(event);

    expect(dbUtils.getRepositoryByGithubId).toHaveBeenCalledWith(12345);
    expect(dbUtils.syncIssue).toHaveBeenCalledWith('repo-1', {
      github_issue_number: 123,
      github_issue_id: 1,
      title: 'Test Issue',
      original_description: 'Test issue body',
      status: 'open',
      assigned_to: null,
      updated_at: '2024-01-01T00:00:00Z',
      completed_at: null,
    });
    expect(dbUtils.logActivity).toHaveBeenCalledWith(
      'issue_created',
      expect.objectContaining({
        action: 'opened',
        issue_number: 123,
        issue_title: 'Test Issue',
      }),
      'user-1',
      'org-1',
      'repo-1',
      'project-1',
      'issue-1'
    );
  });

  it('should handle issue closed event', async () => {
    const mockRepo = { id: 'repo-1', organization_id: 'org-1' };
    const mockUser = { id: 'user-1' };
    const mockIssue = { id: 'issue-1', project_id: 'project-1' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(dbUtils.getRepositoryByGithubId).mockResolvedValue(mockRepo as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(dbUtils.getOrCreateUserByGithubId).mockResolvedValue(mockUser as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(dbUtils.syncIssue).mockResolvedValue(mockIssue as any);

    const event = createMockIssueEvent({
      action: 'closed',
      issue: {
        state: 'closed',
        closed_at: '2024-01-02T00:00:00Z',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    await handleIssueEvent(event);

    expect(dbUtils.syncIssue).toHaveBeenCalledWith('repo-1', expect.objectContaining({
      status: 'completed',
      completed_at: '2024-01-02T00:00:00Z',
    }));
    expect(dbUtils.logActivity).toHaveBeenCalledWith(
      'issue_completed',
      expect.any(Object),
      'user-1',
      'org-1',
      'repo-1',
      'project-1',
      'issue-1'
    );
  });

  it('should handle issue assigned event', async () => {
    const mockRepo = { id: 'repo-1', organization_id: 'org-1' };
    const mockSender = { id: 'user-1' };
    const mockAssignee = { id: 'user-2' };
    const mockIssue = { id: 'issue-1', project_id: 'project-1' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(dbUtils.getRepositoryByGithubId).mockResolvedValue(mockRepo as any);
    vi.mocked(dbUtils.getOrCreateUserByGithubId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce(mockAssignee as any) // First call for assignee
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce(mockSender as any); // Second call for sender
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(dbUtils.syncIssue).mockResolvedValue(mockIssue as any);

    const event = createMockIssueEvent({
      action: 'assigned',
      issue: {
        state: 'open',
        assignee: {
          id: 200,
          login: 'assignee',
          email: 'assignee@example.com',
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    await handleIssueEvent(event);

    expect(dbUtils.syncIssue).toHaveBeenCalledWith('repo-1', expect.objectContaining({
      status: 'in_progress',
      assigned_to: 'user-2',
    }));
    expect(dbUtils.logActivity).toHaveBeenCalledWith(
      'issue_assigned',
      expect.objectContaining({
        action: 'assigned',
        assignee: 'assignee',
      }),
      'user-1',
      'org-1',
      'repo-1',
      'project-1',
      'issue-1'
    );
  });

  it('should handle invalid payload', async () => {
    await handleIssueEvent({ invalid: 'payload' });
    
    expect(dbUtils.getRepositoryByGithubId).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('[Issue Handler] Invalid payload type');
  });

  it('should handle repository not found', async () => {
    vi.mocked(dbUtils.getRepositoryByGithubId).mockResolvedValue(null);

    const event = createMockIssueEvent();
    await handleIssueEvent(event);

    expect(console.warn).toHaveBeenCalledWith(
      '[Issue Handler] Repository not found: owner/test-repo'
    );
    expect(dbUtils.syncIssue).not.toHaveBeenCalled();
  });

  it('should handle sync failure gracefully', async () => {
    const mockRepo = { id: 'repo-1', organization_id: 'org-1' };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(dbUtils.getRepositoryByGithubId).mockResolvedValue(mockRepo as any);
    vi.mocked(dbUtils.syncIssue).mockResolvedValue(null);

    const event = createMockIssueEvent();
    await handleIssueEvent(event);

    expect(console.error).toHaveBeenCalledWith('[Issue Handler] Failed to sync issue');
    expect(dbUtils.logActivity).not.toHaveBeenCalled();
  });

  it('should not throw on database errors', async () => {
    vi.mocked(dbUtils.getRepositoryByGithubId).mockRejectedValue(new Error('DB Error'));

    const event = createMockIssueEvent();
    
    // Should not throw
    await expect(handleIssueEvent(event)).resolves.not.toThrow();
    
    expect(console.error).toHaveBeenCalledWith(
      '[Issue Handler] Error processing issue event:',
      expect.any(Error)
    );
  });
});