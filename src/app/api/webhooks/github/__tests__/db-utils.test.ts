import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRepositoryByGithubId,
  getOrCreateUserByGithubId,
  parseIssueReferences,
} from '../db-utils';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: null })),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
      })),
    })),
  })),
}));

describe('Database Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseIssueReferences', () => {
    it('should parse issue references from text', () => {
      const text = 'This PR fixes #123 and closes #456. It also resolves #789.';
      const issues = parseIssueReferences(text);
      expect(issues).toEqual([123, 456, 789]);
    });

    it('should handle various keywords', () => {
      const text = 'Fixed #1, closes #2, closed #3, resolve #4, resolved #5, fix #6';
      const issues = parseIssueReferences(text);
      expect(issues).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle no issue references', () => {
      const text = 'This is a regular commit message without issue references';
      const issues = parseIssueReferences(text);
      expect(issues).toEqual([]);
    });

    it('should handle duplicate references', () => {
      const text = 'Fixes #123 and also fixes #123 again';
      const issues = parseIssueReferences(text);
      expect(issues).toEqual([123]);
    });

    it('should be case insensitive', () => {
      const text = 'FIXES #1, Closes #2, RESOLVED #3';
      const issues = parseIssueReferences(text);
      expect(issues).toEqual([1, 2, 3]);
    });
  });

  describe('getRepositoryByGithubId', () => {
    it('should return repository data when found', async () => {
      const mockRepo = { id: 'repo-1', github_id: 12345, name: 'test-repo' };
      const { createServiceRoleClient } = await import('@/lib/supabase/server');
      const mockClient = vi.mocked(createServiceRoleClient);
      
      mockClient.mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: mockRepo, error: null })),
            })),
          })),
        })),
       
      } as any);

      const result = await getRepositoryByGithubId(12345);
      expect(result).toEqual(mockRepo);
    });

    it('should return null on error', async () => {
      const { createServiceRoleClient } = await import('@/lib/supabase/server');
      const mockClient = vi.mocked(createServiceRoleClient);
      
      mockClient.mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ 
                data: null, 
                error: new Error('Database error') 
              })),
            })),
          })),
        })),
       
      } as any);

      const result = await getRepositoryByGithubId(12345);
      expect(result).toBeNull();
    });
  });

  describe('getOrCreateUserByGithubId', () => {
    it('should return existing user if found', async () => {
      const mockUser = { 
        id: 'user-1', 
        github_id: 67890, 
        github_username: 'testuser' 
      };
      const { createServiceRoleClient } = await import('@/lib/supabase/server');
      const mockClient = vi.mocked(createServiceRoleClient);
      
      mockClient.mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: mockUser, error: null })),
            })),
          })),
          insert: vi.fn(),
        })),
       
      } as any);

      const result = await getOrCreateUserByGithubId(67890, 'testuser');
      expect(result).toEqual(mockUser);
    });

    it('should create new user if not found', async () => {
      const newUser = { 
        id: 'user-2', 
        github_id: 11111, 
        github_username: 'newuser' 
      };
      const { createServiceRoleClient } = await import('@/lib/supabase/server');
      const mockClient = vi.mocked(createServiceRoleClient);
      
      mockClient.mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: null })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({ data: newUser, error: null })),
            })),
          })),
        })),
       
      } as any);

      const result = await getOrCreateUserByGithubId(11111, 'newuser', 'newuser@example.com');
      expect(result).toEqual(newUser);
    });

    it('should use default email if not provided', async () => {
      const { createServiceRoleClient } = await import('@/lib/supabase/server');
      const mockClient = vi.mocked(createServiceRoleClient);
      
       
      let insertedData: any;
      mockClient.mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: null })),
            })),
          })),
          insert: vi.fn((data) => {
            insertedData = data;
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => ({ 
                  data: { ...data, id: 'user-3' }, 
                  error: null 
                })),
              })),
            };
          }),
        })),
       
      } as any);

      await getOrCreateUserByGithubId(22222, 'defaultuser');
      expect(insertedData.email).toBe('defaultuser@github.local');
    });
  });
});