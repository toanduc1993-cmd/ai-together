import { getModulesByProject, getModuleById, getAllModules, createModule, updateModule, deleteModule, createActivity, createNotification, setModuleAssignees } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("project_id");
        const moduleId = searchParams.get("id");

        if (moduleId) {
            const mod = await getModuleById(moduleId);
            return NextResponse.json(mod);
        }
        if (projectId) {
            const modules = await getModulesByProject(projectId);
            return NextResponse.json(modules);
        }
        // No filter → return ALL modules (single query, avoids N+1)
        const modules = await getAllModules();
        return NextResponse.json(modules);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        if (!body.project_id || !body.title) {
            return NextResponse.json({ error: "project_id và title là bắt buộc" }, { status: 400 });
        }
        if (body.title.length > 200) {
            return NextResponse.json({ error: "Tên module quá dài (tối đa 200 ký tự)" }, { status: 400 });
        }

        // Support multi-assign: assigned_to_ids[] or legacy assigned_to
        const assignedIds = body.assigned_to_ids || (body.assigned_to ? [body.assigned_to] : []);

        const mod = await createModule({
            project_id: body.project_id,
            epic_id: body.epic_id || null,
            title: body.title,
            description: body.description || "",
            assigned_to: assignedIds[0] || null,
            status: "planned",
            priority: body.priority || "medium",
            deadline: body.deadline || null,
            progress_pct: 0,
        });

        // Sync multi-assign table
        if (assignedIds.length > 0) {
            try { await setModuleAssignees(mod.id, assignedIds); } catch { }
        }

        // Activity log
        if (body.created_by) {
            await createActivity({
                user_id: body.created_by,
                action_type: "module_created",
                entity_type: "module",
                entity_id: mod.id,
                detail: `Tạo module: ${body.title}`,
                project_id: body.project_id,
            });
        }

        // Notify all assigned users
        for (const uid of assignedIds) {
            if (uid && uid !== body.created_by) {
                await createNotification({
                    user_id: uid,
                    type: "module_assigned",
                    title: "Bạn được assign module mới",
                    body: `Module "${body.title}" cần bạn phát triển.`,
                    entity_type: "module",
                    entity_id: mod.id,
                });
            }
        }

        return NextResponse.json(mod, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        const { id, user_id, project_id, assigned_to_ids, ...updates } = body;

        // Handle multi-assign update
        if (assigned_to_ids !== undefined) {
            try { await setModuleAssignees(id, assigned_to_ids || []); } catch { }
            // Also update the legacy assigned_to field
            updates.assigned_to = assigned_to_ids?.[0] || null;
        }

        // If status changed, log activity with module name
        if (updates.status && user_id) {
            const STATUS_LABELS = {
                planned: "Kế hoạch", in_progress: "Đang thực hiện", in_review: "Chờ duyệt",
                review: "Review", submitted: "Đã nộp", approved: "Phê duyệt",
                changes_requested: "Yêu cầu sửa", rejected: "Từ chối", done: "Hoàn thành"
            };
            // Fetch current module to get title
            const currentMod = await getModuleById(id);
            const modTitle = currentMod?.title || "module";
            await createActivity({
                user_id: user_id,
                action_type: "module_status_changed",
                entity_type: "module",
                entity_id: id,
                detail: `Chuyển "${modTitle}" → ${STATUS_LABELS[updates.status] || updates.status}`,
                project_id: project_id,
            });
        }

        const mod = await updateModule(id, updates);
        return NextResponse.json(mod);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        await deleteModule(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
