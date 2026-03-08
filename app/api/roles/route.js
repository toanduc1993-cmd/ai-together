import { readDBAsync, writeDBAsync } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const db = await readDBAsync();
    return NextResponse.json(db.roles);
}

export async function POST(req) {
    const body = await req.json();
    const db = await readDBAsync();
    const id = body.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const role = { id, ...body };
    db.roles.push(role);
    await writeDBAsync(db);
    return NextResponse.json(role, { status: 201 });
}
