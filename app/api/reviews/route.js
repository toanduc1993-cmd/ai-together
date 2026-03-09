import { createReview, getReviewsByDeliverable, updateDeliverable, updateModule, createActivity, createNotification, supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const deliverableId = searchParams.get("deliverable_id");
        if (!deliverableId) return NextResponse.json({ error: "Cần deliverable_id" }, { status: 400 });
        const reviews = await getReviewsByDeliverable(deliverableId);
        return NextResponse.json(reviews);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        if (!body.deliverable_id || !body.reviewer_id || !body.decision) {
            return NextResponse.json({ error: "deliverable_id, reviewer_id, và decision là bắt buộc" }, { status: 400 });
        }

        const review = await createReview({
            deliverable_id: body.deliverable_id,
            reviewer_id: body.reviewer_id,
            decision: body.decision,
            comment: body.comment || "",
        });

        // Update deliverable status
        await updateDeliverable(body.deliverable_id, { status: body.decision });

        // Get deliverable to find module
        const { data: deliverable } = await supabase.from("deliverables").select("module_id, submitted_by").eq("id", body.deliverable_id).single();

        if (deliverable) {
            // Update module status based on decision
            const moduleStatus = body.decision === "approved" ? "approved" : body.decision === "rejected" ? "rejected" : "changes_requested";
            await updateModule(deliverable.module_id, { status: moduleStatus });

            // Log activity
            const DECISION_LABELS = { approved: "Phê duyệt", changes_requested: "Yêu cầu sửa", rejected: "Từ chối" };
            await createActivity({
                user_id: body.reviewer_id,
                action_type: "review_submitted",
                entity_type: "review",
                entity_id: review.id,
                detail: `Review: ${DECISION_LABELS[body.decision]}${body.comment ? ` — ${body.comment}` : ""}`,
                project_id: body.project_id,
            });

            // Notify developer
            await createNotification({
                user_id: deliverable.submitted_by,
                type: "review_result",
                title: `Kết quả review: ${DECISION_LABELS[body.decision]}`,
                body: body.comment || `Module được ${DECISION_LABELS[body.decision].toLowerCase()}.`,
                entity_type: "deliverable",
                entity_id: body.deliverable_id,
            });
        }

        return NextResponse.json(review, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
