-- Fix RLS policies for organization members to allow creation during organization setup

-- Drop existing policy that might be too restrictive
DROP POLICY IF EXISTS "Admins and owners can invite members" ON organization_members;

-- Create a new policy that allows users to add themselves as owners when creating an organization
CREATE POLICY "Users can add themselves as owners during organization creation"
  ON organization_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
    )
  );

-- Create a separate policy for admins/owners to invite other members
CREATE POLICY "Admins and owners can invite members"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_members.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'owner')
    )
    AND auth.uid() != user_id  -- Can't use this policy to add yourself
  );

-- Ensure organizations table has proper RLS policies
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;

CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Allow users to update organizations they own
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'owner'
    )
  );

-- Note: We're intentionally not adding an INSERT policy for organizations
-- This is handled by the API endpoint with service role to ensure proper
-- member assignment happens atomically