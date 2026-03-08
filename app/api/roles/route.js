import { readDB, writeDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const db = readDB();
    return NextResponse.json(db.roles);
}

export async function POST(req) {
    const body = await req.json();
    const db = readDB();
    const id = body.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const role = { id, ...body };
    db.roles.push(role);
    writeDB(db);
    return NextResponse.json(role, { status: 201 });
}
