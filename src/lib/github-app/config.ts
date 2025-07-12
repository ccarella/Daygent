export interface GitHubAppConfig {
  appId: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
  privateKey?: string;
}

function validateConfig(): GitHubAppConfig {
  const config: Partial<GitHubAppConfig> = {
    appId: process.env.GITHUB_APP_ID,
    clientId: process.env.GITHUB_APP_CLIENT_ID,
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
    webhookSecret: process.env.GITHUB_APP_WEBHOOK_SECRET,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
  };

  const missingVars: string[] = [];

  if (!config.appId) missingVars.push('GITHUB_APP_ID');
  if (!config.clientId) missingVars.push('GITHUB_APP_CLIENT_ID');
  if (!config.clientSecret) missingVars.push('GITHUB_APP_CLIENT_SECRET');
  if (!config.webhookSecret) missingVars.push('GITHUB_APP_WEBHOOK_SECRET');

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required GitHub App environment variables: ${missingVars.join(', ')}`
    );
  }

  return config as GitHubAppConfig;
}

let cachedConfig: GitHubAppConfig | null = null;

export function getGitHubAppConfig(): GitHubAppConfig {
  if (!cachedConfig) {
    cachedConfig = validateConfig();
  }
  return cachedConfig;
}

// For testing purposes
export function clearConfigCache(): void {
  cachedConfig = null;
}