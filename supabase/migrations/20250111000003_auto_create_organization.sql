-- Function to automatically create organization for new users
CREATE OR REPLACE FUNCTION create_default_organization_for_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  org_slug TEXT;
  base_slug TEXT;
  counter INT := 0;
BEGIN
  -- Generate base slug from email or GitHub username
  IF NEW.github_username IS NOT NULL THEN
    base_slug := lower(regexp_replace(NEW.github_username, '[^a-z0-9]+', '-', 'g'));
  ELSE
    base_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]+', '-', 'g'));
  END IF;
  
  -- Remove leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure slug is not empty
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'user';
  END IF;
  
  -- Ensure slug is unique by appending numbers if needed
  org_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) LOOP
    counter := counter + 1;
    org_slug := base_slug || '-' || counter;
  END LOOP;
  
  -- Create organization
  INSERT INTO organizations (name, slug, subscription_status, trial_ends_at, seats_used)
  VALUES (
    COALESCE(NEW.name, NEW.github_username, split_part(NEW.email, '@', 1)),
    org_slug,
    'trial',
    NOW() + INTERVAL '30 days',
    1
  )
  RETURNING id INTO org_id;
  
  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role, joined_at)
  VALUES (org_id, NEW.id, 'owner', NOW());
  
  -- Log activity
  INSERT INTO activities (organization_id, user_id, type, description)
  VALUES (
    org_id,
    NEW.id,
    'member_joined',
    'Organization created with ' || NEW.email || ' as owner'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create organizations
CREATE TRIGGER create_organization_on_user_signup
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_organization_for_user();

-- Add function to get user's default organization
CREATE OR REPLACE FUNCTION get_user_default_organization(user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  subscription_status subscription_status,
  trial_ends_at TIMESTAMPTZ,
  seats_used INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, o.slug, o.subscription_status, o.trial_ends_at, 
         o.seats_used, o.created_at, o.updated_at
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = $1 AND om.role = 'owner'
  ORDER BY o.created_at
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_default_organization(UUID) TO authenticated;

-- Migration for existing users without organizations
DO $$
DECLARE
  user_record RECORD;
  org_id UUID;
  org_slug TEXT;
  base_slug TEXT;
  counter INT;
BEGIN
  -- Find users without organizations
  FOR user_record IN 
    SELECT u.* 
    FROM users u
    LEFT JOIN organization_members om ON u.id = om.user_id
    WHERE om.id IS NULL
  LOOP
    -- Generate base slug
    IF user_record.github_username IS NOT NULL THEN
      base_slug := lower(regexp_replace(user_record.github_username, '[^a-z0-9]+', '-', 'g'));
    ELSE
      base_slug := lower(regexp_replace(split_part(user_record.email, '@', 1), '[^a-z0-9]+', '-', 'g'));
    END IF;
    
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'user';
    END IF;
    
    -- Ensure unique slug
    counter := 0;
    org_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) LOOP
      counter := counter + 1;
      org_slug := base_slug || '-' || counter;
    END LOOP;
    
    -- Create organization
    INSERT INTO organizations (name, slug, subscription_status, trial_ends_at, seats_used)
    VALUES (
      COALESCE(user_record.name, user_record.github_username, split_part(user_record.email, '@', 1)),
      org_slug,
      'trial',
      NOW() + INTERVAL '30 days',
      1
    )
    RETURNING id INTO org_id;
    
    -- Add user as owner
    INSERT INTO organization_members (organization_id, user_id, role, joined_at)
    VALUES (org_id, user_record.id, 'owner', NOW());
    
    -- Log activity
    INSERT INTO activities (organization_id, user_id, type, description)
    VALUES (
      org_id,
      user_record.id,
      'member_joined',
      'Organization created for existing user ' || user_record.email
    );
    
    RAISE NOTICE 'Created organization % for user %', org_slug, user_record.email;
  END LOOP;
END;
$$;