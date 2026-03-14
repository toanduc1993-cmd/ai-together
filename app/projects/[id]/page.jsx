"use client";
import { useState, useEffect, use, useRef } from "react";
import { useUser } from "@/lib/UserContext";
import { ArrowLeft, Plus, Package, ChevronDown, ChevronRight, Upload, Paperclip, FileText, Download, X, Trash2, UserPlus, Github, Link as LinkIcon, Check, Copy } from "lucide-react";
import Link from "next/link";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import DiscussionThread from "@/components/DiscussionThread";
import AssignModuleModal from "@/components/AssignModuleModal";

/* ==================== ICON SIZES ==================== */
const ICO = { sm: 16, md: 20, lg: 24 };

const STATUS_CFG = {
    planned: { color: "var(--accent)", label: "Kế hoạch", icon: "📋" },
    in_progress: { color: "var(--amber)", label: "Đang thực hiện", icon: "🔨" },
    in_review: { color: "#8B5CF6", label: "Chờ duyệt", icon: "👀" },
    review: { color: "#8B5CF6", label: "Review", icon: "👀" },
    submitted: { color: "var(--blue)", label: "Đã nộp", icon: "📤" },
    approved: { color: "var(--green)", label: "Phê duyệt", icon: "✅" },
    changes_requested: { color: "var(--amber)", label: "Cần sửa", icon: "🔄" },
    rejected: { color: "var(--red)", label: "Từ chối", icon: "❌" },
    done: { color: "var(--green)", label: "Hoàn thành", icon: "🎉" },
};
const PRIORITY_CFG = {
    critical: { color: "var(--red)", label: "Critical" },
    high: { color: "var(--amber)", label: "High" },
    medium: { color: "var(--blue)", label: "Medium" },
    low: { color: "var(--text-muted)", label: "Low" },
};
const TASK_STATUS_CFG = {
    todo: { color: "var(--text-muted)", label: "Todo" },
    doing: { color: "var(--amber)", label: "Đang làm" },
    done: { color: "var(--green)", label: "Xong" },
    blocked: { color: "var(--red)", label: "Blocked" },
};

