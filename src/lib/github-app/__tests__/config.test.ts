import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGitHubAppConfig, clearConfigCache } from '../config';

describe('GitHub App Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    clearConfigCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearConfigCache();
  });

  it('should return valid config when all environment variables are set', () => {
    process.env.GITHUB_APP_ID = '1594213';
    process.env.GITHUB_APP_CLIENT_ID = 'Iv23liw2GpZ9hjwwydV3';
    process.env.GITHUB_APP_CLIENT_SECRET = 'test-secret';
    process.env.GITHUB_APP_WEBHOOK_SECRET = 'test-webhook-secret';

    const config = getGitHubAppConfig();

    expect(config).toEqual({
      appId: '1594213',
      clientId: 'Iv23liw2GpZ9hjwwydV3',
      clientSecret: 'test-secret',
      webhookSecret: 'test-webhook-secret',
      privateKey: undefined,
    });
  });

  it('should throw error when required environment variables are missing', () => {
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_CLIENT_ID;

    expect(() => getGitHubAppConfig()).toThrow(
      'Missing required GitHub App environment variables: GITHUB_APP_ID, GITHUB_APP_CLIENT_ID'
    );
  });

  it('should include private key when provided', () => {
    process.env.GITHUB_APP_ID = '1594213';
    process.env.GITHUB_APP_CLIENT_ID = 'Iv23liw2GpZ9hjwwydV3';
    process.env.GITHUB_APP_CLIENT_SECRET = 'test-secret';
    process.env.GITHUB_APP_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.GITHUB_APP_PRIVATE_KEY = 'test-private-key';

    const config = getGitHubAppConfig();

    expect(config.privateKey).toBe('test-private-key');
  });
});