-- Migration: Add module_assignees table for multi-user assignment
-- This table stores multiple assignees per module

CREATE TABLE IF NOT EXISTS module_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, user_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_module_assignees_module ON module_assignees(module_id);
CREATE INDEX IF NOT EXISTS idx_module_assignees_user ON module_assignees(user_id);

-- Add activity_id to deliverable_files for comment attachments
ALTER TABLE deliverable_files ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES activities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_deliverable_files_activity ON deliverable_files(activity_id);

-- Migrate existing assigned_to data into module_assignees
INSERT INTO module_assignees (module_id, user_id)
SELECT id, assigned_to FROM modules WHERE assigned_to IS NOT NULL
ON CONFLICT (module_id, user_id) DO NOTHING;
