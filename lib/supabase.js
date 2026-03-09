import { createClient } from '@supabase/supabase-js';

let _supabase = null;

function getSupabase() {
    if (!_supabase) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        _supabase = createClient(url, key);
    }
    return _supabase;
}

export const supabase = new Proxy({}, {
    get: (_, prop) => getSupabase()[prop],
});

// ============ USERS ============
export async function getUsers() {
    const { data, error } = await supabase.from('users').select('id, username, email, display_name, role, avatar, bio, permissions, last_active, created_at').order('created_at');
    if (error) throw error;
    return data;
}

export async function getUserById(id) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
}

export async function getUserByUsername(username) {
    const { data, error } = await supabase.from('users').select('*').ilike('username', username).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function createUser(user) {
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) throw error;
    return data;
}

export async function updateUser(id, updates) {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

export async function deleteUser(id) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
}

// ============ PROJECTS ============
export async function getProjects() {
    const { data, error } = await supabase.from('projects').select(`
    *, 
    chairman:users!projects_chairman_id_fkey(id, display_name, avatar),
    lead:users!projects_lead_id_fkey(id, display_name, avatar)
  `).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function getProjectById(id) {
    const { data, error } = await supabase.from('projects').select(`
    *,
    chairman:users!projects_chairman_id_fkey(id, display_name, avatar, username),
    lead:users!projects_lead_id_fkey(id, display_name, avatar, username)
  `).eq('id', id).single();
    if (error) throw error;
    return data;
}

export async function createProject(project) {
    const { data, error } = await supabase.from('projects').insert(project).select().single();
    if (error) throw error;
    return data;
}

export async function updateProject(id, updates) {
    const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

// ============ MODULES ============
export async function getModulesByProject(projectId) {
    const { data, error } = await supabase.from('modules').select(`
    *,
    assignee:users!modules_assigned_to_fkey(id, display_name, avatar, username)
  `).eq('project_id', projectId).order('created_at');
    if (error) throw error;
    return data;
}

export async function getModuleById(id) {
    const { data, error } = await supabase.from('modules').select(`
    *,
    assignee:users!modules_assigned_to_fkey(id, display_name, avatar, username),
    project:projects(id, title, slug)
  `).eq('id', id).single();
    if (error) throw error;
    return data;
}

export async function createModule(mod) {
    const { data, error } = await supabase.from('modules').insert(mod).select().single();
    if (error) throw error;
    return data;
}

export async function updateModule(id, updates) {
    const { data, error } = await supabase.from('modules').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

// ============ CHECKLIST ITEMS ============
export async function getChecklistByModule(moduleId) {
    const { data, error } = await supabase.from('checklist_items').select(`
    *,
    assignee:users!checklist_items_assigned_to_fkey(id, display_name, avatar),
    assigner:users!checklist_items_assigned_by_fkey(id, display_name, avatar)
  `).eq('module_id', moduleId).order('created_at');
    if (error) throw error;
    return data;
}

export async function createChecklistItem(item) {
    const { data, error } = await supabase.from('checklist_items').insert(item).select().single();
    if (error) throw error;
    return data;
}

export async function updateChecklistItem(id, updates) {
    const { data, error } = await supabase.from('checklist_items').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

export async function deleteChecklistItem(id) {
    const { error } = await supabase.from('checklist_items').delete().eq('id', id);
    if (error) throw error;
}

// ============ DELIVERABLES ============
export async function getDeliverablesByModule(moduleId) {
    const { data, error } = await supabase.from('deliverables').select(`
    *,
    submitter:users!deliverables_submitted_by_fkey(id, display_name, avatar),
    files:deliverable_files(*)
  `).eq('module_id', moduleId).order('submitted_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function createDeliverable(deliverable) {
    const { data, error } = await supabase.from('deliverables').insert(deliverable).select().single();
    if (error) throw error;
    return data;
}

export async function updateDeliverable(id, updates) {
    const { data, error } = await supabase.from('deliverables').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

// ============ REVIEWS ============
export async function getReviewsByDeliverable(deliverableId) {
    const { data, error } = await supabase.from('reviews').select(`
    *,
    reviewer:users!reviews_reviewer_id_fkey(id, display_name, avatar)
  `).eq('deliverable_id', deliverableId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function createReview(review) {
    const { data, error } = await supabase.from('reviews').insert(review).select().single();
    if (error) throw error;
    return data;
}

// ============ ACTIVITIES ============
export async function getActivities(limit = 50, projectId = null) {
    let query = supabase.from('activities').select(`
    *,
    user:users!activities_user_id_fkey(id, display_name, avatar, username)
  `).order('created_at', { ascending: false }).limit(limit);

    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function createActivity(activity) {
    const { data, error } = await supabase.from('activities').insert(activity).select().single();
    if (error) throw error;
    return data;
}

// ============ SCORES ============
export async function getScores(period = 'weekly') {
    const { data, error } = await supabase.from('scores').select(`
    *,
    user:users!scores_user_id_fkey(id, display_name, avatar, username, role)
  `).eq('period', period).order('composite', { ascending: false });
    if (error) throw error;
    return data;
}

export async function upsertScore(score) {
    const { data, error } = await supabase.from('scores').upsert(score, { onConflict: 'user_id,period,period_start' }).select().single();
    if (error) throw error;
    return data;
}

// ============ NOTIFICATIONS ============
export async function getNotifications(userId, unreadOnly = false) {
    let query = supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (unreadOnly) query = query.eq('is_read', false);
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function createNotification(notification) {
    const { data, error } = await supabase.from('notifications').insert(notification).select().single();
    if (error) throw error;
    return data;
}

export async function markNotificationsRead(userId) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    if (error) throw error;
}

// ============ PROJECT RULES ============
export async function getProjectRules(projectId) {
    const { data, error } = await supabase.from('project_rules').select(`
    *,
    uploader:users!project_rules_uploaded_by_fkey(id, display_name)
  `).eq('project_id', projectId).order('created_at');
    if (error) throw error;
    return data;
}

export async function createProjectRule(rule) {
    const { data, error } = await supabase.from('project_rules').insert(rule).select().single();
    if (error) throw error;
    return data;
}

// ============ COMMENTS (Discussion Threads) ============
export async function getCommentsByModule(moduleId) {
    const { data, error } = await supabase.from('activities').select(`
    *,
    user:users!activities_user_id_fkey(id, display_name, avatar, username)
  `).eq('entity_id', moduleId).eq('entity_type', 'module').eq('action_type', 'comment').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

export async function createComment({ moduleId, userId, text, projectId }) {
    const activity = await createActivity({
        user_id: userId,
        action_type: 'comment',
        entity_type: 'module',
        entity_id: moduleId,
        detail: text,
        project_id: projectId,
    });
    return activity;
}

// ============ HELPERS ============
export function stripPassword(user) {
    if (!user) return user;
    const { password_hash, ...safe } = user;
    return safe;
}
