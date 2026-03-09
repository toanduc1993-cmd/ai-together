// Scoring Engine v2 — Based on Module Workflow
// Delivery (30%) + Quality (25%) + Speed (20%) + Consistency (15%) + Collaboration (10%)

import { supabase } from './supabase.js';

// ============ SPEED SCORE PER MODULE ============
function getSpeedScore(deadline, completedAt) {
    if (!deadline || !completedAt) return 85; // No deadline = default
    const dl = new Date(deadline);
    const done = new Date(completedAt);
    const diffDays = Math.floor((dl - done) / (1000 * 60 * 60 * 24));

    if (diffDays >= 2) return 100;   // Early: ≥2 days before deadline
    if (diffDays >= 0) return 85;    // On time
    if (diffDays >= -3) return 60;   // 1-3 days late
    if (diffDays >= -7) return 30;   // 4-7 days late
    return 10;                       // >7 days late
}

// ============ CONSISTENCY FROM STREAK ============
function getConsistencyScore(streak) {
    if (streak >= 10) return 100;
    if (streak >= 7) return 80;
    if (streak >= 4) return 60;
    if (streak >= 2) return 40;
    if (streak >= 1) return 20;
    return 0;
}

// ============ STREAK CALCULATION ============
export function calculateStreak(activities) {
    if (!activities || activities.length === 0) return 0;

    const workingDays = new Set();
    for (const a of activities) {
        const d = new Date(a.created_at);
        const day = d.getDay();
        if (day === 0 || day === 6) continue;
        workingDays.add(d.toISOString().split('T')[0]);
    }

    const sortedDays = [...workingDays].sort().reverse();
    if (sortedDays.length === 0) return 0;

    let streak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        const diff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));
        if (diff === 1 || (diff === 3 && prev.getDay() === 1)) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// ============ CALCULATE SCORES FOR A USER ============
export async function calculateUserScores(userId, periodStart, periodEnd) {
    // 1. Get all modules assigned to this user
    const { data: modules, error: modError } = await supabase
        .from('modules')
        .select('id, status, deadline, updated_at, created_at, review_comment')
        .eq('assigned_to', userId);

    if (modError) {
        console.error(`Scoring error for user ${userId}:`, modError.message);
    }
    const allMods = modules || [];
    const doneModules = allMods.filter(m => m.status === 'done');
    const submittedModules = allMods.filter(m => ['done', 'in_review', 'changes_requested'].includes(m.status));

    // ============ DELIVERY (30%) ============
    // modules done / modules assigned
    let delivery = 0;
    if (allMods.length > 0) {
        delivery = Math.round((doneModules.length / allMods.length) * 100);
    }
    delivery = Math.max(0, Math.min(100, delivery));

    // ============ QUALITY (25%) ============
    // Approved first time vs had changes_requested
    // Check activities for changes_requested events per module
    let quality = 0;
    if (submittedModules.length > 0) {
        let totalQuality = 0;
        for (const mod of submittedModules) {
            // Count how many times this module was set to changes_requested
            const { data: changesActivities } = await supabase
                .from('activities')
                .select('id')
                .eq('entity_id', mod.id)
                .eq('entity_type', 'module')
                .like('detail', '%Yêu cầu sửa%');

            const changesCount = changesActivities?.length || 0;

            if (mod.status === 'done' && changesCount === 0) {
                totalQuality += 100; // Approved first time
            } else if (mod.status === 'done' && changesCount === 1) {
                totalQuality += 70;  // One revision
            } else if (mod.status === 'done' && changesCount >= 2) {
                totalQuality += 40;  // Multiple revisions
            } else if (mod.status === 'changes_requested') {
                totalQuality += 30;  // Currently needs fixing
            } else if (mod.status === 'in_review') {
                totalQuality += 60;  // Submitted, pending review
            }
        }
        quality = Math.round(totalQuality / submittedModules.length);
    }
    quality = Math.max(0, Math.min(100, quality));

    // ============ SPEED (20%) ============
    // Average speed score across all done modules
    let speed = 0;
    if (doneModules.length > 0) {
        let totalSpeed = 0;
        for (const mod of doneModules) {
            totalSpeed += getSpeedScore(mod.deadline, mod.updated_at);
        }
        speed = Math.round(totalSpeed / doneModules.length);
    } else if (allMods.length > 0) {
        // Not done yet, check if any are overdue
        const now = new Date();
        const overdue = allMods.filter(m => m.deadline && new Date(m.deadline) < now && m.status !== 'done');
        speed = overdue.length > 0 ? Math.max(20, 80 - (overdue.length * 20)) : 70;
    }
    speed = Math.max(0, Math.min(100, speed));

    // ============ CONSISTENCY (15%) ============
    const { data: allActivities } = await supabase
        .from('activities')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

    const streak = calculateStreak(allActivities || []);
    const consistency = getConsistencyScore(streak);

    // ============ COLLABORATION (10%) ============
    // Based on checklist item uploads + comments
    let collaboration = 0;
    const { data: checklistFiles } = await supabase
        .from('deliverable_files')
        .select('id, checklist_item_id')
        .eq('uploaded_by', userId)
        .not('checklist_item_id', 'is', null);

    const uploads = checklistFiles?.length || 0;

    // Count comments (from checklist items that have comments)
    const { data: activities } = await supabase
        .from('activities')
        .select('id')
        .eq('user_id', userId)
        .in('action_type', ['comment', 'chat_message']);

    const comments = activities?.length || 0;
    collaboration = Math.min(100, (uploads * 20) + (comments * 10));

    // ============ COMPOSITE ============
    // Weights: Delivery(30%) + Quality(25%) + Speed(20%) + Consistency(15%) + Collaboration(10%)
    let composite = (delivery * 0.30) + (quality * 0.25) + (speed * 0.20) + (consistency * 0.15) + (collaboration * 0.10);
    composite = Math.round(composite * 100) / 100;

    return {
        user_id: userId,
        period: 'weekly',
        period_start: periodStart,
        // Primary metric fields (used by frontend)
        delivery,
        quality,
        speed,
        consistency,
        collaboration,
        // Legacy DB column mapping (scores table has these column names)
        tempo: delivery,
        task_completion: quality,
        ai_adoption: speed,
        composite,
        streak,
    };
}

// ============ CALCULATE ALL USERS ============
export async function calculateAllScores() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const periodStart = weekStart.toISOString();
    const periodEnd = now.toISOString();

    const { data: users } = await supabase.from('users').select('id');
    if (!users) return [];

    const results = [];
    for (const user of users) {
        const score = await calculateUserScores(user.id, periodStart, periodEnd);
        await supabase.from('scores').upsert(score, { onConflict: 'user_id,period,period_start' });
        results.push(score);
    }

    return results.sort((a, b) => b.composite - a.composite);
}