export default function ProjectDetailPage({ params }) {
    const { id } = use(params);
    const { currentUser, isProjectLead } = useUser();
    const [project, setProject] = useState(null);
    const [modules, setModules] = useState([]);
    const [epics, setEpics] = useState([]);
    const [expandedEpic, setExpandedEpic] = useState(null);
    const [showAddEpic, setShowAddEpic] = useState(false);
    const [showEditEpic, setShowEditEpic] = useState(null);
    const [showRetro, setShowRetro] = useState(null); // epic object
    const [retroForm, setRetroForm] = useState({ wins: '', improvements: '', lessons: '' });
    const [retroSaving, setRetroSaving] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'gantt'
    const [users, setUsers] = useState([]);
    const [expandedModule, setExpandedModule] = useState(null);
    const [checklists, setChecklists] = useState({});
    const [files, setFiles] = useState({});
    const [projectFiles, setProjectFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModule, setShowAddModule] = useState(false);
    const [showAddTask, setShowAddTask] = useState(null);
    const [showSubmit, setShowSubmit] = useState(null);
    const [showReview, setShowReview] = useState(null);
    const [form, setForm] = useState({});
    const [error, setError] = useState("");
    const [uploadingFiles, setUploadingFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [showDeadlinePicker, setShowDeadlinePicker] = useState(null);
    const [deadlineDate, setDeadlineDate] = useState("");
    const fileInputRef = useRef(null);
    const taskFileRef = useRef(null);
    const [editingObjective, setEditingObjective] = useState(false);
    const [objectiveText, setObjectiveText] = useState("");
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [reassigningModule, setReassigningModule] = useState(null);
    const [editingRepo, setEditingRepo] = useState(false);
    const [repoUrl, setRepoUrl] = useState("");
    const [repoSaving, setRepoSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [copiedRepo, setCopiedRepo] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [statusDropdownModule, setStatusDropdownModule] = useState(null);

    const handleReassign = async (moduleId, userIds) => {
        setReassigningModule(null);
        try {
            const res = await fetch("/api/modules", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: moduleId, assigned_to_ids: userIds }),
            });
            if (res.ok) {
                const mod = modules.find(m => m.id === moduleId);
                const names = userIds.map(uid => users.find(u => u.id === uid)?.display_name || "?").join(", ");
                fetch("/api/activities", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        action_type: "module_reassigned",
                        entity_type: "module",
                        entity_id: moduleId,
                        detail: `Giao "${mod?.title}" → ${names || "Chưa giao"}`,
                        project_id: id,
                    }),
                }).catch(() => { });
                reload();
            }
        } catch { }
    };

    // Per-project chairman check — use project.chairman_id, not just global role
    const isChairman = project?.chairman_id === currentUser?.id || project?.lead_id === currentUser?.id || currentUser?.role === "chairman";

    const reload = async () => {
        try {
            const [pRes, mRes, uRes, eRes] = await Promise.all([
                fetch(`/api/projects`).then(r => r.json()),
                fetch(`/api/modules?project_id=${id}`).then(r => r.json()),
                fetch("/api/users").then(r => r.json()),
                fetch(`/api/epics?project_id=${id}`).then(r => r.json())
            ]);
            setProject((Array.isArray(pRes) ? pRes : []).find(p => p.id === id) || null);
            setModules(Array.isArray(mRes) ? mRes : []);
            setUsers(Array.isArray(uRes) ? uRes : []);
            setEpics(Array.isArray(eRes) ? eRes : []);
            setLoading(false);
        } catch { setLoading(false); }
    };

    useEffect(() => { reload(); }, [id]);

    // Load project-level files
    const loadProjectFiles = async () => {
        const res = await fetch(`/api/files?project_id=${id}`);
        const data = await res.json();
        setProjectFiles(Array.isArray(data) ? data : []);
    };
    useEffect(() => { loadProjectFiles(); }, [id]);

    const loadChecklist = async (moduleId) => {
        const res = await fetch(`/api/checklist?module_id=${moduleId}`);
        const data = await res.json();
        setChecklists(prev => ({ ...prev, [moduleId]: Array.isArray(data) ? data : [] }));
    };

    const loadFiles = async (moduleId) => {
        const res = await fetch(`/api/files?module_id=${moduleId}`);
        const data = await res.json();
        setFiles(prev => ({ ...prev, [moduleId]: Array.isArray(data) ? data : [] }));
    };

    const toggleModule = (moduleId) => {
        if (expandedModule === moduleId) {
            setExpandedModule(null);
        } else {
            setExpandedModule(moduleId);
            if (!checklists[moduleId]) loadChecklist(moduleId);
            loadFiles(moduleId);
            // Scroll module into view after React re-renders the expanded content
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const el = document.getElementById(`module-${moduleId}`);
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        // Only scroll if the header is above the viewport
                        if (rect.top < 0 || rect.top > window.innerHeight * 0.5) {
                            window.scrollTo({ top: window.scrollY + rect.top - 80, behavior: "smooth" });
                        }
                    }
                }, 150);
            });
        }
    };

    
    const toggleEpic = (epicId) => {
        setExpandedEpic(expandedEpic === epicId ? null : epicId);
    };

    const addEpic = async () => {
        if (!form.epic_title?.trim()) { setError("Tên Epic bắt buộc"); return; }
        setError("");
        const res = await fetch("/api/epics", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, title: form.epic_title, description: form.epic_description, project_id: id, created_by: currentUser.id }),
        });
        if (!res.ok) { setError((await res.json()).error); return; }
        setShowAddEpic(false); setForm({}); reload();
    };

    const updateEpic = async (epicId) => {
        if (!form.epic_title?.trim()) { setError("Tên Epic bắt buộc"); return; }
        setError("");
        const res = await fetch("/api/epics", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: epicId, title: form.epic_title, description: form.epic_description }),
        });
        if (!res.ok) { setError((await res.json()).error); return; }
        setShowEditEpic(null); setForm({}); reload();
    };

    const deleteEpic = async (epicId, epicTitle) => {
        if (!confirm(`⚠️ Xóa Epic "${epicTitle}"? \nSẽ xóa luôn tất cả các Tasks (Modules) bên trong. Không thể hoàn tác!`)) return;
        try {
            const res = await fetch(`/api/epics?id=${epicId}`, { method: "DELETE" });
            if (res.ok) reload();
        } catch { }
    };

    const handleDeleteModule = async (moduleId, moduleTitle) => {
        if (!confirm(`⚠️ Xóa module "${moduleTitle}"?\n\nSẽ xóa luôn tất cả checklist và deliverables liên quan. Không thể hoàn tác!`)) return;
        try {
            const res = await fetch(`/api/modules?id=${moduleId}`, { method: "DELETE" });
            if (res.ok) reload();
        } catch { }
    };

    const addModule = async () => {
        if (!form.title?.trim()) { setError("Tên module bắt buộc"); return; }
        setError("");
        const res = await fetch("/api/modules", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, project_id: id, created_by: currentUser.id, epic_id: form.epic_id, labels: form.labels || [] }),
        });
        if (!res.ok) { setError((await res.json()).error); return; }
        const newModule = await res.json();

        // Auto-create 3 default checklists
        const defaults = ["Change Log", "TASK_REGISTRY", "Source Code"];
        for (const title of defaults) {
            await fetch("/api/checklist", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, module_id: newModule.id, assigned_by: currentUser.id, project_id: id }),
            });
        }

        // Notify assigned users about new module
        const assignedIds = form.assigned_to_ids || [];
        for (const uid of assignedIds) {
            if (uid && uid !== currentUser.id) {
                await fetch("/api/notifications", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: uid,
                        type: "module_assigned",
                        title: `Bạn được giao module "${form.title}" trong dự án ${project?.title || ""}`,
                        body: `${currentUser.display_name} đã giao cho bạn một module mới. Vui lòng kiểm tra tại "Công việc của tôi".`,
                        entity_type: "module", entity_id: id,
                    }),
                });
            }
        }
        setShowAddModule(false); setForm({}); reload();
    };

    const addTask = async () => {
        if (!form.title?.trim()) { setError("Tên checklist bắt buộc"); return; }
        setError("");
        const res = await fetch("/api/checklist", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: form.title, module_id: showAddTask, assigned_by: currentUser.id, project_id: id }),
        });
        if (!res.ok) { setError((await res.json()).error); return; }
        const modId = showAddTask;
        setShowAddTask(null); setForm({}); loadChecklist(modId);
    };

    const updateTaskStatus = async (itemId, status, moduleId) => {
        await fetch("/api/checklist", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: itemId, status, user_id: currentUser.id, project_id: id }),
        });
        loadChecklist(moduleId); reload();
    };

    const updateTaskComment = async (itemId, comment, moduleId) => {
        await fetch("/api/checklist", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: itemId, description: comment, user_id: currentUser.id, project_id: id }),
        });
        loadChecklist(moduleId);
    };

    const updateModuleStatus = async (moduleId, status, extraData = {}) => {
        await fetch("/api/modules", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: moduleId, status, review_comment: extraData.review_comment || null, ...extraData, user_id: currentUser.id, project_id: id }),
        });
        const mod = modules.find(m => m.id === moduleId);
        const STATUS_LABELS = { planned: "Kế hoạch", in_progress: "Đang thực hiện", in_review: "Chờ duyệt", done: "Hoàn thành", approved: "Phê duyệt", changes_requested: "Yêu cầu sửa" };

        // If assigned user marks complete → notify chairman
        if (status === "in_review" && project?.chairman_id) {
            await fetch("/api/notifications", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: project.chairman_id,
                    type: "module_status_changed",
                    title: `Module "${mod?.title}" cần review`,
                    body: `${currentUser.display_name} đã hoàn thành và chờ bạn duyệt.`,
                    entity_type: "module", entity_id: moduleId,
                }),
            });
        }
        // If chairman takes action → notify assigned user with comment
        if (mod?.assigned_to && mod.assigned_to !== currentUser.id) {
            await fetch("/api/notifications", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: mod.assigned_to,
                    type: "module_status_changed",
                    title: `Module "${mod?.title}" → ${STATUS_LABELS[status] || status}`,
                    body: extraData.review_comment ? `Nhận xét: ${extraData.review_comment}` : `${currentUser.display_name} đã chuyển trạng thái module của bạn.`,
                    entity_type: "module", entity_id: moduleId,
                }),
            });
        }
        reload();
    };

    // Upload files for a module
    const uploadFiles = async (moduleId, fileList) => {
        setUploading(true);
        for (const file of fileList) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("module_id", moduleId);
            fd.append("uploaded_by", currentUser.id);
            fd.append("label", "Module attachment");
            await fetch("/api/files", { method: "POST", body: fd });
        }
        setUploading(false);
        loadFiles(moduleId);
    };

    // Upload file for checklist item — auto-marks as done
    const uploadTaskFile = async (checklistItemId, moduleId, fileList) => {
        setUploading(true);
        for (const file of fileList) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("module_id", moduleId);
            fd.append("checklist_item_id", checklistItemId);
            fd.append("uploaded_by", currentUser.id);
            fd.append("label", "Task attachment");
            await fetch("/api/files", { method: "POST", body: fd });
        }
        // Auto-mark checklist item as done after upload
        await updateTaskStatus(checklistItemId, "done", moduleId);
        setUploading(false);
        loadFiles(moduleId);
    };

    // Submit deliverable with attached files
    const submitDeliverable = async (moduleId) => {
        setUploading(true);
        const chairman = users.find(u => u.role === "chairman");
        const res = await fetch("/api/deliverables", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ module_id: moduleId, submitted_by: currentUser.id, demo_link: form.demo_link || "", notes: form.notes || "", project_id: id, chairman_id: chairman?.id }),
        });
        if (!res.ok) { setError((await res.json()).error); setUploading(false); return; }
        const deliverable = await res.json();

        // Upload attached files
        if (uploadingFiles.length > 0) {
            for (const file of uploadingFiles) {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("module_id", moduleId);
                fd.append("deliverable_id", deliverable.id);
                fd.append("uploaded_by", currentUser.id);
                fd.append("label", "Deliverable attachment");
                await fetch("/api/files", { method: "POST", body: fd });
            }
        }
        setUploading(false);
        setShowSubmit(null); setForm({}); setUploadingFiles([]); reload();
    };

    const reviewDeliverable = async (deliverableId) => {
        const res = await fetch("/api/reviews", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deliverable_id: deliverableId, reviewer_id: currentUser.id, decision: form.decision, comment: form.comment || "", project_id: id }),
        });
        if (!res.ok) { setError((await res.json()).error); return; }
        setShowReview(null); setForm({}); reload();
    };

    const deleteFile = async (fileId, moduleId) => {
        await fetch(`/api/files?id=${fileId}`, { method: "DELETE" });
        if (moduleId) loadFiles(moduleId);
        else loadProjectFiles();
    };

    // Upload project-level files (chairman only)
    const uploadProjectFiles = async (fileList) => {
        setUploading(true);
        for (const file of fileList) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("project_id", id);
            fd.append("uploaded_by", currentUser.id);
            fd.append("label", "Project document");
            await fetch("/api/files", { method: "POST", body: fd });
        }
        setUploading(false);
        loadProjectFiles();
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const getFileIcon = (type) => {
        if (!type) return "📄";
        if (type.startsWith("image/")) return "🖼️";
        if (type.includes("pdf")) return "📕";
        if (type.includes("word") || type.includes("document")) return "📘";
        if (type.includes("sheet") || type.includes("excel")) return "📗";
        if (type.includes("zip") || type.includes("rar")) return "📦";
        if (type.includes("video")) return "🎬";
        return "📄";
    };

    if (loading) return <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Đang tải...</div>;
    if (!project) return <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Project không tìm thấy</div>;

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Link href="/projects" style={{ color: "var(--text-tertiary)", display: "flex" }}><ArrowLeft size={ICO.md} /></Link>
                <div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>{project.title}</h2>
                    <div style={{ display: "flex", gap: 14, fontSize: 14, color: "var(--text-muted)", marginTop: 5 }}>
                        <span>Lead: <strong style={{ color: "var(--text-primary)" }}>{project.lead?.display_name || "—"}</strong></span>
                        <span>Chairman: <strong style={{ color: "var(--text-primary)" }}>{project.chairman?.display_name || "—"}</strong></span>
                        {project.deadline && <span>📅 <strong style={{ color: "var(--text-primary)" }}>{new Date(project.deadline).toLocaleDateString("vi-VN")}</strong></span>}
                    </div>
                </div>
            </div>
            {project.description && <p style={{ color: "var(--text-tertiary)", fontSize: 15, marginBottom: 18, lineHeight: 1.6 }}>{project.description}</p>}

            {/* ===== PROJECT OBJECTIVE ===== */}
            <div className="glass-card" style={{ padding: "18px 22px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                        🎯 Mục tiêu dự án
                    </h3>
                    {isChairman && (
                        editingObjective ? (
                            <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={async () => {
                                    await fetch("/api/projects", {
                                        method: "PUT", headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ id, description: objectiveText }),
                                    });
                                    setEditingObjective(false);
                                    reload();
                                }} className="btn-primary" style={{ padding: "6px 16px", fontSize: 13 }}>
                                    💾 Lưu
                                </button>
                                <button onClick={() => { setEditingObjective(false); setObjectiveText(project.description || ""); }}
                                    className="btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }}>
                                    Hủy
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => { setEditingObjective(true); setObjectiveText(project.description || ""); }}
                                className="btn-ghost" style={{ padding: "6px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                                ✏️ Chỉnh sửa
                            </button>
                        )
                    )}
                </div>
                {editingObjective ? (
                    <textarea
                        value={objectiveText}
                        onChange={(e) => setObjectiveText(e.target.value)}
                        placeholder="Nhập mục tiêu tổng thể của dự án..."
                        className="input-field"
                        rows={4}
                        style={{ width: "100%", fontSize: 14, resize: "vertical", minHeight: 80, lineHeight: 1.6 }}
                    />
                ) : (
                    <div style={{ fontSize: 14, color: project.description ? "var(--text-secondary)" : "var(--text-muted)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                        {project.description || "Chưa có mục tiêu. Chủ tịch có thể nhấn \"Chỉnh sửa\" để thêm."}
                    </div>
                )}
            </div>

            {/* ===== GITHUB REPO LINK SECTION (All users can add/copy) ===== */}
            <div className="glass-card" style={{ padding: "14px 22px", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Github size={18} color="var(--text-secondary)" />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>GitHub Repo</span>
                        {project?.github_repo && !editingRepo && (
                            <a href={`https://github.com/${project.github_repo}`} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 12, padding: "2px 10px", borderRadius: 8, background: "var(--green-bg)", color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>
                                ✓ {project.github_repo}
                            </a>
                        )}
                    </div>
                    {!editingRepo ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {/* Copy link button */}
                            {project?.github_repo && (
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`https://github.com/${project.github_repo}`);
                                        setCopiedRepo(true);
                                        setTimeout(() => setCopiedRepo(false), 2000);
                                    }}
                                    className="btn-ghost"
                                    style={{ fontSize: 12, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4, color: copiedRepo ? "var(--green)" : undefined }}
                                >
                                    {copiedRepo ? <><Check size={13} /> Đã sao chép!</> : <><Copy size={13} /> Sao chép link</>}
                                </button>
                            )}
                            {/* Edit repo button — any user */}
                            <button
                                onClick={() => { setEditingRepo(true); setRepoUrl(project?.github_repo || ""); }}
                                className="btn-ghost"
                                style={{ fontSize: 12, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4 }}
                            >
                                <LinkIcon size={13} /> {project?.github_repo ? "Đổi repo" : "Gắn repo"}
                            </button>
                            {/* Sync button — chairman only */}
                            {isChairman && project?.github_repo && (
                                <button
                                    disabled={syncing}
                                    onClick={async () => {
                                        setSyncing(true); setSyncResult(null);
                                        try {
                                            const res = await fetch("/api/webhooks/github", {
                                                method: "PUT",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ project_id: project.id }),
                                            });
                                            const data = await res.json();
                                            setSyncResult(data);
                                            if (data.files_synced > 0) reload();
                                        } catch { setSyncResult({ error: "Sync failed" }); }
                                        setSyncing(false);
                                    }}
                                    className="btn-primary"
                                    style={{ fontSize: 12, padding: "4px 14px", display: "flex", alignItems: "center", gap: 4 }}
                                >
                                    {syncing ? "⏳ Đang sync..." : "🔄 Sync từ GitHub"}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input
                                value={repoUrl}
                                onChange={e => setRepoUrl(e.target.value)}
                                placeholder="owner/repo (VD: toanduc1993-cmd/ai-together)"
                                style={{
                                    padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border-primary)",
                                    background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: 13,
                                    width: 320, outline: "none",
                                }}
                                autoFocus
                            />
                            <button
                                disabled={repoSaving}
                                onClick={async () => {
                                    setRepoSaving(true);
                                    try {
                                        await fetch("/api/projects", {
                                            method: "PUT",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ id: project.id, github_repo: repoUrl.trim() || null }),
                                        });
                                        reload();
                                    } catch { }
                                    setRepoSaving(false);
                                    setEditingRepo(false);
                                }}
                                className="btn-primary"
                                style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                            >
                                <Check size={13} /> Lưu
                            </button>
                            <button onClick={() => setEditingRepo(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>
                {editingRepo && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                        💡 Nhập dạng <strong>owner/repo</strong> (VD: toanduc1993-cmd/ai-together).<br />
                        {isChairman && <>Sau khi lưu, có thể vào GitHub repo → Settings → Webhooks → Add webhook để tự động sync tài liệu.</>}
                    </div>
                )}
                {syncResult && (
                    <div style={{ marginTop: 8, fontSize: 12, padding: "8px 12px", borderRadius: 8, background: syncResult.error ? "rgba(239,68,68,0.1)" : "var(--green-bg)", color: syncResult.error ? "#EF4444" : "var(--green)" }}>
                        {syncResult.error ? `❌ ${syncResult.error}` : `✅ Đã sync ${syncResult.files_synced} file mới (tổng ${syncResult.total_docs_in_repo} tài liệu trong repo)`}
                        {syncResult.files?.length > 0 && <span style={{ marginLeft: 8, fontWeight: 600 }}>{syncResult.files.join(", ")}</span>}
                    </div>
                )}
            </div>

            {/* ===== PROJECT DOCUMENTS SECTION ===== */}
            <div className="glass-card" style={{ padding: "18px 22px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                        <Paperclip size={ICO.md} color="var(--accent)" /> Tài liệu dự án ({projectFiles.length})
                    </h3>
                    {isChairman && (
                        <button onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file"; input.multiple = true;
                            input.onchange = (ev) => { if (ev.target.files.length) uploadProjectFiles(ev.target.files); };
                            input.click();
                        }} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", fontSize: 13 }}>
                            <Upload size={ICO.sm} /> Thêm tài liệu
                        </button>
                    )}
                </div>
                {uploading && <div style={{ fontSize: 14, color: "var(--accent)", marginBottom: 10, animation: "pulse-soft 1s infinite" }}>⏳ Đang upload...</div>}
                {projectFiles.length === 0 ? (
                    <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "16px 0", textAlign: "center" }}>
                        Chưa có tài liệu dự án. {isChairman && 'Nhấn "Thêm tài liệu" để upload.'}
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                        {projectFiles.map(f => (
                            <div key={f.id} style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                                borderRadius: "var(--radius-sm)", border: "1px solid var(--border-primary)",
                                background: "var(--bg-secondary)", fontSize: 14,
                            }}>
                                <span style={{ fontSize: 24, flexShrink: 0 }}>{getFileIcon(f.file_type)}</span>
                                <div style={{ flex: 1, overflow: "hidden" }}>
                                    <div style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.filename}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                        {formatFileSize(f.file_size)}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                    {f.file_url && f.file_url.startsWith("http") && (
                                        <a href={f.file_url} target="_blank" rel="noopener noreferrer" download
                                            style={{ background: "var(--green-bg)", color: "var(--green)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex" }}>
                                            <Download size={ICO.sm} />
                                        </a>
                                    )}
                                    {isChairman && (
                                        <button onClick={() => deleteFile(f.id, null)}
                                            style={{ background: "var(--red-bg)", color: "var(--red)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex" }}>
                                            <Trash2 size={ICO.sm} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Epics & Modules toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                    <Package size={ICO.md} color="var(--accent)" /> Epics & Tasks ({epics.length} Epics, {modules.length} Tasks)
                </h3>
                <div style={{ display: "flex", gap: 8 }}>
                    {/* Feature #2: List / Gantt toggle */}
                    <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border-primary)", background: "var(--bg-secondary)" }}>
                        {['list', 'gantt'].map(m => (
                            <button key={m} onClick={() => setViewMode(m)} style={{
                                padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
                                background: viewMode === m ? "var(--accent)" : "transparent",
                                color: viewMode === m ? "#fff" : "var(--text-muted)",
                                transition: "all 0.2s",
                            }}>{m === 'list' ? '📋 List' : '📅 Timeline'}</button>
                        ))}
                    </div>
                    <button onClick={() => setShowAssignModal(true)} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13 }}>
                        <UserPlus size={ICO.sm} /> Giao Task
                    </button>
                    {isChairman && (
                        <>
                            <button onClick={() => { setForm({}); setShowAddEpic(true); setError(""); }} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13 }}>
                                <Plus size={ICO.sm} /> Thêm Epic
                            </button>
                            <button onClick={() => { setForm({}); setShowAddModule(true); setError(""); }} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", fontSize: 14 }}>
                                <Plus size={ICO.sm} /> Thêm Task
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Feature #3 — Overdue Banner */}
            {(() => {
                const now = new Date();
                const overdueTasks = modules.filter(m => m.deadline && new Date(m.deadline) < now && m.status !== "done" && m.status !== "approved");
                if (overdueTasks.length === 0) return null;
                return (
                    <div style={{
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: 12, padding: "12px 18px", marginBottom: 18,
                        display: "flex", alignItems: "center", gap: 12,
                    }}>
                        <span style={{ fontSize: 20 }}>🔴</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#EF4444" }}>Có {overdueTasks.length} Task đã quá hạn!</div>
                            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Kiểm tra và cập nhật deadline hoặc trạng thái cho các task quá hạn bên dưới.</div>
                        </div>
                    </div>
                );
            })()}

            {/* Feature #2 — Gantt/Timeline View */}
            {viewMode === 'gantt' && (() => {
                const today = new Date(); today.setHours(0,0,0,0);
                const rangeStart = new Date(today); rangeStart.setDate(today.getDate() - 3);
                const rangeEnd = new Date(today); rangeEnd.setDate(today.getDate() + 27);
                const totalDays = 30;
                const STATUS_COLOR = { planned: '#6366F1', in_progress: '#F59E0B', in_review: '#8B5CF6', approved: '#10B981', done: '#10B981', changes_requested: '#EF4444' };
                const STATUS_LABEL = { planned: '📋', in_progress: '🔨', in_review: '👀', approved: '✅', done: '✅', changes_requested: '🔄' };
                const modsWithDeadline = modules.filter(m => m.deadline);
                const modsWithout = modules.filter(m => !m.deadline);
                const dayLabels = [];
                for (let i = 0; i < totalDays; i += 3) {
                    const d = new Date(rangeStart); d.setDate(d.getDate() + i);
                    dayLabels.push({ label: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), pct: (i / totalDays) * 100 });
                }
                const todayPct = Math.max(0, Math.min(100, ((today - rangeStart) / (rangeEnd - rangeStart)) * 100));
                const renderBar = (mod) => {
                    const start = mod.created_at ? new Date(mod.created_at) : today;
                    const end = new Date(mod.deadline);
                    const barStart = Math.max(0, ((start - rangeStart) / (rangeEnd - rangeStart)) * 100);
                    const barEnd = Math.min(100, ((end - rangeStart) / (rangeEnd - rangeStart)) * 100);
                    const barWidth = Math.max(barEnd - barStart, 1.5);
                    const isOverdue = end < today && mod.status !== 'done' && mod.status !== 'approved';
                    const color = isOverdue ? '#EF4444' : (STATUS_COLOR[mod.status] || '#6366F1');
                    return (
                        <div key={mod.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 6, minHeight: 32 }}>
                            <div style={{ width: 200, flexShrink: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {STATUS_LABEL[mod.status] || '📋'} {mod.title}
                            </div>
                            <div style={{ flex: 1, position: 'relative', height: 28, background: 'var(--bg-tertiary)', borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', left: `${barStart}%`, width: `${barWidth}%`, height: '100%', background: color, borderRadius: 6, opacity: 0.85, display: 'flex', alignItems: 'center', paddingLeft: 6, transition: 'all 0.4s' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isOverdue ? '⚠️ Quá hạn' : `${mod.progress_pct || 0}%`}</span>
                                </div>
                                <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: 2, background: 'rgba(239,68,68,0.7)', zIndex: 2 }} />
                            </div>
                            <div style={{ width: 70, flexShrink: 0, fontSize: 11, color: 'var(--text-muted)', paddingLeft: 8, whiteSpace: 'nowrap' }}>{new Date(mod.deadline).toLocaleDateString('vi-VN')}</div>
                        </div>
                    );
                };
                return (
                    <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>📅 Timeline ({modsWithDeadline.length} Tasks có deadline)</div>
                        <div style={{ display: 'flex', marginLeft: 200, marginBottom: 8, position: 'relative', height: 20 }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                {dayLabels.map((d, i) => (
                                    <span key={i} style={{ position: 'absolute', left: `${d.pct}%`, fontSize: 10, color: 'var(--text-muted)', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>{d.label}</span>
                                ))}
                            </div>
                            <div style={{ width: 70 }} />
                        </div>
                        {modsWithDeadline.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: 14 }}>Chưa có Task nào có Deadline. Thêm Deadline cho Task để xem biểu đồ.</div>
                        ) : (
                            <>
                                {modsWithDeadline.map(renderBar)}
                                {modsWithout.length > 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>{modsWithout.length} Task chưa có deadline (ẩn trong Timeline)</div>}
                            </>
                        )}
                        <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            {[['Kế hoạch','#6366F1'],['Đang làm','#F59E0B'],['Chờ duyệt','#8B5CF6'],['Hoàn thành','#10B981'],['Quá hạn','#EF4444']].map(([lbl,clr]) => (
                                <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: clr }} />{lbl}</span>
                            ))}
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 2, height: 10, background: '#EF4444' }} />Hôm nay</span>
                        </div>
                    </div>
                );
            })()}

            {/* Epics list — non-chairman only sees assigned Tasks inside Epics */}
            {viewMode === 'list' && (() => {
                if (epics.length === 0) {
                    return (
                        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)", fontSize: 15, background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)" }}>
                            {isChairman ? 'Chưa có Epic nào. Nhấn "Thêm Epic" để bắt đầu!' : "Dự án hiện chưa có cấu trúc phân việc nào."}
                        </div>
                    );
                }

                // Sort epics by creation time
                const sortedEpics = [...epics].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                const now = new Date();

                return sortedEpics.map(epic => {
                    // Epics without an ID match Uncategorized modules if epic_id is null
                    const epicModules = modules.filter(m => m.epic_id === epic.id || (epic.title.includes("Chưa phân loại") && !m.epic_id));
                    
                    // Feature #3: Sort overdue tasks to top
                    const sortedEpicModules = [...epicModules].sort((a, b) => {
                        const aOverdue = a.deadline && new Date(a.deadline) < now && a.status !== "done";
                        const bOverdue = b.deadline && new Date(b.deadline) < now && b.status !== "done";
                        return (bOverdue ? 1 : 0) - (aOverdue ? 1 : 0);
                    });

                    // Filter down to visible modules for current user
                    const visibleModulesInEpic = isChairman ? sortedEpicModules : sortedEpicModules.filter(m => m.assigned_to === currentUser?.id || (m.assignees || []).some(a => a.id === currentUser?.id));
                    
                    // Feature #1: Epic progress
                    const epicDoneTasks = epicModules.filter(m => m.status === "done" || m.status === "approved").length;
                    const epicTotalTasks = epicModules.length;
                    const epicProgress = epicTotalTasks > 0 ? Math.round((epicDoneTasks / epicTotalTasks) * 100) : 0;
                    const epicHasOverdue = epicModules.some(m => m.deadline && new Date(m.deadline) < now && m.status !== "done" && m.status !== "approved");
                    const epicStatusColor = epicHasOverdue ? "#EF4444" : epicProgress === 100 ? "#10B981" : epicProgress > 0 ? "#F59E0B" : "var(--accent)";
                    const epicStatusLabel = epicProgress === 100 ? "✅ Hoàn thành" : epicProgress > 0 ? "🔨 Đang làm" : "📋 Kế hoạch";

                    // Always show expanded if there's only 1 default Epic and it has items, otherwise respect state
                    const isEpicExpanded = expandedEpic === epic.id || (epics.length === 1 && visibleModulesInEpic.length > 0);

                    return (
                        <div key={epic.id} className="glass-card" style={{ marginBottom: 16, overflow: "hidden", border: epicHasOverdue ? "1px solid rgba(239,68,68,0.4)" : isEpicExpanded ? "1px solid var(--border-active)" : "1px solid var(--border-primary)" }}>
                            {/* Feature #1: Epic top progress strip */}
                            {epicTotalTasks > 0 && (
                                <div style={{ height: 3, background: "var(--bg-tertiary)" }}>
                                    <div style={{ height: "100%", width: `${epicProgress}%`, background: epicStatusColor, transition: "width 0.4s ease", borderRadius: 2 }} />
                                </div>
                            )}
                            {/* Epic Header */}
                            <div onClick={() => toggleEpic(epic.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", cursor: "pointer", background: isEpicExpanded ? "var(--bg-secondary)" : "transparent" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                                    {isEpicExpanded ? <ChevronDown size={ICO.md} color="var(--accent)" /> : <ChevronRight size={ICO.md} color="var(--text-muted)" />}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                            {epic.title}
                                            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: 12 }}>{epicModules.length} Tasks</span>
                                            {epicHasOverdue && <span style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 12 }}>⚠️ Quá hạn</span>}
                                        </h4>
                                        {/* Feature #1: Epic progress bar + status */}
                                        {epicTotalTasks > 0 && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                                <div style={{ width: 120, height: 5, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                                                    <div style={{ height: "100%", width: `${epicProgress}%`, background: epicStatusColor, borderRadius: 3, transition: "width 0.4s ease" }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: epicStatusColor }}>{epicProgress}%</span>
                                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{epicDoneTasks}/{epicTotalTasks} xong</span>
                                                <span style={{ fontSize: 11, color: epicStatusColor, fontWeight: 600 }}>{epicStatusLabel}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {isChairman && !epic.title.includes("Chưa phân loại") && (
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button onClick={(e) => { e.stopPropagation(); setForm({ epic_title: epic.title, epic_description: epic.description }); setShowEditEpic(epic.id); }} className="btn-ghost" style={{ padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>✏️ Sửa</button>
                                        {epicProgress === 100 && (
                                            <button onClick={(e) => { e.stopPropagation(); setRetroForm({ wins: '', improvements: '', lessons: '' }); setShowRetro(epic); }} className="btn-ghost" style={{ padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4, color: "#10B981", background: "rgba(16,185,129,0.1)" }}>🌟 Tổng kết</button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); deleteEpic(epic.id, epic.title); }} className="btn-ghost" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>🗑️ Xóa</button>
                                    </div>
                                )}
                            </div>

                            {/* Epic Content */}
                            {isEpicExpanded && (
                                <div style={{ padding: "16px 18px 16px 42px", borderTop: "1px solid var(--border-primary)" }}>
                                    {epic.description && <p style={{ color: "var(--text-tertiary)", fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 }}>{epic.description}</p>}
                                    
                                    {visibleModulesInEpic.length === 0 ? (
                                        <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 14, textAlign: "center", background: "var(--bg-tertiary)", borderRadius: 8 }}>
                                            {isChairman ? "Epic này chưa có Task nào." : "Bạn không có Task nào trong Epic này."}
                                        </div>
                                    ) : (
                                        visibleModulesInEpic.map(mod => {
                                            const sc = STATUS_CFG[mod.status] || STATUS_CFG.planned;
                                            const pc = PRIORITY_CFG[mod.priority] || PRIORITY_CFG.medium;
                                            const isExpanded = expandedModule === mod.id;
                                            const items = checklists[mod.id] || [];
                                            const moduleFiles = files[mod.id] || [];
                                            const moduleAssignees = mod.assignees || (mod.assignee ? [mod.assignee] : []);
                                            const isOwner = currentUser?.id === mod.assigned_to || moduleAssignees.some(a => a.id === currentUser?.id);
                                            const canStart = isOwner && mod.status === "planned";
                                            const canComplete = isOwner && (mod.status === "in_progress" || mod.status === "changes_requested");
                                            const canReview = isChairman && mod.status === "in_review";

                                            // Feature #3: Check if this task is overdue
                                            const isTaskOverdue = mod.deadline && new Date(mod.deadline) < now && mod.status !== "done" && mod.status !== "approved";
                                            return (
                                                <div key={mod.id} id={`module-${mod.id}`} style={{ marginBottom: 8, overflow: "hidden", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: isTaskOverdue ? "1px solid rgba(239,68,68,0.5)" : isExpanded ? "1px solid var(--border-active)" : "1px solid var(--border-primary)" }}>
                            {/* Module header */}
                            <div onClick={() => toggleModule(mod.id)} style={{ display: "flex", alignItems: "center", padding: "14px 18px", cursor: "pointer", gap: 12 }}>
                                {isExpanded ? <ChevronDown size={ICO.md} color="var(--accent)" /> : <ChevronRight size={ICO.md} color="var(--text-muted)" />}
                                <span style={{ fontSize: 22, flexShrink: 0 }}>{sc.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{mod.title}</div>
                                    <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                                        {/* Status badge — clickable dropdown for authorized users */}
                                        {(() => {
                                            const ownerTransitions = {
                                                planned: ["in_progress"],
                                                in_progress: ["in_review"],
                                                changes_requested: ["in_progress", "in_review"],
                                            };
                                            const chairmanTransitions = {
                                                planned: ["in_progress"],
                                                in_progress: ["in_review"],
                                                in_review: ["approved", "changes_requested", "done"],
                                                approved: ["done"],
                                                changes_requested: ["in_progress", "in_review"],
                                                done: [],
                                            };
                                            const transitions = isChairman
                                                ? (chairmanTransitions[mod.status] || [])
                                                : isOwner
                                                    ? (ownerTransitions[mod.status] || [])
                                                    : [];
                                            const showDropdown = statusDropdownModule === mod.id;
                                            return (
                                                <span
                                                    onClick={(e) => {
                                                        if (transitions.length === 0) return;
                                                        e.stopPropagation();
                                                        setStatusDropdownModule(showDropdown ? null : mod.id);
                                                    }}
                                                    style={{
                                                        fontSize: 12, fontWeight: 600, color: sc.color,
                                                        background: `${sc.color}12`, padding: "2px 10px", borderRadius: 8,
                                                        cursor: transitions.length > 0 ? "pointer" : "default",
                                                        position: "relative", userSelect: "none",
                                                    }}
                                                >
                                                    {sc.label} {transitions.length > 0 && "▾"}
                                                    {showDropdown && transitions.length > 0 && (
                                                        <div onClick={(e) => e.stopPropagation()} style={{
                                                            position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 100,
                                                            background: "var(--bg-elevated)", border: "1px solid var(--border-primary)",
                                                            borderRadius: 10, boxShadow: "var(--shadow-xl)", minWidth: 180, overflow: "hidden",
                                                        }}>
                                                            <div style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", borderBottom: "1px solid var(--border-primary)" }}>Chuyển trạng thái:</div>
                                                            {transitions.map(s => {
                                                                const cfg = STATUS_CFG[s] || { color: "var(--text-muted)", label: s, icon: "📋" };
                                                                return (
                                                                    <div
                                                                        key={s}
                                                                        onClick={async () => {
                                                                            setStatusDropdownModule(null);
                                                                            if (s === "changes_requested" && isChairman) {
                                                                                setForm({}); setShowReview(mod.id); setError("");
                                                                            } else {
                                                                                await updateModuleStatus(mod.id, s);
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            padding: "8px 14px", fontSize: 13, cursor: "pointer",
                                                                            display: "flex", alignItems: "center", gap: 8,
                                                                            color: cfg.color, borderBottom: "1px solid var(--border-primary)",
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                                                    >
                                                                        <span>{cfg.icon}</span> {cfg.label}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </span>
                                            );
                                        })()}
                                        <span style={{ fontSize: 12, fontWeight: 600, color: pc.color, background: `${pc.color}12`, padding: "2px 10px", borderRadius: 8 }}>{pc.label}</span>
                                        {/* Feature #5: Labels/Tags */}
                                        {(mod.labels || []).map((lbl, li) => {
                                            const labelColors = ["#6366F1", "#10B981", "#F59E0B", "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#06B6D4"];
                                            const lc = labelColors[li % labelColors.length];
                                            return (
                                                <span key={li} style={{ fontSize: 11, fontWeight: 700, color: lc, background: `${lc}18`, padding: "1px 8px", borderRadius: 8, letterSpacing: 0.2 }}>{lbl}</span>
                                            );
                                        })}
                                        {/* Assignees — multi-avatar display */}
                                        {isChairman ? (
                                            <span
                                                onClick={(e) => { e.stopPropagation(); setReassigningModule(reassigningModule === mod.id ? null : mod.id); }}
                                                style={{ fontSize: 13, color: "var(--accent)", cursor: "pointer", position: "relative", padding: "2px 10px", borderRadius: 8, background: "var(--accent-bg)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                                            >
                                                {moduleAssignees.length > 0 ? (
                                                    <>{moduleAssignees.map((a, i) => <span key={a.id} title={a.display_name} style={{ fontSize: 15 }}>{a.avatar || "👤"}</span>)} <span style={{ fontSize: 12 }}>{moduleAssignees.length > 1 ? `${moduleAssignees.length} người` : moduleAssignees[0]?.display_name}</span></>
                                                ) : "Chưa giao"} ✏️
                                                {reassigningModule === mod.id && (
                                                    <div onClick={(e) => e.stopPropagation()} style={{
                                                        position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 100,
                                                        background: "var(--bg-elevated)", border: "1px solid var(--border-primary)",
                                                        borderRadius: 10, boxShadow: "var(--shadow-xl)", minWidth: 240, overflow: "hidden",
                                                    }}>
                                                        <div style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", borderBottom: "1px solid var(--border-primary)" }}>Chọn nhân sự (nhiều người):</div>
                                                        {users.map(u => {
                                                            const isSelected = moduleAssignees.some(a => a.id === u.id);
                                                            return (
                                                                <div
                                                                    key={u.id}
                                                                    onClick={() => {
                                                                        const currentIds = moduleAssignees.map(a => a.id);
                                                                        const newIds = isSelected ? currentIds.filter(id2 => id2 !== u.id) : [...currentIds, u.id];
                                                                        handleReassign(mod.id, newIds);
                                                                    }}
                                                                    style={{
                                                                        padding: "8px 14px", fontSize: 13, cursor: "pointer",
                                                                        display: "flex", alignItems: "center", gap: 8,
                                                                        color: isSelected ? "var(--accent)" : "var(--text-primary)",
                                                                        fontWeight: isSelected ? 700 : 400,
                                                                        borderBottom: "1px solid var(--border-primary)",
                                                                        background: isSelected ? "var(--accent-bg)" : "transparent",
                                                                    }}
                                                                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                                                                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                                                                >
                                                                    <span style={{ width: 18, height: 18, borderRadius: 4, border: isSelected ? "2px solid var(--accent)" : "2px solid var(--border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, background: isSelected ? "var(--accent)" : "transparent", color: "#fff" }}>{isSelected ? "✓" : ""}</span>
                                                                    {u.avatar} {u.display_name}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </span>
                                        ) : (
                                            moduleAssignees.length > 0 && <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>👤 {moduleAssignees.map(a => a.display_name).join(", ")}</span>
                                        )}
                                        {mod.deadline && (
                                            <span style={{ fontSize: 13, color: isTaskOverdue ? "#EF4444" : "var(--text-muted)", fontWeight: isTaskOverdue ? 700 : 400, display: "flex", alignItems: "center", gap: 3 }}>
                                                {isTaskOverdue ? "🔴" : "📅"} {new Date(mod.deadline).toLocaleDateString("vi-VN")}
                                                {isTaskOverdue && <span style={{ fontSize: 11, background: "rgba(239,68,68,0.1)", color: "#EF4444", padding: "1px 6px", borderRadius: 6, fontWeight: 700 }}>Quá hạn!</span>}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 80, display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ flex: 1, height: 6, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${mod.progress_pct}%`, background: mod.progress_pct === 100 ? "var(--green)" : "var(--accent)", borderRadius: 3, transition: "width 0.3s" }} />
                                        </div>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{mod.progress_pct}%</span>
                                    </div>
                                    {isChairman && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id, mod.title); }}
                                            title="Xóa module"
                                            style={{
                                                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                                                cursor: "pointer", color: "#EF4444", padding: "4px 8px", borderRadius: 6,
                                                display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
                                                transition: "all 0.2s", flexShrink: 0,
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = "#EF4444"; e.currentTarget.style.color = "#fff"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                                        >
                                            <Trash2 size={13} /> Xóa
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Expanded panel */}
                            {isExpanded && (
                                <div style={{ borderTop: "1px solid var(--border-primary)", padding: "16px 18px" }}>
                                    {mod.description && <p style={{ color: "var(--text-tertiary)", fontSize: 14, margin: "0 0 14px", lineHeight: 1.6 }}>{mod.description}</p>}

                                    {/* Chairman review comment — visible when changes_requested */}
                                    {mod.status === "changes_requested" && mod.review_comment && (
                                        <div style={{
                                            background: "#EF444412", border: "1px solid #EF444440", borderRadius: 10,
                                            padding: "14px 18px", marginBottom: 14,
                                        }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                                📝 Nhận xét từ Chủ tịch:
                                            </div>
                                            <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                                {mod.review_comment}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                                        {/* Assigned user: Bắt đầu */}
                                        {canStart && (
                                            <ActionBtn label="▶ Bắt đầu" bgColor="#F59E0B" onClick={(e) => {
                                                e.stopPropagation();
                                                updateModuleStatus(mod.id, "in_progress");
                                            }} />
                                        )}
                                        {/* Assigned user: Hoàn thành → sends to in_review */}
                                        {canComplete && (() => {
                                            const allDone = items.length > 0 && items.every(t => t.status === "done");
                                            return allDone ? (
                                                <ActionBtn label="📋 Báo cáo hoàn thành" bgColor="#10B981" onClick={(e) => { e.stopPropagation(); updateModuleStatus(mod.id, "in_review"); }} />
                                            ) : (
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#F59E0B", background: "#F59E0B18", padding: "6px 14px", borderRadius: 8, fontWeight: 600 }}>
                                                    ⚠️ Cần nộp tài liệu tất cả checklist ({items.filter(t => t.status === "done").length}/{items.length})
                                                </div>
                                            );
                                        })()}
                                        {/* Chairman: Review on in_review modules */}
                                        {canReview && (
                                            <ActionBtn label="👀 Xem & Duyệt" bgColor="#6366F1" onClick={(e) => { e.stopPropagation(); setForm({}); setShowReview(mod.id); setError(""); }} />
                                        )}
                                        {/* Chairman or Assignee: đính kèm tài liệu */}
                                        {(isChairman || isOwner) && (mod.status === "planned" || mod.status === "in_progress" || mod.status === "changes_requested") && (
                                            <ActionBtn label="📎 Đính kèm tài liệu" bgColor="#06B6D4" onClick={(e) => {
                                                e.stopPropagation();
                                                const input = document.createElement("input");
                                                input.type = "file"; input.multiple = true;
                                                input.onchange = (ev) => { if (ev.target.files.length) uploadFiles(mod.id, ev.target.files); };
                                                input.click();
                                            }} />
                                        )}
                                        {/* Chairman: Giao việc button */}
                                        {isChairman && mod.status === "planned" && mod.assigned_to && (
                                            <ActionBtn label="📨 Giao việc" bgColor="#8B5CF6" onClick={async (e) => {
                                                e.stopPropagation();
                                                // Send notification to assigned user
                                                await fetch("/api/notifications", {
                                                    method: "POST", headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        user_id: mod.assigned_to,
                                                        type: "module_assigned",
                                                        title: `Bạn được giao module "${mod.title}"`,
                                                        body: `${currentUser.display_name} đã giao việc module "${mod.title}" trong dự án ${project?.title}. Vui lòng vào "Công việc của tôi" để bắt đầu.`,
                                                        entity_type: "module", entity_id: mod.id,
                                                    }),
                                                });
                                                alert(`Đã giao việc module "${mod.title}" cho ${mod.assignee?.display_name || "nhân sự"} thành công!`);
                                            }} />
                                        )}
                                    </div>

                                    {uploading && <div style={{ fontSize: 14, color: "var(--accent)", marginBottom: 10, animation: "pulse-soft 1s infinite" }}>⏳ Đang upload...</div>}

                                    {/* === ATTACHED FILES === */}
                                    {moduleFiles.length > 0 && (
                                        <div style={{ marginBottom: 14 }}>
                                            <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
                                                <Paperclip size={ICO.sm} /> Tài liệu đính kèm ({moduleFiles.length})
                                            </h4>
                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                                                {moduleFiles.map(f => (
                                                    <div key={f.id} style={{
                                                        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                                                        borderRadius: "var(--radius-sm)", border: "1px solid var(--border-primary)",
                                                        background: "var(--bg-secondary)", fontSize: 14,
                                                    }}>
                                                        <span style={{ fontSize: 22, flexShrink: 0 }}>{getFileIcon(f.file_type)}</span>
                                                        <div style={{ flex: 1, overflow: "hidden" }}>
                                                            <div style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.filename}</div>
                                                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                                                {formatFileSize(f.file_size)} {f.checklist_label && `· ${f.checklist_label}`}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                                            {f.file_url && f.file_url.startsWith("http") && (
                                                                <a href={f.file_url} target="_blank" rel="noopener noreferrer" download
                                                                    style={{ background: "var(--green-bg)", color: "var(--green)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex" }}>
                                                                    <Download size={ICO.sm} />
                                                                </a>
                                                            )}
                                                            {(isOwner || isProjectLead || isChairman) && (
                                                                <button onClick={() => deleteFile(f.id, mod.id)}
                                                                    style={{ background: "var(--red-bg)", color: "var(--red)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex" }}>
                                                                    <Trash2 size={ICO.sm} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Checklist */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-tertiary)" }}>📋 Checklist ({items.length})</h4>
                                        {isChairman && mod.status === "planned" && (
                                            <button onClick={() => { setForm({}); setShowAddTask(mod.id); setError(""); }}
                                                className="btn-ghost" style={{ padding: "5px 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                                                <Plus size={ICO.sm} /> Thêm checklist
                                            </button>
                                        )}
                                    </div>
                                    {items.length === 0 ? (
                                        <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "14px 0" }}>Chưa có checklist item.</div>
                                    ) : items.map(item => {
                                        const taskFiles = moduleFiles.filter(f => f.checklist_item_id === item.id);
                                        const isDone = item.status === "done";
                                        return (
                                            <div key={item.id} style={{
                                                padding: "12px 16px", borderRadius: "var(--radius-sm)", marginBottom: 8, fontSize: 14,
                                                border: isDone ? "1px solid #10B98140" : "1px solid var(--border-primary)",
                                                background: isDone ? "#10B98108" : "var(--bg-elevated)",
                                            }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    {/* Status icon */}
                                                    <span style={{ fontSize: 18 }}>{isDone ? "✅" : "⬜"}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{
                                                            fontWeight: 600, fontSize: 15,
                                                            color: isDone ? "var(--text-muted)" : "var(--text-primary)",
                                                            textDecoration: isDone ? "line-through" : "none",
                                                        }}>{item.title}</div>
                                                        {isDone && taskFiles.length > 0 && (
                                                            <div style={{ fontSize: 12, color: "#10B981", marginTop: 4, fontWeight: 600 }}>✓ Đã nộp tài liệu</div>
                                                        )}
                                                    </div>
                                                    {/* Upload button — only for assigned user when module is in_progress */}
                                                    {!isDone && isOwner && (mod.status === "in_progress" || mod.status === "changes_requested") && (
                                                        <button onClick={() => {
                                                            const input = document.createElement("input");
                                                            input.type = "file"; input.multiple = true;
                                                            input.onchange = (e) => { if (e.target.files.length) uploadTaskFile(item.id, mod.id, e.target.files); };
                                                            input.click();
                                                        }} style={{
                                                            background: "#6366F118", border: "1px solid #6366F140",
                                                            borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                                                            color: "#6366F1", display: "flex", alignItems: "center", gap: 6,
                                                            fontSize: 13, fontWeight: 600, transition: "all 0.2s",
                                                        }}>
                                                            <Upload size={14} /> Nộp tài liệu
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Comment / Demo link input for assigned user */}
                                                {isOwner && (mod.status === "in_progress" || mod.status === "changes_requested") && (
                                                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-primary)" }}>
                                                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4, display: "block" }}>
                                                            💬 Comment
                                                        </label>
                                                        <textarea
                                                            defaultValue={item.description || ""}
                                                            onBlur={(e) => {
                                                                if (e.target.value !== (item.description || "")) {
                                                                    updateTaskComment(item.id, e.target.value, mod.id);
                                                                }
                                                            }}
                                                            placeholder="Nhập comment, link demo, hướng dẫn..."
                                                            className="input-field"
                                                            rows={2}
                                                            style={{ width: "100%", fontSize: 13, resize: "vertical", minHeight: 48 }}
                                                        />
                                                    </div>
                                                )}
                                                {/* Show saved comment for everyone */}
                                                {item.description && !(isOwner && (mod.status === "in_progress" || mod.status === "changes_requested")) && (
                                                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-primary)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                                        <span style={{ fontWeight: 600, color: "var(--text-tertiary)", fontSize: 12 }}>💬 Comment:</span>
                                                        <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{item.description}</div>
                                                    </div>
                                                )}

                                                {/* Show task files */}
                                                {taskFiles.length > 0 && (
                                                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-primary)" }}>
                                                        {taskFiles.map(f => (
                                                            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13 }}>
                                                                <span style={{ fontSize: 16 }}>{getFileIcon(f.file_type)}</span>
                                                                <span style={{ color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.filename}</span>
                                                                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{formatFileSize(f.file_size)}</span>
                                                                {f.file_url?.startsWith("http") && (
                                                                    <a href={f.file_url} target="_blank" rel="noopener noreferrer" download style={{ color: "var(--green)", display: "flex" }}><Download size={14} /></a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Feature #8: GitHub PR / Commit Link */}
                                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-primary)" }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ fontSize: 16 }}>🔗</span> GitHub PR / Commit Link
                                        </div>
                                        {mod.github_pr_url ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <a href={mod.github_pr_url} target="_blank" rel="noopener noreferrer"
                                                    style={{ fontSize: 13, color: "var(--accent)", background: "var(--accent-bg)", padding: "5px 12px", borderRadius: 8, textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flex: 1, overflow: "hidden" }}>
                                                    <span>🔗</span>
                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mod.github_pr_url}</span>
                                                </a>
                                                {(isChairman || isOwner) && (
                                                    <button onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await fetch("/api/modules", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: mod.id, github_pr_url: null }) });
                                                        reload();
                                                    }} style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 12 }}>✕ Xóa</button>
                                                )}
                                            </div>
                                        ) : (
                                            (isChairman || isOwner) && (
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <input
                                                        placeholder="https://github.com/owner/repo/pull/123"
                                                        className="input-field"
                                                        style={{ flex: 1, fontSize: 13 }}
                                                        onKeyDown={async (e) => {
                                                            if (e.key === "Enter" && e.target.value.startsWith("https://")) {
                                                                e.stopPropagation();
                                                                await fetch("/api/modules", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: mod.id, github_pr_url: e.target.value }) });
                                                                reload();
                                                            }
                                                        }}
                                                    />
                                                    <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>Enter để lưu</span>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {/* Discussion Thread */}
                                    <div style={{ marginTop: 16 }}>
                                        <DiscussionThread moduleId={mod.id} projectId={id} />
                                    </div>
                                </div>
                            )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    );
                });
            })()}

            {/* ===== MODALS ===== */}
            {/* Add Epic Modal */}
            {showAddEpic && (
                <Modal title="📁 Thêm Epic" onClose={() => setShowAddEpic(false)}>
                    {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Input label="Tên Epic *" value={form.epic_title || ""} onChange={e => setForm(f => ({ ...f, epic_title: e.target.value }))} placeholder="Ví dụ: Tính lương, Nhập điểm danh..." />
                    <Input label="Mô tả Epic" value={form.epic_description || ""} onChange={e => setForm(f => ({ ...f, epic_description: e.target.value }))} placeholder="Mô tả chung cho nhánh tính năng này..." />
                    <button onClick={addEpic} className="btn-primary" style={{ width: "100%", marginTop: 12 }}>Tạo Epic</button>
                </Modal>
            )}

            {/* Edit Epic Modal */}
            {showEditEpic && (
                <Modal title="✏️ Sửa Epic" onClose={() => setShowEditEpic(null)}>
                    {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Input label="Tên Epic *" value={form.epic_title || ""} onChange={e => setForm(f => ({ ...f, epic_title: e.target.value }))} />
                    <Input label="Mô tả Epic" value={form.epic_description || ""} onChange={e => setForm(f => ({ ...f, epic_description: e.target.value }))} />
                    <button onClick={() => updateEpic(showEditEpic)} className="btn-primary" style={{ width: "100%", marginTop: 12 }}>Lưu thay đổi</button>
                </Modal>
            )}

            {/* Feature #6 — Epic Retrospective Modal */}
            {showRetro && (
                <Modal title={`🌟 Tổng kết Epic: ${showRetro.title}`} onClose={() => setShowRetro(null)} width={540}>
                    <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(16,185,129,0.08)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.25)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        💡 Ghi lại những điểm nổi bật sau khi Epic hoàn thành để rút kinh nghiệm cho lần sau.
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 13, fontWeight: 700, color: "#10B981", display: "block", marginBottom: 6 }}>✅ Điểm thành công</label>
                        <textarea value={retroForm.wins} onChange={e => setRetroForm(f => ({ ...f, wins: e.target.value }))}
                            placeholder="Những gì đã làm tốt, hoàn thành đúng hạn, chất lượng cao..." className="input-field" rows={3} style={{ width: "100%", resize: "vertical" }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", display: "block", marginBottom: 6 }}>⚠️ Điểm cần cải thiện</label>
                        <textarea value={retroForm.improvements} onChange={e => setRetroForm(f => ({ ...f, improvements: e.target.value }))}
                            placeholder="Những gì chưa làm tốt, trễ hạn, thiếu sót..." className="input-field" rows={3} style={{ width: "100%", resize: "vertical" }} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 700, color: "#6366F1", display: "block", marginBottom: 6 }}>💡 Bài học kinh nghiệm</label>
                        <textarea value={retroForm.lessons} onChange={e => setRetroForm(f => ({ ...f, lessons: e.target.value }))}
                            placeholder="Những bài học rút ra cho các sprint/epic tiếp theo..." className="input-field" rows={3} style={{ width: "100%", resize: "vertical" }} />
                    </div>
                    <button disabled={retroSaving} onClick={async () => {
                        setRetroSaving(true);
                        await fetch("/api/retros", {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ epic_id: showRetro.id, project_id: id, created_by: currentUser.id, ...retroForm }),
                        });
                        setRetroSaving(false);
                        setShowRetro(null);
                        setRetroForm({ wins: '', improvements: '', lessons: '' });
                        alert("✅ Đã lưu Tổng kết Epic thành công!");
                    }} className="btn-primary" style={{ width: "100%", fontSize: 15, padding: "12px" }}>
                        {retroSaving ? "⏳ Đang lưu..." : "🌟 Lưu Tổng kết"}
                    </button>
                </Modal>
            )}


            {showAddModule && (
                <Modal title="📦 Thêm Task" onClose={() => setShowAddModule(false)}>
                    {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Input label="Tên Task *" value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nhập tên nhiệm vụ (Task)..." />
                    <Select label="Thuộc Epic *" value={form.epic_id || ""} onChange={e => setForm(f => ({ ...f, epic_id: e.target.value }))}>
                        <option value="">-- Chọn Epic (Bắt buộc) --</option>
                        {epics.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </Select>
                    <Input label="Mô tả" value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Assign nhân sự</label>
                            <div style={{ maxHeight: 140, overflowY: "auto", border: "1px solid var(--border-primary)", borderRadius: 10, background: "var(--bg-tertiary)" }}>
                                {users.map(u => {
                                    const sel = (form.assigned_to_ids || []).includes(u.id);
                                    return (
                                        <div key={u.id} onClick={() => setForm(f => {
                                            const cur = f.assigned_to_ids || [];
                                            return { ...f, assigned_to_ids: sel ? cur.filter(x => x !== u.id) : [...cur, u.id] };
                                        })} style={{ padding: "7px 12px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border-primary)", background: sel ? "var(--accent-bg)" : "transparent", color: sel ? "var(--accent)" : "var(--text-primary)", fontWeight: sel ? 600 : 400 }}>
                                            <span style={{ width: 16, height: 16, borderRadius: 4, border: sel ? "2px solid var(--accent)" : "2px solid var(--border-secondary)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: sel ? "var(--accent)" : "transparent", color: "#fff", flexShrink: 0 }}>{sel ? "✓" : ""}</span>
                                            {u.avatar} {u.display_name}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <Select label="Ưu tiên" value={form.priority || "medium"} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </Select>
                    </div>
                    <Input label="Deadline" type="date" value={form.deadline || ""} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                    {/* Feature #5: Labels input */}
                    <div style={{ marginTop: 4 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>🏷️ Labels (phân cách bằng dấu phẩy)</label>
                        <input
                            value={(form.labels || []).join(", ")}
                            onChange={e => setForm(f => ({ ...f, labels: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))}
                            placeholder="Ví dụ: FE, Backend, Bug, Urgent..."
                            className="input-field"
                            style={{ width: "100%", fontSize: 13 }}
                        />
                        {(form.labels || []).length > 0 && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                {form.labels.map((lbl, li) => {
                                    const lc = ["#6366F1", "#10B981", "#F59E0B", "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#06B6D4"][li % 8];
                                    return <span key={li} style={{ fontSize: 12, fontWeight: 700, color: lc, background: `${lc}18`, padding: "2px 10px", borderRadius: 20 }}>{lbl}</span>;
                                })}
                            </div>
                        )}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                        💡 Sau khi tạo Task, bạn có thể tạo checklist con và đính kèm tài liệu nghiệp vụ.
                    </p>
                    <button onClick={addModule} className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={!form.epic_id}>Tạo Task</button>
                </Modal>
            )}

            {showAddTask && (
                <Modal title="📋 Thêm Checklist" onClose={() => setShowAddTask(null)}>
                    {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Input label="Tên checklist *" placeholder="Nhập tên công việc cần hoàn thành..." value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                        💡 Người thực hiện sẽ upload tài liệu để hoàn thành mục này. Module chỉ có thể chuyển trạng thái khi tất cả checklist đã hoàn thành.
                    </p>
                    <button onClick={addTask} className="btn-primary" style={{ width: "100%", marginTop: 12 }}>Thêm Checklist</button>
                </Modal>
            )}

            {/* Submit deliverable + files */}
            {showSubmit && (
                <Modal title="📤 Nộp kết quả" onClose={() => { setShowSubmit(null); setUploadingFiles([]); }}>
                    {error && <div style={{ color: "var(--red)", fontSize: 14, marginBottom: 10 }}>⚠️ {error}</div>}
                    <Input label="Link demo" value={form.demo_link || ""} onChange={e => setForm(f => ({ ...f, demo_link: e.target.value }))} placeholder="https://..." />
                    <Input label="Ghi chú" value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Mô tả kết quả, hạn chế..." />

                    {/* File attachment area */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>📎 Đính kèm tài liệu</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: "2px dashed var(--border-secondary)", borderRadius: "var(--radius-md)",
                                padding: "24px", textAlign: "center", cursor: "pointer", transition: "all 0.2s",
                                background: "var(--bg-secondary)",
                            }}
                        >
                            <Upload size={28} color="var(--text-muted)" style={{ margin: "0 auto 8px" }} />
                            <div style={{ fontSize: 14, color: "var(--text-tertiary)" }}>Nhấn để chọn file hoặc kéo thả</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>PDF, DOCX, XLSX, images, ZIP...</div>
                        </div>
                        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
                            onChange={e => setUploadingFiles(prev => [...prev, ...Array.from(e.target.files)])} />

                        {/* Listed files */}
                        {uploadingFiles.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                                {uploadingFiles.map((f, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-primary)", marginBottom: 4, fontSize: 14 }}>
                                        <span style={{ fontSize: 18 }}>{getFileIcon(f.type)}</span>
                                        <span style={{ flex: 1, color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{formatFileSize(f.size)}</span>
                                        <button onClick={() => setUploadingFiles(prev => prev.filter((_, j) => j !== i))}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", padding: 0, display: "flex" }}><X size={ICO.sm} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button onClick={() => submitDeliverable(showSubmit)} disabled={uploading}
                        className="btn-primary" style={{ width: "100%", fontSize: 15, padding: "12px", opacity: uploading ? 0.6 : 1 }}>
                        {uploading ? "⏳ Đang nộp..." : `📤 Nộp${uploadingFiles.length > 0 ? ` (${uploadingFiles.length} file)` : ""}`}
                    </button>
                </Modal>
            )}

            {/* Review modal for Chairman to review in_review modules */}
            {showReview && (
                <Modal title="👀 Review Module" onClose={() => setShowReview(null)} width={600}>
                    {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}

                    {/* Checklist status summary */}
                    <div style={{ marginBottom: 16 }}>
                        <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>📋 Checklist đã hoàn thành</h4>
                        {(checklists[showReview] || []).map(item => {
                            const itemFiles = (files[showReview] || []).filter(f => f.checklist_item_id === item.id);
                            return (
                                <div key={item.id} style={{
                                    padding: "10px 14px", borderRadius: 8, marginBottom: 6,
                                    border: "1px solid #10B98140", background: "#10B98108",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span>✅</span>
                                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</span>
                                    </div>
                                    {itemFiles.length > 0 && (
                                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-primary)" }}>
                                            {itemFiles.map(f => (
                                                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13 }}>
                                                    <span style={{ fontSize: 16 }}>{getFileIcon(f.file_type)}</span>
                                                    <span style={{ flex: 1, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.filename}</span>
                                                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{formatFileSize(f.file_size)}</span>
                                                    {f.file_url?.startsWith("http") && (
                                                        <a href={f.file_url} target="_blank" rel="noopener noreferrer" download
                                                            style={{ background: "#10B98118", color: "#10B981", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4, textDecoration: "none", fontWeight: 600 }}>
                                                            <Download size={12} /> Tải về
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* All module attachments */}
                    {(files[showReview] || []).filter(f => !f.checklist_item_id).length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>📎 Tài liệu module</h4>
                            {(files[showReview] || []).filter(f => !f.checklist_item_id).map(f => (
                                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-primary)", marginBottom: 4, fontSize: 13 }}>
                                    <span style={{ fontSize: 16 }}>{getFileIcon(f.file_type)}</span>
                                    <span style={{ flex: 1, color: "var(--text-secondary)" }}>{f.filename}</span>
                                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{formatFileSize(f.file_size)}</span>
                                    {f.file_url?.startsWith("http") && (
                                        <a href={f.file_url} target="_blank" rel="noopener noreferrer" download style={{ color: "var(--green)", display: "flex" }}><Download size={14} /></a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <Select label="Quyết định *" value={form.decision || ""} onChange={e => setForm(f => ({ ...f, decision: e.target.value }))}>
                        <option value="">-- Chọn --</option>
                        <option value="done">✅ Phê duyệt hoàn thành</option>
                        <option value="changes_requested">🔄 Yêu cầu sửa lại</option>
                    </Select>
                    <Input label="Nhận xét" value={form.comment || ""} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} placeholder="Nhận xét cho nhân sự..." />
                    <button onClick={async () => {
                        if (!form.decision) return;
                        await updateModuleStatus(showReview, form.decision, { review_comment: form.comment || "" });
                        setShowReview(null); setForm({});
                    }} disabled={!form.decision}
                        className="btn-primary" style={{ width: "100%", opacity: form.decision ? 1 : 0.5, marginTop: 8 }}>Thực hiện</button>
                </Modal>
            )}

            {/* Deadline Picker Modal */}
            {showDeadlinePicker && (
                <Modal title="📅 Chọn deadline hoàn thành" onClose={() => setShowDeadlinePicker(null)} width={420}>
                    <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
                        Vui lòng chọn ngày dự kiến hoàn thành trước khi bắt đầu công việc.
                    </p>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                            Ngày hoàn thành dự kiến *
                        </label>
                        <input
                            type="date"
                            value={deadlineDate}
                            onChange={e => setDeadlineDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="input-field"
                            style={{ width: "100%", fontSize: 15, padding: "12px 14px", cursor: "pointer" }}
                        />
                    </div>
                    {!deadlineDate && (
                        <div style={{ color: "#F59E0B", fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                            ⚠️ Bạn cần chọn deadline để bắt đầu
                        </div>
                    )}
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button onClick={() => setShowDeadlinePicker(null)} className="btn-ghost" style={{ padding: "10px 20px", fontSize: 14 }}>
                            Hủy
                        </button>
                        <button
                            disabled={!deadlineDate}
                            onClick={async () => {
                                await updateModuleStatus(showDeadlinePicker, "in_progress", { deadline: deadlineDate });
                                setShowDeadlinePicker(null);
                                setDeadlineDate("");
                            }}
                            style={{
                                padding: "10px 24px", fontSize: 14, fontWeight: 700,
                                background: deadlineDate ? "var(--gradient-brand)" : "var(--bg-tertiary)",
                                color: deadlineDate ? "#fff" : "var(--text-muted)",
                                border: "none", borderRadius: 10, cursor: deadlineDate ? "pointer" : "not-allowed",
                                boxShadow: deadlineDate ? "0 2px 12px rgba(99,102,241,0.3)" : "none",
                                transition: "all 0.2s",
                            }}
                        >
                            ▶ Bắt đầu công việc
                        </button>
                    </div>
                </Modal>
            )}

            {/* Peer Assignment Modal */}
            {showAssignModal && (
                <AssignModuleModal
                    projectId={id}
                    users={users}
                    onClose={() => setShowAssignModal(false)}
                    onCreated={() => reload()}
                />
            )}
        </div>
    );
}

function ActionBtn({ label, bgColor, onClick }) {
    return (
        <button onClick={onClick} style={{
            background: `${bgColor}18`, color: bgColor, border: `1px solid ${bgColor}40`,
            borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
            transition: "all 0.2s",
        }}>
            {label}
        </button>
    );
}
