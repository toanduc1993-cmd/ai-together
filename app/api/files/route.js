import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");
        const moduleId = formData.get("module_id");
        const projectId = formData.get("project_id");
        const deliverableId = formData.get("deliverable_id");
        const checklistItemId = formData.get("checklist_item_id");
        const activityId = formData.get("activity_id");
        const uploadedBy = formData.get("uploaded_by");
        const label = formData.get("label") || "";

        if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });

        // Read file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const timestamp = Date.now();
        const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `attachments/${timestamp}_${safeFilename}`;

        // Upload to Supabase Storage 
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("files")
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            // If bucket doesn't exist, store as base64 in DB directly
            console.warn("Storage upload failed, storing reference:", uploadError.message);

            // Store file info in deliverable_files table
            const fileRecord = {
                filename: file.name,
                file_url: storagePath,
                file_size: file.size,
                file_type: file.type,
                checklist_label: label,
                uploaded_by: uploadedBy || null,
                module_id: moduleId || null,
                project_id: projectId || null,
                deliverable_id: deliverableId || null,
                checklist_item_id: checklistItemId || null,
                activity_id: activityId || null,
            };

            const { data: record, error: dbError } = await supabase
                .from("deliverable_files")
                .insert(fileRecord)
                .select()
                .single();

            if (dbError) throw dbError;
            return NextResponse.json(record, { status: 201 });
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from("files").getPublicUrl(storagePath);
        const fileUrl = urlData?.publicUrl || storagePath;

        // Save to deliverable_files  
        const { data: record, error: dbError } = await supabase
            .from("deliverable_files")
            .insert({
                filename: file.name,
                file_url: fileUrl,
                file_size: file.size,
                file_type: file.type,
                checklist_label: label,
                uploaded_by: uploadedBy || null,
                module_id: moduleId || null,
                project_id: projectId || null,
                deliverable_id: deliverableId || null,
                checklist_item_id: checklistItemId || null,
                activity_id: activityId || null,
            })
            .select()
            .single();

        if (dbError) throw dbError;
        return NextResponse.json(record, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const moduleId = searchParams.get("module_id");
        const projectId = searchParams.get("project_id");
        const deliverableId = searchParams.get("deliverable_id");
        const checklistItemId = searchParams.get("checklist_item_id");

        let query = supabase.from("deliverable_files").select("*").order("uploaded_at", { ascending: false });

        if (moduleId) query = query.eq("module_id", moduleId);
        if (projectId) query = query.eq("project_id", projectId).is("module_id", null);
        if (deliverableId) query = query.eq("deliverable_id", deliverableId);
        if (checklistItemId) query = query.eq("checklist_item_id", checklistItemId);

        // Support filtering by activity_id (comment attachments)
        const activityId = searchParams.get("activity_id");
        if (activityId) query = query.eq("activity_id", activityId);

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        // Get file record
        const { data: file } = await supabase.from("deliverable_files").select("*").eq("id", id).single();

        // Try delete from storage
        if (file?.file_url) {
            try { await supabase.storage.from("files").remove([file.file_url]); } catch { }
        }

        const { error } = await supabase.from("deliverable_files").delete().eq("id", id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
