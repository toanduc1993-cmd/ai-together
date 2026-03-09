import { getNotifications, markNotificationsRead } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("user_id");
        if (!userId) return NextResponse.json({ error: "Cần user_id" }, { status: 400 });
        const unreadOnly = searchParams.get("unread") === "true";
        const notifications = await getNotifications(userId, unreadOnly);
        return NextResponse.json(notifications);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        if (!body.user_id) return NextResponse.json({ error: "user_id là bắt buộc" }, { status: 400 });
        await markNotificationsRead(body.user_id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
