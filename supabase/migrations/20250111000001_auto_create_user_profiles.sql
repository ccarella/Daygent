-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  -- Extract GitHub specific data if available
  IF NEW.raw_user_meta_data->>'provider' = 'github' THEN
    UPDATE public.users
    SET 
      github_username = NEW.raw_user_meta_data->>'user_name',
      github_id = (NEW.raw_user_meta_data->>'provider_id')::BIGINT
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create any missing user profiles for existing auth users
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
WHERE u.id IS NULL;