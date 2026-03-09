import { getUserByUsername, stripPassword } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req) {
    const { username, password } = await req.json();
    if (!username || !password) {
        return NextResponse.json({ error: "Vui lòng nhập username và mật khẩu" }, { status: 400 });
    }

    try {
        const user = await getUserByUsername(username);
        if (!user) {
            return NextResponse.json({ error: "Username không tồn tại" }, { status: 401 });
        }
        if (user.password_hash !== password) {
            return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 });
        }

        const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
        return NextResponse.json({ user: stripPassword(user), token });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
