-- Add a flag to track if user has completed profile setup
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Update existing users who have both name and avatar_url as completed
UPDATE users 
SET profile_completed = TRUE 
WHERE name IS NOT NULL 
  AND name != '' 
  AND avatar_url IS NOT NULL 
  AND avatar_url != '';

-- Update the handle_new_user function to not mark profile as completed by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only process if email is present
  IF NEW.email IS NOT NULL THEN
    BEGIN
      INSERT INTO public.users (id, email, name, avatar_url, github_id, github_username, google_id, profile_completed)
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
        END,
        FALSE -- Always start with profile_completed = FALSE for new users
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