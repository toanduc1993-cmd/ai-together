// Scoring Engine — BRD v1 Section 4
// Tempo, Composite Score, Streak, Deadline bonuses

import { supabase } from './supabase.js';

// ============ TEMPO POINTS PER ACTION ============
const TEMPO_POINTS = {
    comment: 3,
    chat_message: 3,
    status_change: 5,
    checklist_status_changed: 5,
    module_status_changed: 5,
    review_submitted: 6,
    deliverable_submitted: 6,
    file_upload: 8,
    module_created: 5,
    checklist_created: 4,
    project_created: 8,
};

const TEMPO_PENALTIES = {
    inactive_day: -10,
    late_mention_response: -5,
};

// ============ DEADLINE BONUSES ============
export function getDeadlineMultiplier(deadline, completedAt) {
    if (!deadline || !completedAt) return 1.0;
    const dl = new Date(deadline);
    const done = new Date(completedAt);
    const diffDays = Math.floor((dl - done) / (1000 * 60 * 60 * 24));

    if (diffDays >= 2) return 1.2;    // Early: +20%
    if (diffDays >= 0) return 1.0;    // On time
    if (diffDays >= -3) return 0.9;   // 1-3 days late: -10%
    if (diffDays >= -7) return 0.75;  // 4-7 days late: -25%
    return 0.5;                       // >7 days late: -50%
}

// ============ STREAK CALCULATION ============
export function calculateStreak(activities) {
    if (!activities || activities.length === 0) return 0;

    const workingDays = new Set();
    for (const a of activities) {
        const d = new Date(a.created_at);
        const day = d.getDay();
        if (day === 0 || day === 6) continue; // Skip weekends
        const hr = d.getHours();
        if (hr < 8 || hr > 18) continue; // Only working hours
        workingDays.add(d.toISOString().split('T')[0]);
    }

    const sortedDays = [...workingDays].sort().reverse();
    if (sortedDays.length === 0) return 0;

    let streak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        const diff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));

        // Account for weekends: if diff is 3, it could be Fri→Mon
        if (diff === 1 || (diff === 3 && prev.getDay() === 1)) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

// ============ STREAK BONUS ============
export function getStreakBonus(streak) {
    if (streak >= 10) return 0.1; // +10% Composite
    return 0;
}

// ============ CALCULATE SCORES FOR A USER ============
export async function calculateUserScores(userId, periodStart, periodEnd) {
    // Get activities in the period
    const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd)
        .order('created_at', { ascending: false });

    // Calculate Tempo
    let tempo = 50; // base
    if (activities) {
        for (const a of activities) {
            tempo += TEMPO_POINTS[a.action_type] || 2;
        }
    }
    tempo = Math.max(0, Math.min(100, tempo));

    // Get completed checklist items for Task Completion
    const { data: completedItems } = await supabase
        .from('checklist_items')
        .select('id, deadline, completed_at')
        .eq('assigned_to', userId)
        .eq('status', 'done')
        .gte('completed_at', periodStart)
        .lte('completed_at', periodEnd);

    const { data: allItems } = await supabase
        .from('checklist_items')
        .select('id')
        .eq('assigned_to', userId);

    let taskCompletion = 0;
    if (allItems && allItems.length > 0) {
        let totalScore = 0;
        let maxScore = allItems.length * 100;

        if (completedItems) {
            for (const item of completedItems) {
                const multiplier = getDeadlineMultiplier(item.deadline, item.completed_at);
                totalScore += 100 * multiplier;
            }
        }
        taskCompletion = Math.round((totalScore / maxScore) * 100);
    }
    taskCompletion = Math.max(0, Math.min(100, taskCompletion));

    // Collaboration: based on chat messages, comments, reviews
    const collabActions = activities ? activities.filter(a =>
        ['comment', 'chat_message', 'review_submitted', 'deliverable_submitted'].includes(a.action_type)
    ).length : 0;
    let collaboration = Math.min(100, collabActions * 8);

    // AI Adoption: placeholder (can be enhanced with AI tool usage tracking)
    let aiAdoption = 0;

    // Calculate streak
    const { data: allActivities } = await supabase
        .from('activities')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

    const streak = calculateStreak(allActivities || []);
    const streakBonus = getStreakBonus(streak);

    // Composite Score
    let composite = (tempo * 0.35) + (taskCompletion * 0.25) + (collaboration * 0.25) + (aiAdoption * 0.15);
    composite *= (1 + streakBonus);
    composite = Math.round(composite * 100) / 100;

    return {
        user_id: userId,
        period: 'weekly',
        period_start: periodStart,
        tempo,
        task_completion: taskCompletion,
        collaboration,
        ai_adoption: aiAdoption,
        composite,
        streak,
    };
}

// ============ CALCULATE ALL USERS ============
export async function calculateAllScores() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const periodStart = weekStart.toISOString();
    const periodEnd = now.toISOString();

    const { data: users } = await supabase.from('users').select('id');
    if (!users) return [];

    const results = [];
    for (const user of users) {
        const score = await calculateUserScores(user.id, periodStart, periodEnd);
        // Upsert into scores table
        await supabase.from('scores').upsert(score, { onConflict: 'user_id,period,period_start' });
        results.push(score);
    }

    return results.sort((a, b) => b.composite - a.composite);
}
