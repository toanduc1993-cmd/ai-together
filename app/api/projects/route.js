import { getProjects, createProject, updateProject, createActivity, createNotification, getUsers } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const projects = await getProjects();
        return NextResponse.json(projects);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        if (!body.title) return NextResponse.json({ error: "Tên project là bắt buộc" }, { status: 400 });

        const slug = body.slug || body.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
        const project = await createProject({
            title: body.title,
            slug,
            description: body.description || "",
            chairman_id: body.chairman_id || null,
            lead_id: body.lead_id || null,
            status: body.status || "active",
            deadline: body.deadline || null,
        });

        // Create activity
        if (body.chairman_id) {
            await createActivity({
                user_id: body.chairman_id,
                action_type: "project_created",
                entity_type: "project",
                entity_id: project.id,
                detail: `Tạo project: ${body.title}`,
                project_id: project.id,
            });
        }

        // Notify lead
        if (body.lead_id && body.lead_id !== body.chairman_id) {
            await createNotification({
                user_id: body.lead_id,
                type: "project_assigned",
                title: "Bạn được chỉ định làm Project Lead",
                body: `Project "${body.title}" cần bạn lên kế hoạch module.`,
                entity_type: "project",
                entity_id: project.id,
            });
        }

        return NextResponse.json(project, { status: 201 });
    } catch (err) {
        if (err.code === "23505") {
            return NextResponse.json({ error: "Slug project đã tồn tại" }, { status: 409 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        const { id, ...updates } = body;
        const project = await updateProject(id, updates);
        return NextResponse.json(project);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
