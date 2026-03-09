"use client";
import { useState, useEffect, use, useRef } from "react";
import { useUser } from "@/lib/UserContext";
import { ArrowLeft, Plus, Package, ChevronDown, ChevronRight, Upload, Paperclip, FileText, Download, X, Trash2 } from "lucide-react";
import Link from "next/link";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";

/* ==================== ICON SIZES ==================== */
const ICO = { sm: 16, md: 20, lg: 24 };

const STATUS_CFG = {
    planned: { color: "var(--accent)", label: "Kế hoạch", icon: "📋" },
    in_progress: { color: "var(--amber)", label: "Đang phát triển", icon: "🔨" },
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
    const { currentUser, isChairman, isProjectLead } = useUser();
    const [project, setProject] = useState(null);
    const [modules, setModules] = useState([]);
    const [users, setUsers] = useState([]);
    const [expandedModule, setExpandedModule] = useState(null);
    const [checklists, setChecklists] = useState({});
    const [files, setFiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [showAddModule, setShowAddModule] = useState(false);
    const [showAddTask, setShowAddTask] = useState(null);
    const [showSubmit, setShowSubmit] = useState(null);
    const [showReview, setShowReview] = useState(null);
    const [form, setForm] = useState({});
    const [error, setError] = useState("");
    const [uploadingFiles, setUploadingFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const taskFileRef = useRef(null);

    const reload = async () => {
        try {
            const [pRes, mRes, uRes] = await Promise.all([
                fetch(`/api/projects`).then(r => r.json()),
                fetch(`/api/modules?project_id=${id}`).then(r => r.json()),
                fetch("/api/users").then(r => r.json()),
            ]);
            setProject((Array.isArray(pRes) ? pRes : []).find(p => p.id === id) || null);
            setModules(Array.isArray(mRes) ? mRes : []);
            setUsers(Array.isArray(uRes) ? uRes : []);
            setLoading(false);
        } catch { setLoading(false); }
    };

    useEffect(() => { reload(); }, [id]);

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
        }
    };

    const addModule = async () => {
        if (!form.title?.trim()) { setError("Tên module bắt buộc"); return; }
        setError("");
        const res = await fetch("/api/modules", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, project_id: id, created_by: currentUser.id }),
        });
        if (!res.ok) { setError((await res.json()).error); return; }
        setShowAddModule(false); setForm({}); reload();
    };

    const addTask = async () => {
        if (!form.title?.trim()) { setError("Tên task bắt buộc"); return; }
        setError("");
        const res = await fetch("/api/checklist", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, module_id: showAddTask, assigned_by: currentUser.id, project_id: id }),
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

    const updateModuleStatus = async (moduleId, status) => {
        await fetch("/api/modules", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: moduleId, status, user_id: currentUser.id, project_id: id }),
        });
        // Auto-notify assignee when status changes
        const mod = modules.find(m => m.id === moduleId);
        if (mod?.assigned_to && mod.assigned_to !== currentUser.id) {
            const STATUS_LABELS = { planned: "Kế hoạch", in_progress: "Đang phát triển", done: "Hoàn thành", submitted: "Đã nộp", approved: "Phê duyệt", changes_requested: "Yêu cầu sửa" };
            await fetch("/api/notifications", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: mod.assigned_to,
                    type: "module_status_changed",
                    title: `Module "${mod.title}" → ${STATUS_LABELS[status] || status}`,
                    body: `${currentUser.display_name} đã chuyển trạng thái module của bạn.`,
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

    // Upload file for checklist item
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
        loadFiles(moduleId);
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

            {/* Modules toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                    <Package size={ICO.md} color="var(--accent)" /> Modules ({modules.length})
                </h3>
                {isProjectLead && (
                    <button onClick={() => { setForm({}); setShowAddModule(true); setError(""); }} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", fontSize: 14 }}>
                        <Plus size={ICO.sm} /> Thêm Module
                    </button>
                )}
            </div>

            {/* Module list */}
            {modules.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)", fontSize: 15, background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)" }}>
                    Chưa có module. {isProjectLead && "Nhấn \"Thêm Module\" để bắt đầu!"}
                </div>
            ) : modules.map(mod => {
                const sc = STATUS_CFG[mod.status] || STATUS_CFG.planned;
                const pc = PRIORITY_CFG[mod.priority] || PRIORITY_CFG.medium;
                const isExpanded = expandedModule === mod.id;
                const items = checklists[mod.id] || [];
                const moduleFiles = files[mod.id] || [];
                const isOwner = currentUser?.id === mod.assigned_to;
                const canManage = isOwner || isChairman || isProjectLead;
                const canSubmit = isOwner && (mod.status === "in_progress" || mod.status === "changes_requested");
                const canReview = isChairman && mod.status === "submitted";

                return (
                    <div key={mod.id} className="glass-card" style={{ marginBottom: 8, overflow: "hidden", borderColor: isExpanded ? "var(--border-active)" : undefined }}>
                        {/* Module header */}
                        <div onClick={() => toggleModule(mod.id)} style={{ display: "flex", alignItems: "center", padding: "14px 18px", cursor: "pointer", gap: 12 }}>
                            {isExpanded ? <ChevronDown size={ICO.md} color="var(--accent)" /> : <ChevronRight size={ICO.md} color="var(--text-muted)" />}
                            <span style={{ fontSize: 22, flexShrink: 0 }}>{sc.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{mod.title}</div>
                                <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: sc.color, background: `${sc.color}12`, padding: "2px 10px", borderRadius: 8 }}>{sc.label}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: pc.color, background: `${pc.color}12`, padding: "2px 10px", borderRadius: 8 }}>{pc.label}</span>
                                    {mod.assignee && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>👤 {mod.assignee.display_name}</span>}
                                    {mod.deadline && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>📅 {new Date(mod.deadline).toLocaleDateString("vi-VN")}</span>}
                                </div>
                            </div>
                            <div style={{ width: 100, display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, height: 6, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${mod.progress_pct}%`, background: mod.progress_pct === 100 ? "var(--green)" : "var(--accent)", borderRadius: 3, transition: "width 0.3s" }} />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)" }}>{mod.progress_pct}%</span>
                            </div>
                        </div>

                        {/* Expanded panel */}
                        {isExpanded && (
                            <div style={{ borderTop: "1px solid var(--border-primary)", padding: "16px 18px" }}>
                                {mod.description && <p style={{ color: "var(--text-tertiary)", fontSize: 14, margin: "0 0 14px", lineHeight: 1.6 }}>{mod.description}</p>}

                                {/* Action buttons */}
                                <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                                    {canManage && mod.status === "planned" && (
                                        <ActionBtn label="▶ Bắt đầu" bgColor="#F59E0B" onClick={(e) => { e.stopPropagation(); updateModuleStatus(mod.id, "in_progress"); }} />
                                    )}
                                    {canManage && mod.status === "in_progress" && (
                                        <ActionBtn label="✅ Hoàn thành" bgColor="#10B981" onClick={(e) => { e.stopPropagation(); updateModuleStatus(mod.id, "done"); }} />
                                    )}
                                    {canSubmit && (
                                        <ActionBtn label="📤 Nộp kết quả" bgColor="#3B82F6" onClick={(e) => { e.stopPropagation(); setForm({}); setUploadingFiles([]); setShowSubmit(mod.id); setError(""); }} />
                                    )}
                                    {canReview && (
                                        <ActionBtn label="👀 Review" bgColor="#6366F1" onClick={(e) => { e.stopPropagation(); setForm({}); setShowReview(mod.id); setError(""); }} />
                                    )}
                                    {/* Upload files button */}
                                    {(isOwner || isProjectLead) && (
                                        <ActionBtn label="📎 Đính kèm" bgColor="#06B6D4" onClick={(e) => {
                                            e.stopPropagation();
                                            const input = document.createElement("input");
                                            input.type = "file"; input.multiple = true;
                                            input.onchange = (ev) => { if (ev.target.files.length) uploadFiles(mod.id, ev.target.files); };
                                            input.click();
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
                                    {isProjectLead && (
                                        <button onClick={() => { setForm({}); setShowAddTask(mod.id); setError(""); }}
                                            className="btn-ghost" style={{ padding: "5px 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                                            <Plus size={ICO.sm} /> Thêm task
                                        </button>
                                    )}
                                </div>
                                {items.length === 0 ? (
                                    <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "14px 0" }}>Chưa có checklist item.</div>
                                ) : items.map(item => {
                                    const ts = TASK_STATUS_CFG[item.status] || TASK_STATUS_CFG.todo;
                                    const taskFiles = moduleFiles.filter(f => f.checklist_item_id === item.id);
                                    return (
                                        <div key={item.id} style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-primary)", marginBottom: 6, fontSize: 14 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <select value={item.status} onChange={e => updateTaskStatus(item.id, e.target.value, mod.id)}
                                                    style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${ts.color}40`, fontSize: 12, background: `${ts.color}10`, color: ts.color, fontWeight: 600, cursor: "pointer" }}>
                                                    <option value="todo">Todo</option>
                                                    <option value="doing">Đang làm</option>
                                                    <option value="done">Xong</option>
                                                    <option value="blocked">Blocked</option>
                                                </select>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 500, fontSize: 15, color: item.status === "done" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: item.status === "done" ? "line-through" : "none" }}>{item.title}</div>
                                                    <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
                                                        {item.assignee && <span>👤 {item.assignee.display_name}</span>}
                                                        {item.deadline && <span> · 📅 {new Date(item.deadline).toLocaleDateString("vi-VN")}</span>}
                                                    </div>
                                                </div>
                                                {/* Task file attach button */}
                                                <button onClick={() => {
                                                    const input = document.createElement("input");
                                                    input.type = "file"; input.multiple = true;
                                                    input.onchange = (e) => { if (e.target.files.length) uploadTaskFile(item.id, mod.id, e.target.files); };
                                                    input.click();
                                                }} title="Đính kèm file" style={{ background: "var(--bg-tertiary)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--text-tertiary)", display: "flex" }}>
                                                    <Paperclip size={ICO.sm} />
                                                </button>
                                            </div>
                                            {/* Show task files */}
                                            {taskFiles.length > 0 && (
                                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-primary)" }}>
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
                            </div>
                        )}
                    </div>
                );
            })}

            {/* ===== MODALS ===== */}

            {showAddModule && (
                <Modal title="📦 Thêm Module" onClose={() => setShowAddModule(false)}>
                    {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Input label="Tên module *" value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    <Input label="Mô tả" value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Select label="Assign cho" value={form.assigned_to || ""} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                            <option value="">-- Chọn --</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
                        </Select>
                        <Select label="Ưu tiên" value={form.priority || "medium"} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </Select>
                    </div>
                    <Input label="Deadline" type="date" value={form.deadline || ""} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                    <button onClick={addModule} className="btn-primary" style={{ width: "100%", marginTop: 8 }}>Tạo Module</button>
                </Modal>
            )}

            {showAddTask && (
                <Modal title="📋 Thêm Task" onClose={() => setShowAddTask(null)}>
                    {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Input label="Tên task *" value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    <Input label="Mô tả" value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Select label="Assign cho" value={form.assigned_to || ""} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                            <option value="">-- Chọn --</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
                        </Select>
                        <Input label="Deadline" type="date" value={form.deadline || ""} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                    </div>
                    <button onClick={addTask} className="btn-primary" style={{ width: "100%", marginTop: 8 }}>Thêm Task</button>
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

            {/* Review with file viewing */}
            {showReview && (
                <Modal title="👀 Review Module" onClose={() => setShowReview(null)} width={560}>
                    {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}

                    {/* Show attached files for review */}
                    {(files[showReview] || []).length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 4 }}>
                                <Paperclip size={14} /> Tài liệu đã nộp ({files[showReview].length})
                            </h4>
                            {files[showReview].map(f => (
                                <div key={f.id} style={{
                                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                                    borderRadius: "var(--radius-sm)", border: "1px solid var(--border-primary)",
                                    background: "var(--bg-secondary)", marginBottom: 4, fontSize: 12,
                                }}>
                                    <span style={{ fontSize: 18 }}>{getFileIcon(f.file_type)}</span>
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <div style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.filename}</div>
                                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatFileSize(f.file_size)} · {f.checklist_label}</div>
                                    </div>
                                    {f.file_url?.startsWith("http") && (
                                        <a href={f.file_url} target="_blank" rel="noopener noreferrer" download className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                            <Download size={12} /> Tải
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <Select label="Quyết định *" value={form.decision || ""} onChange={e => setForm(f => ({ ...f, decision: e.target.value }))}>
                        <option value="">-- Chọn --</option>
                        <option value="approved">✅ Phê duyệt</option>
                        <option value="changes_requested">🔄 Yêu cầu sửa</option>
                        <option value="rejected">❌ Từ chối</option>
                    </Select>
                    <Input label="Comment" value={form.comment || ""} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} placeholder="Nhận xét..." />
                    <button onClick={() => {
                        fetch(`/api/deliverables?module_id=${showReview}`).then(r => r.json()).then(d => { if (d.length) reviewDeliverable(d[0].id); });
                    }} disabled={!form.decision}
                        className="btn-primary" style={{ width: "100%", opacity: form.decision ? 1 : 0.5 }}>Gửi Review</button>
                </Modal>
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
