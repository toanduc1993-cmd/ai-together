import { supabase, createActivity, createNotification } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get("room_id");
        const pinned = searchParams.get("pinned");
        if (!roomId) return NextResponse.json({ error: "Cần room_id" }, { status: 400 });

        let query = supabase
            .from("chat_messages")
            .select("*, sender:users!chat_messages_sender_id_fkey(id, display_name, avatar, username)")
            .eq("room_id", roomId)
            .order("created_at", { ascending: true })
            .limit(100);

        if (pinned === "true") query = query.eq("is_pinned", true);

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
        if (!body.room_id || !body.sender_id || !body.content?.trim()) {
            return NextResponse.json({ error: "room_id, sender_id, và content bắt buộc" }, { status: 400 });
        }

        const { data: msg, error } = await supabase
            .from("chat_messages")
            .insert({
                room_id: body.room_id,
                sender_id: body.sender_id,
                content: body.content,
                type: body.type || "text",
                file_url: body.file_url || "",
                mentions: body.mentions || [],
            })
            .select("*, sender:users!chat_messages_sender_id_fkey(id, display_name, avatar)")
            .single();

        if (error) throw error;

        // Log activity
        await createActivity({
            user_id: body.sender_id,
            action_type: "chat_message",
            entity_type: "chat_room",
            entity_id: body.room_id,
            detail: body.content.substring(0, 80),
        });

        // Handle @mentions — send notifications
        if (body.mentions && body.mentions.length > 0) {
            for (const mentionedUserId of body.mentions) {
                if (mentionedUserId !== body.sender_id) {
                    await createNotification({
                        user_id: mentionedUserId,
                        type: "mention",
                        title: `${msg.sender?.display_name || "Ai đó"} đã nhắc đến bạn`,
                        body: body.content.substring(0, 120),
                        entity_type: "chat_room",
                        entity_id: body.room_id,
                    });
                }
            }
        }

        return NextResponse.json(msg, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const updates = {};
        if (typeof body.is_pinned === "boolean") updates.is_pinned = body.is_pinned;

        const { data, error } = await supabase
            .from("chat_messages")
            .update(updates)
            .eq("id", body.id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
