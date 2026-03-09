import { getChecklistByModule, createChecklistItem, updateChecklistItem, deleteChecklistItem, createActivity, createNotification, getModuleById, supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const moduleId = searchParams.get("module_id");
        if (!moduleId) return NextResponse.json({ error: "Cần module_id" }, { status: 400 });
        const items = await getChecklistByModule(moduleId);
        return NextResponse.json(items);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        if (!body.module_id || !body.title) {
            return NextResponse.json({ error: "module_id và title là bắt buộc" }, { status: 400 });
        }

        const item = await createChecklistItem({
            module_id: body.module_id,
            title: body.title,
            description: body.description || "",
            assigned_to: body.assigned_to || null,
            assigned_by: body.assigned_by || null,
            status: "todo",
            priority: body.priority || "medium",
            deadline: body.deadline || null,
        });

        // Log activity
        if (body.assigned_by) {
            await createActivity({
                user_id: body.assigned_by,
                action_type: "checklist_created",
                entity_type: "checklist_item",
                entity_id: item.id,
                detail: `Tạo task: ${body.title}`,
                project_id: body.project_id,
            });
        }

        // Notify assignee
        if (body.assigned_to && body.assigned_to !== body.assigned_by) {
            await createNotification({
                user_id: body.assigned_to,
                type: "task_assigned",
                title: "Bạn được giao task mới",
                body: `Task: "${body.title}"`,
                entity_type: "checklist_item",
                entity_id: item.id,
            });
        }

        // Update module progress
        await recalcModuleProgress(body.module_id);

        return NextResponse.json(item, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        const { id, user_id, project_id, ...updates } = body;

        // If completing, set completed_at
        if (updates.status === "done") {
            updates.completed_at = new Date().toISOString();
        }

        const item = await updateChecklistItem(id, updates);

        // Log status change
        if (updates.status && user_id) {
            const STATUS_LABELS = { todo: "Todo", doing: "Đang làm", done: "Hoàn thành", blocked: "Blocked" };
            await createActivity({
                user_id,
                action_type: "checklist_status_changed",
                entity_type: "checklist_item",
                entity_id: id,
                detail: `Chuyển task → ${STATUS_LABELS[updates.status] || updates.status}`,
                project_id,
            });
        }

        // Recalc module progress
        if (item.module_id) {
            await recalcModuleProgress(item.module_id);
        }

        return NextResponse.json(item);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        await deleteChecklistItem(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Recalculate module progress based on checklist completion
async function recalcModuleProgress(moduleId) {
    try {
        const { data: items } = await supabase.from("checklist_items").select("status").eq("module_id", moduleId);
        if (!items || items.length === 0) return;
        const done = items.filter(i => i.status === "done").length;
        const pct = Math.round((done / items.length) * 100);
        await supabase.from("modules").update({ progress_pct: pct }).eq("id", moduleId);
    } catch { }
}
