import { readDBAsync, writeDBAsync } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const db = await readDBAsync();
    return NextResponse.json(db.activities);
}

export async function POST(req) {
    const body = await req.json();
    const db = await readDBAsync();
    const activity = { id: Date.now(), ts: Date.now(), ...body };
    db.activities.push(activity);
    await writeDBAsync(db);
    return NextResponse.json(activity, { status: 201 });
}
