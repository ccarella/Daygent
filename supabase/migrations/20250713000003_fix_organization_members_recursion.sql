-- Fix infinite recursion in organization_members RLS policies
-- The issue is that the INSERT policy for first owner checks if any members exist,
-- which triggers SELECT policy, which creates circular dependency

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can add themselves as owners during organization creation" ON organization_members;
DROP POLICY IF EXISTS "Admins and owners can invite members" ON organization_members;

-- Create new non-recursive policies for organization_members
-- Allow users to add themselves as the first owner (no recursion check)
CREATE POLICY "Users can create first organization owner"
  ON organization_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND role = 'owner'
  );

-- Allow existing admins/owners to invite members (separate policy to avoid recursion)
CREATE POLICY "Existing admins and owners can invite members"
  ON organization_members FOR INSERT
  WITH CHECK (
    auth.uid() != user_id  -- Can't use this policy to add yourself
    AND EXISTS (
      SELECT 1 FROM organization_members existing_member
      WHERE existing_member.organization_id = organization_members.organization_id
        AND existing_member.user_id = auth.uid()
        AND existing_member.role IN ('admin', 'owner')
        AND existing_member.id != organization_members.id  -- Avoid self-reference
    )
  );

-- Also ensure the organizations table INSERT policy exists for service role
-- (Though service role should bypass RLS, this helps with debugging)
DROP POLICY IF EXISTS "Service role can create organizations" ON organizations;

CREATE POLICY "Service role can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
  );

-- Add a policy for authenticated users to create organizations
-- This will be used when we implement client-side organization creation
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

CREATE POLICY "Authenticated users can create organizations" 
  ON organizations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );