-- Fix module status CHECK constraint: add 'in_review' status
-- and add review_comment column for chairman feedback

-- 1. Migrate existing 'review' status to 'in_review' for consistency
UPDATE modules SET status = 'in_review' WHERE status = 'review';

-- 2. Drop the old CHECK constraint and create a new one with 'in_review'
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_status_check;
ALTER TABLE modules ADD CONSTRAINT modules_status_check 
  CHECK (status IN ('planned','in_progress','in_review','review','submitted','approved','changes_requested','rejected','done'));

-- 3. Add review_comment column if not exists
ALTER TABLE modules ADD COLUMN IF NOT EXISTS review_comment TEXT DEFAULT '';
