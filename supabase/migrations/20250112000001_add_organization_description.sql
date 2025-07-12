-- Add description column to organizations table
ALTER TABLE organizations ADD COLUMN description TEXT;

-- Update existing rows to have NULL description (which is fine since it's optional)
-- No action needed as column will default to NULL

-- Add comment to describe the column
COMMENT ON COLUMN organizations.description IS 'Optional description of the organization';