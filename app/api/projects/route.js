import { readDBAsync } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const db = await readDBAsync();
    return NextResponse.json(db.projects);
}
