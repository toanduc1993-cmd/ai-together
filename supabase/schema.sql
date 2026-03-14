-- =============================================
-- AI Together Platform — Supabase Schema (BRD v1)
-- =============================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL DEFAULT '123456',
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'developer' CHECK (role IN ('chairman','project_lead','developer','admin')),
  avatar TEXT DEFAULT '🧑‍💻',
  bio TEXT DEFAULT '',
  permissions JSONB DEFAULT '{}',
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_username ON users(LOWER(username));
CREATE INDEX idx_users_role ON users(role);

-- 2. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  chairman_id UUID REFERENCES users(id),
  lead_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft','active','completed','archived')),
  deadline DATE,
  github_repo TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_status ON projects(status);

-- 3. PROJECT RULES
CREATE TABLE IF NOT EXISTS project_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content TEXT DEFAULT '',
  version TEXT DEFAULT '1.0',
  description TEXT DEFAULT '',
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. MODULES
CREATE TABLE IF NOT EXISTS modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  assigned_to UUID REFERENCES users(id),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','in_progress','in_review','review','submitted','approved','changes_requested','rejected','done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  deadline DATE,
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  review_comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_modules_project ON modules(project_id);
CREATE INDEX idx_modules_assigned ON modules(assigned_to);
CREATE INDEX idx_modules_status ON modules(status);

-- 5. CHECKLIST ITEMS
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','doing','done','blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  deadline DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_checklist_module ON checklist_items(module_id);
CREATE INDEX idx_checklist_assigned ON checklist_items(assigned_to);
CREATE INDEX idx_checklist_status ON checklist_items(status);

-- 6. DELIVERABLES
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES users(id),
  demo_link TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','changes_requested','rejected')),
  submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deliverables_module ON deliverables(module_id);
CREATE INDEX idx_deliverables_status ON deliverables(status);

-- 7. DELIVERABLE FILES
CREATE TABLE IF NOT EXISTS deliverable_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  checklist_label TEXT DEFAULT '',
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 8. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved','changes_requested','rejected')),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reviews_deliverable ON reviews(deliverable_id);

-- 9. ACTIVITIES
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL,
  entity_type TEXT DEFAULT '',
  entity_id UUID,
  detail TEXT DEFAULT '',
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_project ON activities(project_id);
CREATE INDEX idx_activities_created ON activities(created_at DESC);

-- 10. SCORES
CREATE TABLE IF NOT EXISTS scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  period TEXT NOT NULL DEFAULT 'weekly',
  period_start DATE NOT NULL,
  tempo INTEGER DEFAULT 50,
  task_completion INTEGER DEFAULT 0,
  collaboration INTEGER DEFAULT 0,
  ai_adoption INTEGER DEFAULT 0,
  composite NUMERIC(5,2) DEFAULT 0,
  streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period, period_start)
);

CREATE INDEX idx_scores_user ON scores(user_id);
CREATE INDEX idx_scores_composite ON scores(composite DESC);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  entity_type TEXT DEFAULT '',
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, but we add permissive policies
CREATE POLICY "service_all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON project_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON deliverables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON deliverable_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON notifications FOR ALL USING (true) WITH CHECK (true);
