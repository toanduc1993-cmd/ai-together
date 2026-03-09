import { getScores } from "@/lib/supabase";
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

// POST disabled — scores can only be written via /api/scores/calculate
export async function POST() {
    return NextResponse.json(
        { error: "Score không thể gửi trực tiếp. Dùng /api/scores/calculate để tính điểm." },
        { status: 403 }
    );
}
