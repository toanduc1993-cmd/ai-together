-- Feature #8: Add github_pr_url to modules
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS github_pr_url TEXT DEFAULT NULL;

-- Feature #6: Epic retrospective table
CREATE TABLE IF NOT EXISTS public.epic_retros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epic_id UUID NOT NULL REFERENCES public.epics(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    wins TEXT DEFAULT '',
    improvements TEXT DEFAULT '',
    lessons TEXT DEFAULT '',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
