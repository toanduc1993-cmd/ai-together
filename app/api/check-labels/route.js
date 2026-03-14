import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Since Supabase doesn't allow raw DDL via REST, we run a raw SQL via RPC
    // Actually test if labels column exists via a safe query
    const { data, error } = await supabase
        .from('modules')
        .select('labels')
        .limit(1);

    if (error && error.message.includes('labels')) {
        return NextResponse.json({ message: 'labels column not yet added; please run add_labels.sql in Supabase SQL Editor', error: error.message });
    }
    return NextResponse.json({ success: true, message: 'labels column exists' });
}
