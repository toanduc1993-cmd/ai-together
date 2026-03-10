import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { createHmac } from "crypto";

// Document file extensions to auto-link
const DOC_EXTENSIONS = [
    ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt",
    ".csv", ".md", ".txt", ".rtf", ".odt", ".ods", ".odp",
    ".drawio", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp",
];

function isDocumentFile(filename) {
    const lower = filename.toLowerCase();
    return DOC_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function verifySignature(payload, signature, secret) {
    if (!secret || !signature) return !secret; // Skip if no secret configured
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expected = "sha256=" + hmac.digest("hex");
    return signature === expected;
}

export async function POST(req) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-hub-signature-256");
        const event = req.headers.get("x-github-event");
        const secret = process.env.GITHUB_WEBHOOK_SECRET || "";

        // Verify signature
        if (secret && !verifySignature(rawBody, signature, secret)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // Only handle push events
        if (event !== "push") {
            return NextResponse.json({ ok: true, message: `Ignored event: ${event}` });
        }

        const body = JSON.parse(rawBody);
        const repoFullName = body.repository?.full_name; // e.g. "toanduc1993-cmd/ai-together"
        const defaultBranch = body.repository?.default_branch || "main";
        const ref = body.ref; // e.g. "refs/heads/main"

        // Only process pushes to default branch
        if (ref !== `refs/heads/${defaultBranch}`) {
            return NextResponse.json({ ok: true, message: "Not default branch, skipped" });
        }

        if (!repoFullName) {
            return NextResponse.json({ error: "No repository info" }, { status: 400 });
        }

        // Find project linked to this repo
        const { data: projects } = await supabase
            .from("projects")
            .select("id, title")
            .eq("github_repo", repoFullName);

        if (!projects || projects.length === 0) {
            return NextResponse.json({ ok: true, message: `No project linked to ${repoFullName}` });
        }

        const project = projects[0];

        // Collect all document files from all commits
        const docFiles = new Map(); // path -> { action, filename }
        for (const commit of body.commits || []) {
            for (const path of [...(commit.added || []), ...(commit.modified || [])]) {
                if (isDocumentFile(path)) {
                    const filename = path.split("/").pop();
                    docFiles.set(path, { path, filename });
                }
            }
            // Remove deleted files
            for (const path of commit.removed || []) {
                docFiles.delete(path);
            }
        }

        if (docFiles.size === 0) {
            return NextResponse.json({ ok: true, message: "No document files in push" });
        }

        // Build GitHub raw URLs and insert into deliverable_files
        const inserted = [];
        for (const [path, { filename }] of docFiles) {
            const rawUrl = `https://raw.githubusercontent.com/${repoFullName}/${defaultBranch}/${path}`;

            // Check if this file already exists for this project (avoid duplicates)
            const { data: existing } = await supabase
                .from("deliverable_files")
                .select("id")
                .eq("project_id", project.id)
                .eq("filename", filename)
                .eq("file_url", rawUrl)
                .limit(1);

            if (existing && existing.length > 0) continue; // Skip duplicate

            // Get file extension to guess MIME type
            const ext = filename.split(".").pop()?.toLowerCase();
            const mimeTypes = {
                pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                doc: "application/msword", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xls: "application/vnd.ms-excel", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                csv: "text/csv", md: "text/markdown", txt: "text/plain",
                png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
            };

            const { data: record, error } = await supabase
                .from("deliverable_files")
                .insert({
                    filename,
                    file_url: rawUrl,
                    file_size: 0,
                    file_type: mimeTypes[ext] || "application/octet-stream",
                    checklist_label: `GitHub: ${path}`,
                    project_id: project.id,
                    module_id: null,
                    deliverable_id: null,
                })
                .select()
                .single();

            if (!error && record) inserted.push(record);
        }

        return NextResponse.json({
            ok: true,
            project: project.title,
            files_synced: inserted.length,
            files: inserted.map(f => f.filename),
        });
    } catch (err) {
        console.error("GitHub webhook error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// GET — health check
export async function GET() {
    return NextResponse.json({ status: "ok", message: "GitHub webhook endpoint ready" });
}
