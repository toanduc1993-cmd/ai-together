import { getUsers, createUser, updateUser, deleteUser, stripPassword } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const users = await getUsers();
        return NextResponse.json(users);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        if (!body.username || !body.display_name) {
            return NextResponse.json({ error: "Username và tên hiển thị là bắt buộc" }, { status: 400 });
        }
        const user = await createUser({
            username: body.username.toLowerCase(),
            display_name: body.display_name,
            email: body.email || "",
            password_hash: body.password || "123456",
            role: body.role || "developer",
            avatar: body.avatar || "🧑‍💻",
            bio: body.bio || "",
            permissions: body.permissions || {},
        });
        return NextResponse.json(stripPassword(user), { status: 201 });
    } catch (err) {
        if (err.code === "23505") {
            return NextResponse.json({ error: "Username đã tồn tại" }, { status: 409 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        const { id, password_hash, ...updates } = body;
        const user = await updateUser(id, updates);
        return NextResponse.json(stripPassword(user));
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        await deleteUser(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
