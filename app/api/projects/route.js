import { readDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const db = readDB();
    return NextResponse.json(db.projects);
}
