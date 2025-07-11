-- Create a function to help debug organization creation
-- This bypasses RLS issues for the debug tool
CREATE OR REPLACE FUNCTION create_organization_for_user_debug(
  p_user_id UUID,
  p_org_name TEXT,
  p_org_slug TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  success BOOLEAN,
  message TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id UUID;
  v_existing_count INT;
BEGIN
  -- Check if user already has organizations
  SELECT COUNT(*) INTO v_existing_count
  FROM organization_members
  WHERE user_id = p_user_id;
  
  IF v_existing_count > 0 THEN
    RETURN QUERY
    SELECT 
      NULL::UUID as id,
      NULL::TEXT as name,
      NULL::TEXT as slug,
      FALSE as success,
      'User already has organizations'::TEXT as message;
    RETURN;
  END IF;
  
  -- Create organization
  INSERT INTO organizations (name, slug, subscription_status, trial_ends_at, seats_used)
  VALUES (
    p_org_name,
    p_org_slug,
    'trial',
    NOW() + INTERVAL '30 days',
    1
  )
  RETURNING organizations.id INTO v_org_id;
  
  -- Add user as owner - this is done with SECURITY DEFINER so it bypasses RLS
  INSERT INTO organization_members (organization_id, user_id, role, joined_at)
  VALUES (v_org_id, p_user_id, 'owner', NOW());
  
  -- Log activity
  INSERT INTO activities (organization_id, user_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_org_id,
    p_user_id,
    'organization.created',
    'organization',
    v_org_id,
    jsonb_build_object('description', 'Organization created via debug tool')
  );
  
  -- Return success
  RETURN QUERY
  SELECT 
    v_org_id as id,
    p_org_name as name,
    p_org_slug as slug,
    TRUE as success,
    'Organization created successfully'::TEXT as message;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY
    SELECT 
      NULL::UUID as id,
      NULL::TEXT as name,
      NULL::TEXT as slug,
      FALSE as success,
      SQLERRM::TEXT as message;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_for_user_debug(UUID, TEXT, TEXT) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION create_organization_for_user_debug IS 'Debug function to create organizations for users who signed up before the organization system was implemented. This bypasses RLS to avoid recursion issues.';