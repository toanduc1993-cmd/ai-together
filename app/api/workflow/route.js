import { readDBAsync, writeDBAsync } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const db = await readDBAsync();
    return NextResponse.json(db.workflow || null);
}

export async function POST(req) {
    const body = await req.json();
    const db = await readDBAsync();

    if (!db.workflow) {
        return NextResponse.json({ error: "No workflow data" }, { status: 404 });
    }

    if (body.action === "updateStep") {
        const idx = db.workflow.steps.findIndex(s => s.id === body.stepId);
        if (idx === -1) return NextResponse.json({ error: "Step not found" }, { status: 404 });
        db.workflow.steps[idx].status = body.status;
        await writeDBAsync(db);
        return NextResponse.json(db.workflow.steps[idx]);
    }

    if (body.action === "addStandup") {
        const entry = {
            id: Date.now(),
            date: new Date().toISOString().split("T")[0],
            author: body.author,
            yesterday: body.yesterday,
            today: body.today,
            blockers: body.blockers || "Không có",
        };
        db.workflow.dailyStandups.push(entry);
        await writeDBAsync(db);
        return NextResponse.json(entry, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
