-- Remove the auto-organization creation trigger
-- This allows users to go through the proper onboarding flow
DROP TRIGGER IF EXISTS create_organization_on_user_signup ON users;

-- Also drop the function if it's no longer needed
DROP FUNCTION IF EXISTS create_default_organization_for_user();

-- Verify the trigger has been removed
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'create_organization_on_user_signup'
  ) THEN
    RAISE EXCEPTION 'Trigger create_organization_on_user_signup was not properly removed';
  END IF;
END $$;