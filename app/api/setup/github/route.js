import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}));
        const { repo, project_id, action } = body;

        // Step 1: Ensure github_repo column exists
        // Try to add the column using raw SQL via supabase-js postgrest
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (action === "migrate" || !action) {
            // Use Supabase SQL endpoint to run DDL
            const sqlRes = await fetch(`${url}/rest/v1/rpc/`, {
                method: "POST",
                headers: {
                    "apikey": key,
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({})
            });

            // Direct SQL via Supabase's pg_net or function
            // Fallback: try to select the column to see if it exists
            const { data: colTest, error: colErr } = await supabase
                .from("projects").select("github_repo").limit(1);

            if (colErr && colErr.message.includes("github_repo")) {
                // Column doesn't exist. Use the Supabase SQL API
                const sqlApiRes = await fetch(`${url}/sql`, {
                    method: "POST",
                    headers: {
                        "apikey": key,
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        query: "ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo TEXT DEFAULT NULL;"
                    })
                });

                if (!sqlApiRes.ok) {
                    // Try via pg REST API with raw query
                    const pgRes = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
                        method: "POST",
                        headers: {
                            "apikey": key,
                            "Authorization": `Bearer ${key}`,
                            "Content-Type": "application/json",
                            "Prefer": "return=representation",
                        },
                        body: JSON.stringify({
                            sql: "ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo TEXT DEFAULT NULL;"
                        })
                    });

                    if (!pgRes.ok) {
                        return NextResponse.json({
                            error: "Cannot auto-migrate. Please run SQL manually in Supabase Dashboard → SQL Editor",
                            sql: "ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo TEXT DEFAULT NULL;",
                            needs_manual: true,
                        }, { status: 400 });
                    }
                }

                return NextResponse.json({ ok: true, migrated: true, message: "Column github_repo added!" });
            }

            // Column exists
            if (!repo || !project_id) {
                return NextResponse.json({ ok: true, column_exists: true, message: "Column github_repo already exists. Provide repo + project_id to link." });
            }
        }

        // Step 2: Link repo to project
        if (repo && project_id) {
            const { error } = await supabase
                .from("projects")
                .update({ github_repo: repo })
                .eq("id", project_id);
            if (error) throw error;

            // Step 3: Auto-sync files
            const origin = new URL(req.url).origin;
            const syncRes = await fetch(`${origin}/api/webhooks/github`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_id }),
            });
            const syncData = await syncRes.json();

            return NextResponse.json({
                ok: true,
                linked: true,
                repo,
                project_id,
                sync: syncData,
            });
        }

        return NextResponse.json({ ok: true, column_exists: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// GET for listing projects (to get project IDs)
export async function GET() {
    try {
        const { data, error } = await supabase
            .from("projects")
            .select("id, title, slug, github_repo")
            .order("created_at", { ascending: false });
        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
