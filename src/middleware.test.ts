import { describe, it, expect, vi, beforeEach } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';

// Mock dependencies
vi.mock('@/lib/supabase/middleware');
vi.mock('@supabase/ssr');
vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({ type: 'next' })),
    redirect: vi.fn((url) => ({ type: 'redirect', url: url.toString() })),
  },
  NextRequest: class {
    url: string;
    nextUrl: URL;
    cookies: any;
    
    constructor(url: string | URL) {
      this.url = url.toString();
      this.nextUrl = new URL(this.url);
      this.cookies = {
        getAll: vi.fn(() => [])
      };
    }
  }
}));

const mockSupabase = {
  from: vi.fn(),
};

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  it('should allow access to public paths without authentication', async () => {
    const publicPaths = ['/', '/login', '/signup', '/auth/callback'];
    
    for (const path of publicPaths) {
      const request = new NextRequest(new URL(path, 'http://localhost:3000'));
      
      await middleware(request);
      
      expect(NextResponse.next).toHaveBeenCalled();
    }
  });

  it('should redirect unauthenticated users to login', async () => {
    const request = new NextRequest(new URL('/dashboard', 'http://localhost:3000'));
    
    (updateSession as any).mockResolvedValueOnce({
      response: { type: 'next' },
      user: null,
    });
    
    await middleware(request);
    
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      new URL('/login?next=%2Fdashboard', 'http://localhost:3000')
    );
  });

  it('should allow authenticated users to access onboarding paths', async () => {
    const onboardingPaths = [
      '/onboarding/profile',
      '/onboarding/workspace',
      '/onboarding/welcome',
    ];
    
    for (const path of onboardingPaths) {
      const request = new NextRequest(new URL(path, 'http://localhost:3000'));
      
      (updateSession as any).mockResolvedValueOnce({
        response: { type: 'next' },
        user: { id: 'user-123' },
      });
      
      await middleware(request);
      
      expect(response).toEqual({ type: 'next' });
    }
  });

  it('should redirect users without workspace to workspace onboarding', async () => {
    const request = new NextRequest(new URL('/dashboard', 'http://localhost:3000'));
    
    (updateSession as any).mockResolvedValueOnce({
      response: { type: 'next' },
      user: { id: 'user-123' },
    });
    
    // Mock workspace query - no workspaces
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    });
    
    await middleware(request);
    
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      new URL('/onboarding/workspace', 'http://localhost:3000')
    );
  });

  it('should allow users with workspace to access dashboard', async () => {
    const request = new NextRequest(new URL('/dashboard', 'http://localhost:3000'));
    
    (updateSession as any).mockResolvedValueOnce({
      response: { type: 'next' },
      user: { id: 'user-123' },
    });
    
    // Mock workspace query - has workspace
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ 
            data: [{ workspace_id: 'workspace-123' }], 
            error: null 
          })),
        })),
      })),
    });
    
    const result = await middleware(request);
    
    expect(result).toEqual({ type: 'next' });
  });

  it('should check workspace membership for protected routes', async () => {
    const protectedRoutes = [
      '/dashboard',
      '/issues',
      '/repositories',
      '/settings',
    ];
    
    for (const path of protectedRoutes) {
      const request = new NextRequest(new URL(path, 'http://localhost:3000'));
      
      (updateSession as any).mockResolvedValueOnce({
        response: { type: 'next' },
        user: { id: 'user-123' },
      });
      
      // Mock workspace query
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ 
              data: [{ workspace_id: 'workspace-123' }], 
              error: null 
            })),
          })),
        })),
      });
      
      await middleware(request);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('workspace_members');
    }
  });
});