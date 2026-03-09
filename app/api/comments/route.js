import { getCommentsByModule, createComment, getModuleById, createNotification } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const moduleId = searchParams.get("module_id");
        if (!moduleId) return NextResponse.json({ error: "Cần module_id" }, { status: 400 });
        const comments = await getCommentsByModule(moduleId);
        return NextResponse.json(comments);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        if (!body.module_id || !body.user_id || !body.text) {
            return NextResponse.json({ error: "module_id, user_id và text là bắt buộc" }, { status: 400 });
        }
        if (body.text.trim().length === 0) {
            return NextResponse.json({ error: "Comment không được trống" }, { status: 400 });
        }
        if (body.text.length > 2000) {
            return NextResponse.json({ error: "Comment quá dài (tối đa 2000 ký tự)" }, { status: 400 });
        }

        const comment = await createComment({
            moduleId: body.module_id,
            userId: body.user_id,
            text: body.text.trim(),
            projectId: body.project_id || null,
        });

        // Notify the module assignee (if different from commenter)
        try {
            const mod = await getModuleById(body.module_id);
            if (mod && mod.assigned_to && mod.assigned_to !== body.user_id) {
                await createNotification({
                    user_id: mod.assigned_to,
                    type: "comment",
                    title: "💬 Bình luận mới",
                    body: `Có bình luận mới trên module "${mod.title}"`,
                    entity_type: "module",
                    entity_id: body.module_id,
                });
            }
        } catch { /* notification failure should not block */ }

        return NextResponse.json(comment, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
