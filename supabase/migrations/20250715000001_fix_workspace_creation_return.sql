-- Fix the create_workspace_with_member function to return full workspace object
-- instead of just UUID to match what the application expects

DROP FUNCTION IF EXISTS create_workspace_with_member CASCADE;

CREATE OR REPLACE FUNCTION create_workspace_with_member(
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Create workspace
  INSERT INTO workspaces (name, slug, created_by)
  VALUES (p_name, p_slug, p_user_id)
  RETURNING workspaces.id INTO v_workspace_id;
  
  -- Add creator as member
  INSERT INTO workspace_members (workspace_id, user_id)
  VALUES (v_workspace_id, p_user_id);
  
  -- Return the created workspace with all fields
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
GRANT EXECUTE ON FUNCTION create_workspace_with_member TO authenticated;