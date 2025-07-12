import * as crypto from 'crypto';
import { getGitHubAppConfig } from './config';

export interface WebhookHeaders {
  'x-hub-signature-256'?: string;
  'x-github-event'?: string;
  'x-github-delivery'?: string;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string | undefined
): boolean {
  if (!signature) {
    return false;
  }

  const config = getGitHubAppConfig();
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', config.webhookSecret)
    .update(payload)
    .digest('hex')}`;

  // Use length-constant comparison only if lengths match
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export function parseWebhookHeaders(headers: Headers): WebhookHeaders {
  return {
    'x-hub-signature-256': headers.get('x-hub-signature-256') || undefined,
    'x-github-event': headers.get('x-github-event') || undefined,
    'x-github-delivery': headers.get('x-github-delivery') || undefined,
  };
}