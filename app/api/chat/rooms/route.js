import { supabase, createNotification } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("user_id");
        if (!userId) return NextResponse.json({ error: "Cần user_id" }, { status: 400 });

        // Get rooms that user is a member of
        const { data: memberships } = await supabase
            .from("chat_room_members")
            .select("room_id")
            .eq("user_id", userId);

        if (!memberships || memberships.length === 0) {
            return NextResponse.json([]);
        }

        const roomIds = memberships.map(m => m.room_id);
        const { data: rooms, error } = await supabase
            .from("chat_rooms")
            .select("*, members:chat_room_members(user_id, user:users(id, display_name, avatar, username))")
            .in("id", roomIds)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Get last message for each room
        for (const room of rooms || []) {
            const { data: msgs } = await supabase
                .from("chat_messages")
                .select("content, sender_id, created_at, sender:users!chat_messages_sender_id_fkey(display_name)")
                .eq("room_id", room.id)
                .order("created_at", { ascending: false })
                .limit(1);
            room.last_message = msgs?.[0] || null;
        }

        return NextResponse.json(rooms || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { type, name, project_id, module_id, member_ids, created_by } = body;

        if (!type) return NextResponse.json({ error: "type bắt buộc" }, { status: 400 });

        // For direct chat, check if room already exists
        if (type === "direct" && member_ids?.length === 2) {
            const { data: existing } = await supabase
                .from("chat_rooms")
                .select("id, members:chat_room_members(user_id)")
                .eq("type", "direct");

            if (existing) {
                for (const room of existing) {
                    const members = room.members.map(m => m.user_id).sort();
                    const target = [...member_ids].sort();
                    if (members.length === 2 && members[0] === target[0] && members[1] === target[1]) {
                        return NextResponse.json(room);
                    }
                }
            }
        }

        // Create room
        const { data: room, error } = await supabase
            .from("chat_rooms")
            .insert({ type, name: name || "", project_id: project_id || null, module_id: module_id || null })
            .select()
            .single();

        if (error) throw error;

        // Add members
        if (member_ids && member_ids.length > 0) {
            const members = member_ids.map(uid => ({ room_id: room.id, user_id: uid }));
            await supabase.from("chat_room_members").insert(members);
        }

        return NextResponse.json(room, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
