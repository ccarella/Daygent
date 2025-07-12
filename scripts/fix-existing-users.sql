-- This script ensures all existing auth users have corresponding profiles
-- Run this if you're still experiencing issues after applying migrations

-- Check for auth users without profiles
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.raw_user_meta_data->>'provider' as provider,
  au.raw_user_meta_data->>'user_name' as github_username
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;

-- Create missing profiles (same as in migration but can be run separately)
INSERT INTO public.users (id, email, name, avatar_url, github_username, github_id)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
  au.raw_user_meta_data->>'avatar_url',
  CASE 
    WHEN au.raw_user_meta_data->>'provider' = 'github' 
    THEN au.raw_user_meta_data->>'user_name'
    ELSE NULL
  END,
  CASE 
    WHEN au.raw_user_meta_data->>'provider' = 'github' 
    THEN (au.raw_user_meta_data->>'provider_id')::BIGINT
    ELSE NULL
  END
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify all users now have profiles
SELECT COUNT(*) as auth_users_count FROM auth.users;
SELECT COUNT(*) as profile_users_count FROM public.users;