import { readDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
    const { username, password } = await req.json();

    if (!username || !password) {
        return NextResponse.json({ error: "Vui lòng nhập username và mật khẩu" }, { status: 400 });
    }

    const db = readDB();

    // Case-insensitive username lookup
    const member = db.members.find(
        m => (m.username || m.id).toLowerCase() === username.toLowerCase()
    );

    if (!member) {
        return NextResponse.json({ error: "Username không tồn tại" }, { status: 401 });
    }

    if (member.password !== password) {
        return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 });
    }

    // Create session token (simple base64 token for dev)
    const token = Buffer.from(`${member.id}:${Date.now()}`).toString("base64");

    // Return user data without password
    const { password: _, ...safeUser } = member;
    return NextResponse.json({ user: safeUser, token }, { status: 200 });
}
