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

/**
 * Resolve module_id from file path by matching against module titles.
 * Path pattern: docs/projects/{UUID}/filename.ext
 * Matching: normalize filename → compare with module titles
 * e.g. "platform_architecture.md" matches module "Platform Architecture"
 */
async function resolveModuleFromPath(filePath, projectId) {
    // Extract project UUID from path if present
    const uuidMatch = filePath.match(/docs\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
    let resolvedProjectId = projectId;
    if (uuidMatch) {
        // Verify this UUID is actually a project
        const { data: proj } = await supabase.from("projects").select("id").eq("id", uuidMatch[1]).single();
        if (proj) resolvedProjectId = proj.id;
    }

    // Try to match filename against module titles
    const filename = filePath.split("/").pop().replace(/\.[^.]+$/, ""); // Remove extension
    const normalized = filename.toLowerCase().replace(/[-_]/g, " ").trim();

    if (resolvedProjectId && normalized) {
        const { data: modules } = await supabase
            .from("modules")
            .select("id, title")
            .eq("project_id", resolvedProjectId);

        if (modules && modules.length > 0) {
            for (const mod of modules) {
                const modNormalized = mod.title.toLowerCase().replace(/[-_]/g, " ").trim();
                // Check if filename contains module title or vice versa
                if (normalized.includes(modNormalized) || modNormalized.includes(normalized)) {
                    return { projectId: resolvedProjectId, moduleId: mod.id };
                }
            }
        }
    }

    return { projectId: resolvedProjectId, moduleId: null };
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

            // Resolve which module this file belongs to
            const resolved = await resolveModuleFromPath(path, project.id);

            // Check if this file already exists for this project (avoid duplicates)
            const { data: existing } = await supabase
                .from("deliverable_files")
                .select("id")
                .eq("project_id", resolved.projectId)
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
                    checklist_label: resolved.moduleId ? `GitHub (auto-linked): ${path}` : `GitHub: ${path}`,
                    project_id: resolved.projectId,
                    module_id: resolved.moduleId,
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

// PUT — Manual sync: scan GitHub repo and sync all document files
export async function PUT(req) {
    try {
        const { project_id } = await req.json();
        if (!project_id) return NextResponse.json({ error: "project_id required" }, { status: 400 });

        // Get project with github_repo
        const { data: project, error: pErr } = await supabase
            .from("projects").select("id, title, github_repo").eq("id", project_id).single();
        if (pErr || !project?.github_repo) {
            return NextResponse.json({ error: "Project not found or no GitHub repo linked" }, { status: 400 });
        }

        const repo = project.github_repo; // e.g. "owner/repo"
        const token = process.env.GITHUB_TOKEN || "";

        // Fetch repo tree (recursive) via GitHub API
        const headers = { "Accept": "application/vnd.github.v3+json", "User-Agent": "Libe-AI-OS" };
        if (token) headers["Authorization"] = `token ${token}`;

        const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`, { headers });
        if (!treeRes.ok) {
            // Try 'master' branch
            const treeRes2 = await fetch(`https://api.github.com/repos/${repo}/git/trees/master?recursive=1`, { headers });
            if (!treeRes2.ok) {
                return NextResponse.json({ error: `GitHub API error: ${treeRes.status}` }, { status: 502 });
            }
            var treeData = await treeRes2.json();
            var branch = "master";
        } else {
            var treeData = await treeRes.json();
            var branch = "main";
        }

        // Filter document files
        const docFiles = (treeData.tree || []).filter(f =>
            f.type === "blob" && isDocumentFile(f.path)
        );

        if (docFiles.length === 0) {
            return NextResponse.json({ ok: true, message: "No document files found in repo", files_synced: 0 });
        }

        // Get existing synced files for this project
        const { data: existingFiles } = await supabase
            .from("deliverable_files").select("file_url").eq("project_id", project_id);
        const existingUrls = new Set((existingFiles || []).map(f => f.file_url));

        const mimeTypes = {
            pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            doc: "application/msword", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            xls: "application/vnd.ms-excel", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            csv: "text/csv", md: "text/markdown", txt: "text/plain",
            png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
        };

        const inserted = [];
        for (const file of docFiles) {
            const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${file.path}`;
            if (existingUrls.has(rawUrl)) continue; // Skip duplicate

            const filename = file.path.split("/").pop();
            const ext = filename.split(".").pop()?.toLowerCase();

            // Resolve module from path
            const resolved = await resolveModuleFromPath(file.path, project_id);

            const { data: record, error } = await supabase
                .from("deliverable_files")
                .insert({
                    filename,
                    file_url: rawUrl,
                    file_size: file.size || 0,
                    file_type: mimeTypes[ext] || "application/octet-stream",
                    checklist_label: resolved.moduleId ? `GitHub (auto-linked): ${file.path}` : `GitHub: ${file.path}`,
                    project_id: resolved.projectId,
                    module_id: resolved.moduleId,
                    deliverable_id: null,
                })
                .select()
                .single();

            if (!error && record) inserted.push(record);
        }

        return NextResponse.json({
            ok: true,
            project: project.title,
            repo,
            total_docs_in_repo: docFiles.length,
            files_synced: inserted.length,
            files: inserted.map(f => f.filename),
        });
    } catch (err) {
        console.error("GitHub sync error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
