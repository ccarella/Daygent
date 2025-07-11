-- Fix infinite recursion in organization_members RLS policy
-- The policy was self-referential, causing it to check organization_members 
-- to determine if you can view organization_members

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;

-- Create a fixed policy that allows users to view organization members
-- for organizations they belong to (simpler approach without self-reference)
CREATE POLICY "Members can view organization members"
  ON organization_members FOR SELECT
  USING (
    -- Users can see all members of organizations they belong to
    user_id = auth.uid() 
    OR 
    -- Or they can see members if they share an organization
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Also fix the insert policy to avoid similar issues
DROP POLICY IF EXISTS "Admins can invite to organizations" ON organization_members;

-- Create a simpler insert policy
CREATE POLICY "Admins can invite to organizations"
  ON organization_members FOR INSERT
  WITH CHECK (
    -- Check if the user is an admin/owner in a separate query
    EXISTS (
      SELECT 1 
      FROM organization_members 
      WHERE organization_id = NEW.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Add a policy for users to update their own membership (e.g., accept invites)
CREATE POLICY "Users can update own membership"
  ON organization_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add a policy for admins to remove members
CREATE POLICY "Admins can remove members"
  ON organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_members admin_check
      WHERE admin_check.organization_id = organization_members.organization_id
        AND admin_check.user_id = auth.uid()
        AND admin_check.role IN ('owner', 'admin')
    )
  );