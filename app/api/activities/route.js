import { getActivities, createActivity } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("project_id");
        const limit = parseInt(searchParams.get("limit") || "50");
        const activities = await getActivities(limit, projectId);
        return NextResponse.json(activities);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        if (!body.user_id || !body.action_type) {
            return NextResponse.json({ error: "user_id và action_type là bắt buộc" }, { status: 400 });
        }
        const activity = await createActivity(body);
        return NextResponse.json(activity, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
