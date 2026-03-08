import { readDBAsync, writeDBAsync } from "@/lib/db";
import { NextResponse } from "next/server";

function safeMembers(members) {
    return members.map(({ password, ...rest }) => rest);
}

export async function GET() {
    const db = await readDBAsync();
    return NextResponse.json(safeMembers(db.members));
}

export async function POST(req) {
    const body = await req.json();
    const db = await readDBAsync();
    const id = body.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/g, "");

    const exists = db.members.find(m => m.id === id || m.name.toLowerCase() === body.name.toLowerCase());
    if (exists) {
        return NextResponse.json({ error: "Thành viên đã tồn tại" }, { status: 409 });
    }

    const member = {
        id,
        username: body.username || id,
        password: body.password || "123456",
        avatar: body.avatar || "🧑‍💻",
        name: body.name,
        email: body.email || "",
        role: body.role || null,
        permissions: body.permissions || {
            canCreateTask: true, canAssignTask: false, canChangeStatus: true, canComment: true,
            canManageMembers: false, canManageRoles: false, canViewDashboard: true, canViewWorkflow: true,
        }
    };
    db.members.push(member);
    await writeDBAsync(db);

    const { password: _, ...safeMember } = member;
    return NextResponse.json(safeMember, { status: 201 });
}

export async function PUT(req) {
    const body = await req.json();
    const db = await readDBAsync();

    const idx = db.members.findIndex(m => m.id.toLowerCase() === body.id.toLowerCase());
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { password: _, ...safeBody } = body;
    db.members[idx] = { ...db.members[idx], ...safeBody, id: db.members[idx].id };
    await writeDBAsync(db);

    const { password: __, ...safeMember } = db.members[idx];
    return NextResponse.json(safeMember);
}

export async function DELETE(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const db = await readDBAsync();
    const idx = db.members.findIndex(m => m.id.toLowerCase() === id.toLowerCase());
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (db.members[idx].role === "chairman") {
        return NextResponse.json({ error: "Không thể xoá Chairman" }, { status: 403 });
    }

    const removed = db.members.splice(idx, 1)[0];
    await writeDBAsync(db);

    const { password: _, ...safeRemoved } = removed;
    return NextResponse.json(safeRemoved);
}
