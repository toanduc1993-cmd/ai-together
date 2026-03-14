import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    const { data: projects } = await supabase.from('projects').select('id, title');
    const results = [];
    for (const p of projects) {
        const { data: epics } = await supabase.from('epics').select('id').eq('project_id', p.id);
        const { data: modules } = await supabase.from('modules').select('id, title, epic_id, project_id').eq('project_id', p.id);
        results.push({
            project: p.title,
            id: p.id,
            epicsCount: epics?.length || 0,
            modulesCount: modules?.length || 0
        });
    }

    // Also see if any modules have a mis-matched epic's project_id
    const { data: allEpics } = await supabase.from('epics').select('id, project_id, title');
    return NextResponse.json({
        totalProjects: projects?.length,
        results,
        epics: allEpics
    });
}
