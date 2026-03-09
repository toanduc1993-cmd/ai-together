import { getModulesByProject, getModuleById, createModule, updateModule, createActivity, createNotification } from "@/lib/supabase";
import { NextResponse } from "next/server";

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
        return NextResponse.json({ error: "Cần project_id hoặc id" }, { status: 400 });
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

        const mod = await createModule({
            project_id: body.project_id,
            title: body.title,
            description: body.description || "",
            assigned_to: body.assigned_to || null,
            status: "planned",
            priority: body.priority || "medium",
            deadline: body.deadline || null,
            progress_pct: 0,
        });

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

        // Notify assigned user
        if (body.assigned_to) {
            await createNotification({
                user_id: body.assigned_to,
                type: "module_assigned",
                title: "Bạn được assign module mới",
                body: `Module "${body.title}" cần bạn phát triển.`,
                entity_type: "module",
                entity_id: mod.id,
            });
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
        const { id, user_id, project_id, ...updates } = body;

        // If status changed, log activity
        if (updates.status && user_id) {
            const STATUS_LABELS = {
                planned: "Kế hoạch", in_progress: "Đang phát triển", review: "Review",
                submitted: "Đã nộp", approved: "Phê duyệt", changes_requested: "Yêu cầu sửa",
                rejected: "Từ chối", done: "Hoàn thành"
            };
            await createActivity({
                user_id: user_id,
                action_type: "module_status_changed",
                entity_type: "module",
                entity_id: id,
                detail: `Chuyển module → ${STATUS_LABELS[updates.status] || updates.status}`,
                project_id: project_id,
            });
        }

        const mod = await updateModule(id, updates);
        return NextResponse.json(mod);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
