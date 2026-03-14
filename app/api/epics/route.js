import { NextResponse } from 'next/server';
import { getEpicsByProject, createEpic, updateEpic, deleteEpic } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');

    try {
        if (!project_id) {
            return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
        }
        const data = await getEpicsByProject(project_id);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const data = await createEpic(body);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const { id, ...updates } = await request.json();
        const data = await updateEpic(id, updates);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        await deleteEpic(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
