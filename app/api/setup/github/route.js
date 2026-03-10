import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// One-shot setup endpoint: adds github_repo column + links repo to project
export async function POST(req) {
    try {
        const { repo, project_id } = await req.json();

        // Step 1: Add github_repo column if not exists
        // We do this by trying to update — if column doesn't exist, we know
        const { error: colCheck } = await supabase
            .from("projects").select("github_repo").limit(1);

        if (colCheck) {
            // Column doesn't exist — run raw SQL via Supabase REST
            // Since we can't run DDL through the client, we'll handle gracefully
            return NextResponse.json({
                error: "Column 'github_repo' missing. Run in SQL Editor: ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo TEXT DEFAULT NULL;",
                needs_migration: true,
            }, { status: 400 });
        }

        // Step 2: Link repo to project
        if (repo && project_id) {
            const { error } = await supabase
                .from("projects")
                .update({ github_repo: repo })
                .eq("id", project_id);
            if (error) throw error;
        }

        // Step 3: If repo linked, sync files
        if (repo && project_id) {
            const syncRes = await fetch(
                new URL("/api/webhooks/github", req.url).toString(),
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ project_id }),
                }
            );
            const syncData = await syncRes.json();
            return NextResponse.json({ ok: true, linked: true, sync: syncData });
        }

        return NextResponse.json({ ok: true, column_exists: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
