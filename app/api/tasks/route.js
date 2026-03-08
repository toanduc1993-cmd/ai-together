import { readDBAsync, writeDBAsync } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const db = await readDBAsync();
    return NextResponse.json(db.tasks);
}

export async function POST(req) {
    const body = await req.json();
    const db = await readDBAsync();

    if (body.action === "create") {
        const num = db.nextTaskNum || db.tasks.length + 1;
        const id = `T-${String(num).padStart(3, "0")}`;
        const task = {
            id,
            title: body.title,
            owner: body.owner,
            assignedBy: body.assignedBy,
            project: body.project,
            status: "todo",
            priority: body.priority || "medium",
            deadline: body.deadline || "",
            comments: [],
        };
        db.tasks.push(task);
        db.nextTaskNum = num + 1;

        db.activities.push({
            id: Date.now(),
            ts: Date.now(),
            user: body.assignedBy,
            type: "task_created",
            text: `Tạo task ${id}: ${body.title}`,
            project: body.project,
            assignee: body.owner,
        });

        await writeDBAsync(db);
        return NextResponse.json(task, { status: 201 });
    }

    if (body.action === "status") {
        const idx = db.tasks.findIndex(t => t.id === body.taskId);
        if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
        db.tasks[idx].status = body.status;

        const STATUS_LABELS = { todo: "Todo", doing: "Đang làm", review: "Review", done: "Hoàn thành", blocked: "Blocked" };
        db.activities.push({
            id: Date.now(),
            ts: Date.now(),
            user: body.userId || db.tasks[idx].owner,
            type: "status",
            text: `Chuyển ${body.taskId} → ${STATUS_LABELS[body.status] || body.status}`,
            project: db.tasks[idx].project,
            taskId: body.taskId,
        });

        await writeDBAsync(db);
        return NextResponse.json(db.tasks[idx]);
    }

    if (body.action === "comment") {
        const idx = db.tasks.findIndex(t => t.id === body.taskId);
        if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
        const comment = { author: body.author, text: body.text, ts: Date.now() };
        db.tasks[idx].comments.push(comment);

        db.activities.push({
            id: Date.now(),
            ts: Date.now(),
            user: body.author,
            type: "comment",
            text: body.text,
            project: db.tasks[idx].project,
            taskId: body.taskId,
        });

        await writeDBAsync(db);
        return NextResponse.json(comment, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function PUT(req) {
    const body = await req.json();
    const db = await readDBAsync();
    const idx = db.tasks.findIndex(t => t.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    db.tasks[idx] = { ...db.tasks[idx], ...body };
    await writeDBAsync(db);
    return NextResponse.json(db.tasks[idx]);
}
