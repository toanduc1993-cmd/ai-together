-- Add github_repo column to projects table
-- This stores the GitHub repository full name (e.g. "owner/repo")
-- Used by the GitHub webhook to auto-link document files

ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo TEXT DEFAULT NULL;

-- Create index for webhook lookup
CREATE INDEX IF NOT EXISTS idx_projects_github_repo ON projects(github_repo) WHERE github_repo IS NOT NULL;
