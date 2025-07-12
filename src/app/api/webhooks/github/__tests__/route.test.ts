import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the GitHub App module before importing the route
vi.mock('@/lib/github-app', () => ({
  verifyWebhookSignature: vi.fn(),
  parseWebhookHeaders: vi.fn((headers: Headers) => ({
    'x-hub-signature-256': headers.get('x-hub-signature-256') || undefined,
    'x-github-event': headers.get('x-github-event') || undefined,
    'x-github-delivery': headers.get('x-github-delivery') || undefined,
  })),
}));

// Mock the handlers
vi.mock('../handlers', () => ({
  handleIssueEvent: vi.fn(),
  handleIssueCommentEvent: vi.fn(),
  handlePullRequestEvent: vi.fn(),
  handlePullRequestReviewEvent: vi.fn(),
  handleInstallationEvent: vi.fn(),
  handleInstallationRepositoriesEvent: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'system-user-id' },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

// Mock db-utils
vi.mock('../db-utils', () => ({
  logActivity: vi.fn(),
}));

import { POST, GET } from '../route';
import * as githubApp from '@/lib/github-app';

// Declare the global test helper
declare global {
  var __clearWebhookDeliveryCache: () => void;
}

describe('GitHub Webhook Route', () => {
  const mockVerifyWebhookSignature = vi.mocked(githubApp.verifyWebhookSignature);
  
  beforeEach(() => {
    vi.clearAllMocks();
    if (global.__clearWebhookDeliveryCache) {
      global.__clearWebhookDeliveryCache();
    }
  });

  describe('POST /api/webhooks/github', () => {
    it('should accept valid webhook with correct signature', async () => {
      mockVerifyWebhookSignature.mockReturnValue(true);

      const payload = JSON.stringify({
        action: 'opened',
        issue: { number: 1, title: 'Test Issue' },
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=valid',
          'x-github-event': 'issues',
          'x-github-delivery': '12345',
        },
        body: payload,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook processed successfully');
    });

    it('should reject webhook with invalid signature', async () => {
      mockVerifyWebhookSignature.mockReturnValue(false);

      const payload = JSON.stringify({
        action: 'opened',
        issue: { number: 1 },
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=invalid',
          'x-github-event': 'issues',
        },
        body: payload,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
    });

    it('should handle different event types', async () => {
      mockVerifyWebhookSignature.mockReturnValue(true);

      const eventTypes = [
        'issues',
        'issue_comment',
        'pull_request',
        'pull_request_review',
        'installation',
        'installation_repositories',
      ];

      for (const eventType of eventTypes) {
        const request = new NextRequest('http://localhost:3000/api/webhooks/github', {
          method: 'POST',
          headers: {
            'x-hub-signature-256': 'sha256=valid',
            'x-github-event': eventType,
          },
          body: JSON.stringify({ action: 'test' }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });

    it('should handle unknown event types gracefully', async () => {
      mockVerifyWebhookSignature.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=valid',
          'x-github-event': 'unknown_event',
        },
        body: JSON.stringify({ action: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook processed successfully');
    });

    it('should handle errors gracefully and still return 200', async () => {
      mockVerifyWebhookSignature.mockImplementation(() => {
        throw new Error('Test error');
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=test',
          'x-github-event': 'issues',
          'x-github-delivery': '12345',
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      // Should return 200 even on error to prevent GitHub retries
      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook received but processing failed');
      expect(data.event).toBe('issues');
      expect(data.delivery_id).toBe('12345');
    });

    it('should handle duplicate deliveries', async () => {
      mockVerifyWebhookSignature.mockReturnValue(true);

      const payload = JSON.stringify({
        action: 'opened',
        issue: { number: 1, title: 'Test Issue' },
      });

      const request1 = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=valid',
          'x-github-event': 'issues',
          'x-github-delivery': 'duplicate-12345',
        },
        body: payload,
      });

      // First request
      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Create a new request for the duplicate (can't reuse request body)
      const request2 = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=valid',
          'x-github-event': 'issues',
          'x-github-delivery': 'duplicate-12345',
        },
        body: payload,
      });

      // Duplicate request
      const response2 = await POST(request2);
      const data2 = await response2.json();
      expect(response2.status).toBe(200);
      expect(data2.message).toBe('Webhook already processed');
      expect(data2.delivery_id).toBe('duplicate-12345');
    });

    it('should handle ping events', async () => {
      mockVerifyWebhookSignature.mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=valid',
          'x-github-event': 'ping',
          'x-github-delivery': '12345',
        },
        body: JSON.stringify({ zen: 'Design for failure.' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Webhook processed successfully');
    });
  });

  describe('GET /api/webhooks/github', () => {
    it('should return status message', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('GitHub webhook endpoint is working');
      expect(data.info).toBe('This endpoint accepts POST requests from GitHub');
    });
  });
});