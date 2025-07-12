# Fix for Organization Creation on Vercel

## Problem
The organization creation feature is failing on Vercel with 500 errors. The issue is that the `SUPABASE_SERVICE_ROLE_KEY` environment variable is not configured in Vercel.

## Solution

### 1. Get your Supabase Service Role Key
- Go to your Supabase project dashboard
- Navigate to Settings → API
- Find "Service Role Key" (starts with `eyJ...`)
- Copy this key (keep it secure!)

### 2. Add Environment Variable to Vercel
- Go to your Vercel project dashboard
- Navigate to Settings → Environment Variables
- Add the following variable:
  - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
  - **Value**: Your service role key from step 1
  - **Environment**: Select all (Production, Preview, Development)

### 3. Verify Other Required Variables
Ensure these are also set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Redeploy
After adding the environment variable, you need to trigger a new deployment:
- Go to the Deployments tab in Vercel
- Click "Redeploy" on the latest deployment
- Or push a new commit to trigger automatic deployment

## What Changed in the Code
I've added explicit error checking for the `SUPABASE_SERVICE_ROLE_KEY` in:
- `/src/app/api/organizations/check-slug/route.ts`
- `/src/app/api/organizations/route.ts`
- `/src/lib/supabase/server.ts`

This will now return a clearer error message if the environment variable is missing, making it easier to diagnose configuration issues.

## Security Note
The service role key bypasses Row Level Security (RLS) and should be kept secure. Never expose it in client-side code or commit it to version control.