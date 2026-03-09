import { createDeliverable, getDeliverablesByModule, updateDeliverable, updateModule, createActivity, createNotification, supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const moduleId = searchParams.get("module_id");
        if (!moduleId) return NextResponse.json({ error: "Cần module_id" }, { status: 400 });
        const deliverables = await getDeliverablesByModule(moduleId);
        return NextResponse.json(deliverables);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        if (!body.module_id || !body.submitted_by) {
            return NextResponse.json({ error: "module_id và submitted_by là bắt buộc" }, { status: 400 });
        }

        const deliverable = await createDeliverable({
            module_id: body.module_id,
            submitted_by: body.submitted_by,
            demo_link: body.demo_link || "",
            notes: body.notes || "",
            status: "pending",
        });

        // Update module status to submitted
        await updateModule(body.module_id, { status: "submitted" });

        // Log activity
        await createActivity({
            user_id: body.submitted_by,
            action_type: "deliverable_submitted",
            entity_type: "deliverable",
            entity_id: deliverable.id,
            detail: `Nộp kết quả module`,
            project_id: body.project_id,
        });

        // Notify chairman
        if (body.chairman_id) {
            await createNotification({
                user_id: body.chairman_id,
                type: "deliverable_submitted",
                title: "Module mới cần review",
                body: `Nhân sự đã nộp kết quả, cần bạn review.`,
                entity_type: "deliverable",
                entity_id: deliverable.id,
            });
        }

        return NextResponse.json(deliverable, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
