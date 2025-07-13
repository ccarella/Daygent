-- Drop the old organization function if it exists
DROP FUNCTION IF EXISTS create_organization_with_owner CASCADE;
DROP FUNCTION IF EXISTS check_organization_slug_available CASCADE;

-- Create a function to handle workspace creation with owner assignment
-- This bypasses RLS issues by running with SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_workspace_with_owner(
  p_name TEXT,
  p_slug TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with the privileges of the function owner (superuser)
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Insert the workspace
  INSERT INTO workspaces (name, slug, created_by)
  VALUES (p_name, p_slug, p_user_id)
  RETURNING workspaces.id INTO v_workspace_id;
  
  -- Insert the owner membership
  INSERT INTO workspace_members (workspace_id, user_id)
  VALUES (v_workspace_id, p_user_id);
  
  -- Note: No activities table exists in the current schema
  -- If activity logging is needed, it should be added as a separate migration
  
  -- Return the created workspace
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.slug,
    w.created_by,
    w.created_at,
    w.updated_at
  FROM workspaces w
  WHERE w.id = v_workspace_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_workspace_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION create_workspace_with_owner TO service_role;

-- Also create a simpler function for checking slug availability
CREATE OR REPLACE FUNCTION check_workspace_slug_available(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM workspaces WHERE slug = p_slug
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_workspace_slug_available TO authenticated;
GRANT EXECUTE ON FUNCTION check_workspace_slug_available TO service_role;