-- Create a function to handle organization creation with owner assignment
-- This bypasses RLS issues by running with SECURITY DEFINER

CREATE OR REPLACE FUNCTION create_organization_with_owner(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  subscription_status TEXT,
  subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  seats_used INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with the privileges of the function owner (superuser)
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Insert the organization
  INSERT INTO organizations (name, slug, description)
  VALUES (p_name, p_slug, p_description)
  RETURNING organizations.id INTO v_org_id;
  
  -- Insert the owner membership
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'owner');
  
  -- Log the activity using existing columns
  INSERT INTO activities (
    organization_id,
    user_id,
    type,
    description,
    metadata
  )
  VALUES (
    v_org_id,
    p_user_id,
    'member_joined',
    'organization.created',
    jsonb_build_object(
      'organization_name', p_name,
      'organization_slug', p_slug
    )
  );
  
  -- Return the created organization
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    o.description,
    o.subscription_status::TEXT,
    o.subscription_id,
    o.trial_ends_at,
    o.seats_used,
    o.created_at,
    o.updated_at
  FROM organizations o
  WHERE o.id = v_org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_with_owner TO service_role;

-- Also create a simpler function for checking slug availability
CREATE OR REPLACE FUNCTION check_organization_slug_available(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM organizations WHERE slug = p_slug
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_organization_slug_available TO authenticated;
GRANT EXECUTE ON FUNCTION check_organization_slug_available TO service_role;