#!/usr/bin/env node

import { createHmac } from 'crypto';
import https from 'https';
import http from 'http';

// Test webhook payload
const payload = JSON.stringify({
  action: 'opened',
  issue: {
    number: 1,
    title: 'Test issue from webhook test script',
  },
  repository: {
    full_name: 'test/repo',
  },
});

// Your webhook secret from .env.local
const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET || 'b97d973ec9876198d4f494cf253385bade2e2dfb74d09df0c443619ec195009b';

// Calculate signature
const signature = `sha256=${createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex')}`;

// Webhook endpoint URL (update this to your deployed URL when testing production)
const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/github';

console.log('Testing GitHub webhook endpoint...');
console.log(`URL: ${webhookUrl}`);
console.log(`Signature: ${signature}`);

// Parse URL
const url = new URL(webhookUrl);
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-hub-signature-256': signature,
    'x-github-event': 'issues',
    'x-github-delivery': '12345-test-delivery',
  },
};

const protocol = url.protocol === 'https:' ? https : http;

const req = protocol.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
    
    if (res.statusCode === 200) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
});

req.write(payload);
req.end();