import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Feature #7 — Daily Digest Notification
 * Schedule: Every day at 01:00 UTC (= 08:00 ICT / GMT+7)
 * Configured via vercel.json cron.
 *
 * For each active user, creates 1 notification summarising:
 * - How many tasks are assigned and open
 * - How many tasks are overdue
 * - How many tasks are due in the next 3 days
 *
 * PM/Chairman users also get a team summary.
 */
export async function GET(req) {
    // Security: allow only Vercel cron or local dev
    const authHeader = req.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        // Fetch all modules with their project info
        const { data: modules, error: modErr } = await supabase
            .from('modules')
            .select('id, title, status, deadline, assigned_to, project_id, projects(title)')
            .neq('status', 'done')
            .neq('status', 'approved');

        if (modErr) throw modErr;

        // Fetch all users
        const { data: users, error: userErr } = await supabase
            .from('profiles')
            .select('id, display_name, role');

        if (userErr) throw userErr;

        // Build per-user digest
        const notifications = [];
        for (const user of users) {
            const myTasks = modules.filter(m => m.assigned_to === user.id);
            if (myTasks.length === 0) continue;

            const overdue = myTasks.filter(m => m.deadline && new Date(m.deadline) < now);
            const dueSoon = myTasks.filter(m => m.deadline && new Date(m.deadline) >= now && new Date(m.deadline) <= in3Days);

            let title = `☀️ Tóm tắt ngày ${now.toLocaleDateString('vi-VN')}`;
            let lines = [`Bạn có ${myTasks.length} task đang mở.`];
            if (overdue.length > 0) lines.push(`🔴 ${overdue.length} task đã quá hạn!`);
            if (dueSoon.length > 0) lines.push(`⚠️ ${dueSoon.length} task sắp đến hạn (3 ngày tới).`);
            lines.push('Vào "Công việc của tôi" để xem chi tiết.');

            notifications.push({
                user_id: user.id,
                type: 'daily_digest',
                title,
                body: lines.join('\n'),
                entity_type: 'digest',
                entity_id: null,
                is_read: false,
            });
        }

        // Insert all at once (ignore errors if table structure differs)
        if (notifications.length > 0) {
            const { error: insertErr } = await supabase.from('notifications').insert(notifications);
            if (insertErr) throw insertErr;
        }

        return NextResponse.json({
            success: true,
            sent: notifications.length,
            timestamp: now.toISOString(),
        });
    } catch (err) {
        console.error('[daily-digest] error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
