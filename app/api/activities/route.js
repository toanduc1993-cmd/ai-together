import { readDB, writeDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const db = readDB();
    return NextResponse.json(db.activities);
}

export async function POST(req) {
    const body = await req.json();
    const db = readDB();
    const activity = { id: Date.now(), ts: Date.now(), ...body };
    db.activities.push(activity);
    writeDB(db);
    return NextResponse.json(activity, { status: 201 });
}
