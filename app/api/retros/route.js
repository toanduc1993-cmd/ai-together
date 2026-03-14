import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const epic_id = searchParams.get('epic_id');
        const project_id = searchParams.get('project_id');
        let q = supabase.from('epic_retros').select('*').order('created_at', { ascending: false });
        if (epic_id) q = q.eq('epic_id', epic_id);
        if (project_id) q = q.eq('project_id', project_id);
        const { data, error } = await q;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data || []);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { data, error } = await supabase.from('epic_retros').insert({
            epic_id: body.epic_id,
            project_id: body.project_id,
            wins: body.wins || '',
            improvements: body.improvements || '',
            lessons: body.lessons || '',
            created_by: body.created_by,
        }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
