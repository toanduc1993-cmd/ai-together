import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("user_id");
        const entityType = searchParams.get("entity_type");
        const limit = parseInt(searchParams.get("limit") || "50");

        let query = supabase.from("audit_logs").select(`
      *, user:users!audit_logs_user_id_fkey(id, display_name, avatar, username)
    `).order("created_at", { ascending: false }).limit(limit);

        if (userId) query = query.eq("user_id", userId);
        if (entityType) query = query.eq("entity_type", entityType);

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        if (!body.action) return NextResponse.json({ error: "action bắt buộc" }, { status: 400 });

        const { data, error } = await supabase.from("audit_logs").insert({
            user_id: body.user_id || null,
            action: body.action,
            entity_type: body.entity_type || "",
            entity_id: body.entity_id || null,
            details: body.details || {},
        }).select().single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
