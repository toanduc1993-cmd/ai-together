import { getScores, upsertScore } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const period = searchParams.get("period") || "weekly";
        const scores = await getScores(period);
        return NextResponse.json(scores);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        if (!body.user_id) return NextResponse.json({ error: "user_id là bắt buộc" }, { status: 400 });
        const score = await upsertScore(body);
        return NextResponse.json(score);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
