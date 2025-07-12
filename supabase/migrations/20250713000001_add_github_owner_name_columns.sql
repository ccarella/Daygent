-- Add github_owner and github_name columns to repositories table
-- These are needed for the GitHub sync service

-- Add the columns
ALTER TABLE repositories
ADD COLUMN IF NOT EXISTS github_owner TEXT,
ADD COLUMN IF NOT EXISTS github_name TEXT;

-- Update existing repositories by parsing the full_name
UPDATE repositories
SET 
  github_owner = split_part(full_name, '/', 1),
  github_name = split_part(full_name, '/', 2)
WHERE github_owner IS NULL OR github_name IS NULL;

-- Make the columns NOT NULL after populating them
ALTER TABLE repositories
ALTER COLUMN github_owner SET NOT NULL,
ALTER COLUMN github_name SET NOT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_repositories_github_owner ON repositories(github_owner);
CREATE INDEX IF NOT EXISTS idx_repositories_github_name ON repositories(github_name);
CREATE INDEX IF NOT EXISTS idx_repositories_github_owner_name ON repositories(github_owner, github_name);

-- Add a unique constraint on github_id to ensure no duplicates
ALTER TABLE repositories ADD CONSTRAINT repositories_github_id_unique UNIQUE (github_id);

-- Add comments for clarity
COMMENT ON COLUMN repositories.github_owner IS 'GitHub repository owner/organization name';
COMMENT ON COLUMN repositories.github_name IS 'GitHub repository name (without owner)';