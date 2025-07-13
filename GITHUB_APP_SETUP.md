# GitHub App Setup Guide

This guide walks you through creating and configuring a GitHub App for Daygent.

## Creating the GitHub App

1. Go to [GitHub App Settings](https://github.com/settings/apps/new)
2. Fill in the following details:

### Basic Information
- **GitHub App name**: `daygent-dev` (or your preferred name)
- **Homepage URL**: Your application URL (e.g., `https://daygent.vercel.app`)
- **Description**: "Daygent project management integration"

### Identifying and authorizing users
- **Callback URL**: `https://your-app-url/api/github/install/callback`
- **Setup URL**: Leave blank
- **Redirect on update**: Unchecked
- **Request user authorization (OAuth) during installation**: Checked
- **Webhook active**: Checked
- **Webhook URL**: `https://your-app-url/api/webhooks/github`
- **Webhook secret**: Generate a secure random string

### Permissions

#### Repository permissions:
- **Contents**: Read
- **Issues**: Read & Write
- **Pull requests**: Read & Write
- **Metadata**: Read

#### Organization permissions:
- **Members**: Read

#### Account permissions:
- **Email addresses**: Read

### Subscribe to events:
- Issues
- Issue comment
- Pull request
- Pull request review
- Pull request review comment
- Installation
- Installation repositories

### Where can this GitHub App be installed?
- Choose "Any account" for public use or "Only on this account" for private use

## After Creating the App

1. **Generate a private key**:
   - Go to your app settings
   - Scroll to "Private keys"
   - Click "Generate a private key"
   - Save the downloaded `.pem` file

2. **Note your App ID and Client ID**:
   - Found at the top of your app settings page

3. **Generate the Client Secret**:
   - In the "Client secrets" section
   - Click "Generate a new client secret"
   - Copy it immediately (it won't be shown again)

## Environment Variables

Add these to your `.env.local` file:

```bash
# GitHub App Configuration
GITHUB_APP_ID=123456
GITHUB_APP_NAME=daygent-dev
GITHUB_APP_CLIENT_ID=Iv1.abc123def456
GITHUB_APP_CLIENT_SECRET=your_client_secret_here
GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret_here

# Base64 encode the private key:
# On macOS/Linux: base64 -i private-key.pem | tr -d '\n'
# On Windows: certutil -encode private-key.pem tmp.b64 && findstr /v /c:- tmp.b64
GITHUB_APP_PRIVATE_KEY=your_base64_encoded_private_key_here

# Optional: Override the app URL for callbacks
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Testing the Installation

1. Start your development server
2. Navigate to Settings → GitHub Integration
3. Click "Connect GitHub Account"
4. You'll be redirected to GitHub to install the app
5. Select the repositories you want to connect
6. Complete the installation

## Troubleshooting

### "GitHub App not found" error
- Ensure `GITHUB_APP_NAME` matches your app's name exactly
- Check that all environment variables are set correctly

### Installation callback fails
- Verify the callback URL in your GitHub App settings
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly if not using localhost
- Check the browser console and server logs for detailed errors

### Private key errors
- Ensure the private key is properly base64 encoded
- Remove any line breaks from the encoded string
- Verify the key hasn't expired

## Security Notes

- Never commit your `.env.local` file
- Keep your private key secure
- Rotate your webhook secret regularly
- Use different apps for development and production