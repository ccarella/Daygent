-- Enable RLS on organization_members table
-- This fixes the issue where users cannot create organizations due to RLS being disabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'organization_members' 
    AND relnamespace = 'public'::regnamespace 
    AND relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS was not properly enabled on organization_members table';
  END IF;
END $$;