-- 1. Create `epics` table
CREATE TABLE IF NOT EXISTS public.epics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planned'::text CHECK (status IN ('planned', 'in_progress', 'done')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 2. Enable RLS on `epics`
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for `epics` (assuming users can read/write their project's epics)
CREATE POLICY "Enable read access for all users" ON public.epics
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.epics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users" ON public.epics
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete for authenticated users" ON public.epics
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 4. Add `epic_id` to `modules` table
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS epic_id UUID REFERENCES public.epics(id) ON DELETE SET NULL;

-- 5. Data Migration: Create a default epic for each project and assign existing modules to it
DO $$ 
DECLARE
    proj RECORD;
    new_epic_id UUID;
BEGIN
    FOR proj IN SELECT id, title FROM public.projects LOOP
        -- Create a default Epic for the project
        INSERT INTO public.epics (project_id, title, description, status)
        VALUES (proj.id, 'Chưa phân loại (Default Epic)', 'Epic mặc định chứa các Tasks cũ chưa phân loại.', 'planned')
        RETURNING id INTO new_epic_id;

        -- Update all existing modules in this project to belong to the new default Epic
        UPDATE public.modules SET epic_id = new_epic_id WHERE project_id = proj.id AND epic_id IS NULL;
    END LOOP;
END $$;
