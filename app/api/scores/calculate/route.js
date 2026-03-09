import { calculateAllScores } from "@/lib/scoring";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const results = await calculateAllScores();
        return NextResponse.json({ success: true, scores: results });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const results = await calculateAllScores();
        return NextResponse.json(results);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
