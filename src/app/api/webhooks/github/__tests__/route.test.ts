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

import { POST, GET } from '../route';
import * as githubApp from '@/lib/github-app';

describe('GitHub Webhook Route', () => {
  const mockVerifyWebhookSignature = vi.mocked(githubApp.verifyWebhookSignature);
  
  beforeEach(() => {
    vi.clearAllMocks();
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

    it('should handle errors gracefully', async () => {
      mockVerifyWebhookSignature.mockImplementation(() => {
        throw new Error('Test error');
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=test',
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process webhook');
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