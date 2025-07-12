-- Remove automatic organization creation trigger
DROP TRIGGER IF EXISTS create_organization_on_user_signup ON users;

-- Keep the function for potential manual use, but rename it
DROP FUNCTION IF EXISTS create_default_organization_for_user();

-- The get_user_default_organization function is still useful, so we'll keep it