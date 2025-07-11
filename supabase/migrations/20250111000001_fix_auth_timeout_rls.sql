-- Add INSERT policy so users can create their own profiles
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also handle GitHub OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS trigger AS $$
BEGIN
  -- Update user profile with GitHub metadata if available
  IF new.raw_user_meta_data->>'user_name' IS NOT NULL THEN
    UPDATE public.users
    SET 
      github_username = new.raw_user_meta_data->>'user_name',
      github_id = CASE 
        WHEN new.raw_user_meta_data->>'provider_id' ~ '^\d+$' 
        THEN (new.raw_user_meta_data->>'provider_id')::BIGINT 
        ELSE NULL 
      END,
      avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', avatar_url),
      name = COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', name),
      updated_at = NOW()
    WHERE id = new.id;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_update();