-- Fix the handle_new_user trigger to properly handle conflicts
-- and add better error handling

-- Drop existing trigger
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- Recreate the function with ON CONFLICT handling and exception handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only process if email is present
  IF NEW.email IS NOT NULL THEN
    BEGIN
      INSERT INTO public.users (id, email, name, avatar_url, github_id, github_username, google_id)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
        NEW.raw_user_meta_data->>'avatar_url',
        -- Safely handle provider_id conversion
        CASE 
          WHEN NEW.raw_user_meta_data->>'provider_id' IS NOT NULL 
               AND NEW.raw_user_meta_data->>'provider_id' ~ '^\d+$'
          THEN (NEW.raw_user_meta_data->>'provider_id')::INTEGER
          ELSE NULL
        END,
        NEW.raw_user_meta_data->>'user_name',
        CASE 
          WHEN NEW.raw_user_meta_data->>'iss' = 'https://accounts.google.com' 
          THEN NEW.raw_user_meta_data->>'sub'
          ELSE NULL
        END
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.users.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        github_id = COALESCE(EXCLUDED.github_id, public.users.github_id),
        github_username = COALESCE(EXCLUDED.github_username, public.users.github_username),
        google_id = COALESCE(EXCLUDED.google_id, public.users.google_id),
        updated_at = now();
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the auth flow
      RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger to fire on both INSERT and UPDATE
CREATE TRIGGER handle_new_user_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure all existing auth users have profiles
INSERT INTO public.users (id, email, name, avatar_url)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', ''),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
  AND email IS NOT NULL
ON CONFLICT (id) DO NOTHING;