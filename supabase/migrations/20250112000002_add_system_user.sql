-- Create system user for webhook operations
-- This user will be used to log activities when webhooks are received

-- Insert system user if it doesn't exist
INSERT INTO public.users (
  id,
  email,
  name,
  avatar_url,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'system@daygent.local',
  'System',
  NULL,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'system@daygent.local'
);