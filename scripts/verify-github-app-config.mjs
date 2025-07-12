#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('GitHub App Configuration Verification\n');
console.log('=====================================\n');

try {
  // Read .env.local file
  const envPath = join(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  
  const requiredVars = [
    'GITHUB_APP_ID',
    'GITHUB_APP_CLIENT_ID', 
    'GITHUB_APP_CLIENT_SECRET',
    'GITHUB_APP_WEBHOOK_SECRET',
    'GITHUB_APP_PRIVATE_KEY'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=(.+)$`, 'm');
    const match = envContent.match(regex);
    
    if (match) {
      const value = match[1].replace(/^["']|["']$/g, '');
      console.log(`✅ ${varName}: Present`);
      
      if (varName === 'GITHUB_APP_ID' || varName === 'GITHUB_APP_CLIENT_ID') {
        console.log(`   Value: ${value}`);
      } else if (varName === 'GITHUB_APP_PRIVATE_KEY') {
        console.log(`   Length: ${value.length} characters (base64 encoded)`);
        // Try to decode to verify it's valid base64
        try {
          const decoded = Buffer.from(value, 'base64').toString('utf-8');
          if (decoded.includes('BEGIN RSA PRIVATE KEY')) {
            console.log(`   Valid: RSA private key detected`);
          }
        } catch (e) {
          console.log(`   ❌ Error: Invalid base64 encoding`);
        }
      } else {
        console.log(`   Value: ${value.substring(0, 8)}...${value.substring(value.length - 4)}`);
      }
    } else {
      console.log(`❌ ${varName}: Missing`);
      allPresent = false;
    }
    console.log('');
  });

  if (allPresent) {
    console.log('✅ All GitHub App environment variables are configured!');
    console.log('\nNext steps:');
    console.log('1. Start your development server: npm run dev');
    console.log('2. Test webhook endpoint: node scripts/test-webhook.mjs');
    console.log('3. Install the GitHub App on a repository at https://github.com/apps/daygent');
  } else {
    console.log('❌ Some environment variables are missing.');
    console.log('\nPlease check your .env.local file.');
  }
} catch (error) {
  console.error('❌ Error reading .env.local file:', error.message);
}