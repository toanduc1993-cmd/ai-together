"use client";
import { useState, useEffect, use } from "react";
import { useUser } from "@/lib/UserContext";
import { ArrowLeft, Plus, Package, ListChecks, ChevronDown, ChevronRight, Upload, Eye, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import Link from "next/link";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";

const STATUS_CFG = {
    planned: { color: "#94A3B8", label: "Kế hoạch", icon: "📋" },
    in_progress: { color: "#F59E0B", label: "Đang phát triển", icon: "🔨" },
    review: { color: "#8B5CF6", label: "Review", icon: "👀" },
    submitted: { color: "#3B82F6", label: "Đã nộp", icon: "📤" },
    approved: { color: "#10B981", label: "Phê duyệt", icon: "✅" },
    changes_requested: { color: "#F59E0B", label: "Cần sửa", icon: "🔄" },
    rejected: { color: "#EF4444", label: "Từ chối", icon: "❌" },
    done: { color: "#10B981", label: "Hoàn thành", icon: "🎉" },
};

const PRIORITY_CFG = {
    critical: { color: "#EF4444", label: "Critical" },
    high: { color: "#F59E0B", label: "High" },
    medium: { color: "#3B82F6", label: "Medium" },
    low: { color: "#94A3B8", label: "Low" },
};

const TASK_STATUS_CFG = {
    todo: { color: "#94A3B8", label: "Todo" },
    doing: { color: "#F59E0B", label: "Đang làm" },
    done: { color: "#10B981", label: "Xong" },
    blocked: { color: "#EF4444", label: "Blocked" },
};

export default function ProjectDetailPage({ params }) {
    const { id } = use(params);
    const { currentUser, isChairman, isProjectLead } = useUser();
    const [project, setProject] = useState(null);
    const [modules, setModules] = useState([]);
    const [users, setUsers] = useState([]);
    const [expandedModule, setExpandedModule] = useState(null);
    const [checklists, setChecklists] = useState({});
    const [loading, setLoading] = useState(true);
    const [showAddModule, setShowAddModule] = useState(false);
    const [showAddTask, setShowAddTask] = useState(null);
    const [showSubmit, setShowSubmit] = useState(null);
    const [showReview, setShowReview] = useState(null);
    const [form, setForm] = useState({});
    const [error, setError] = useState("");

    const reload = async () => {
        try {
            const [pRes, mRes, uRes] = await Promise.all([
                fetch(`/api/projects`).then(r => r.json()),
                fetch(`/api/modules?project_id=${id}`).then(r => r.json()),
                fetch("/api/users").then(r => r.json()),
            ]);
            const projects = Array.isArray(pRes) ? pRes : [];
            setProject(projects.find(p => p.id === id) || null);
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

    const toggleModule = (moduleId) => {
        if (expandedModule === moduleId) {
            setExpandedModule(null);
        } else {
            setExpandedModule(moduleId);
            if (!checklists[moduleId]) loadChecklist(moduleId);
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
        setShowAddTask(null); setForm({}); loadChecklist(showAddTask);
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
        reload();
    };

    const submitDeliverable = async (moduleId) => {
        const chairman = users.find(u => u.role === "chairman");
        const res = await fetch("/api/deliverables", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ module_id: moduleId, submitted_by: currentUser.id, demo_link: form.demo_link || "", notes: form.notes || "", project_id: id, chairman_id: chairman?.id }),
        });
        if (!res.ok) { setError((await res.json()).error); return; }
        setShowSubmit(null); setForm({}); reload();
    };

    const reviewDeliverable = async (deliverableId) => {
        const res = await fetch("/api/reviews", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deliverable_id: deliverableId, reviewer_id: currentUser.id, decision: form.decision, comment: form.comment || "", project_id: id }),
        });
        if (!res.ok) { setError((await res.json()).error); return; }
        setShowReview(null); setForm({}); reload();
    };

    if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Đang tải...</div>;
    if (!project) return <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Project không tìm thấy</div>;

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Link href="/projects" style={{ color: "#64748B", display: "flex", alignItems: "center" }}><ArrowLeft size={18} /></Link>
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0F172A" }}>{project.title}</h2>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                        <span>Lead: <strong style={{ color: "#0F172A" }}>{project.lead?.display_name || "—"}</strong></span>
                        <span>Chairman: <strong style={{ color: "#0F172A" }}>{project.chairman?.display_name || "—"}</strong></span>
                        {project.deadline && <span>Deadline: <strong style={{ color: "#0F172A" }}>{new Date(project.deadline).toLocaleDateString("vi-VN")}</strong></span>}
                    </div>
                </div>
            </div>
            {project.description && <p style={{ color: "#64748B", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>{project.description}</p>}

            {/* Toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 6 }}>
                    <Package size={17} color="#8B5CF6" /> Modules ({modules.length})
                </h3>
                {isProjectLead && (
                    <button onClick={() => { setForm({}); setShowAddModule(true); setError(""); }}
                        style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        <Plus size={14} /> Thêm Module
                    </button>
                )}
            </div>

            {/* Module list */}
            {modules.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#94A3B8", background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0" }}>
                    Chưa có module. {isProjectLead && "Nhấn \"Thêm Module\" để bắt đầu!"}
                </div>
            ) : modules.map(mod => {
                const sc = STATUS_CFG[mod.status] || STATUS_CFG.planned;
                const pc = PRIORITY_CFG[mod.priority] || PRIORITY_CFG.medium;
                const isExpanded = expandedModule === mod.id;
                const items = checklists[mod.id] || [];
                const isOwner = currentUser?.id === mod.assigned_to;
                const canSubmit = isOwner && (mod.status === "in_progress" || mod.status === "changes_requested");
                const canReview = isChairman && mod.status === "submitted";

                return (
                    <div key={mod.id} style={{ background: "#FFFFFF", borderRadius: 12, border: `1px solid ${isExpanded ? "#8B5CF620" : "#E2E8F0"}`, marginBottom: 8, overflow: "hidden", transition: "all 0.2s" }}>
                        {/* Module header */}
                        <div onClick={() => toggleModule(mod.id)} style={{ display: "flex", alignItems: "center", padding: "12px 16px", cursor: "pointer", gap: 10 }}>
                            {isExpanded ? <ChevronDown size={16} color="#8B5CF6" /> : <ChevronRight size={16} color="#94A3B8" />}
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{sc.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{mod.title}</div>
                                <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: sc.color, background: `${sc.color}12`, padding: "1px 7px", borderRadius: 8 }}>{sc.label}</span>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: pc.color, background: `${pc.color}12`, padding: "1px 7px", borderRadius: 8 }}>{pc.label}</span>
                                    {mod.assignee && <span style={{ fontSize: 10, color: "#64748B" }}>👤 {mod.assignee.display_name}</span>}
                                    {mod.deadline && <span style={{ fontSize: 10, color: "#94A3B8" }}>📅 {new Date(mod.deadline).toLocaleDateString("vi-VN")}</span>}
                                </div>
                            </div>
                            {/* Progress bar */}
                            <div style={{ width: 80, display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ flex: 1, height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${mod.progress_pct}%`, background: mod.progress_pct === 100 ? "#10B981" : "#8B5CF6", borderRadius: 3, transition: "width 0.3s" }} />
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 600, color: "#64748B" }}>{mod.progress_pct}%</span>
                            </div>
                        </div>

                        {/* Expanded: Checklist + actions */}
                        {isExpanded && (
                            <div style={{ borderTop: "1px solid #F1F5F9", padding: "12px 16px" }}>
                                {mod.description && <p style={{ color: "#64748B", fontSize: 12, margin: "0 0 12px", lineHeight: 1.5 }}>{mod.description}</p>}

                                {/* Status actions */}
                                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                                    {isOwner && mod.status === "planned" && (
                                        <ActionBtn label="▶ Bắt đầu phát triển" color="#F59E0B" onClick={() => updateModuleStatus(mod.id, "in_progress")} />
                                    )}
                                    {canSubmit && (
                                        <ActionBtn label="📤 Nộp kết quả" color="#3B82F6" onClick={() => { setForm({}); setShowSubmit(mod.id); setError(""); }} />
                                    )}
                                    {canReview && (
                                        <ActionBtn label="👀 Review" color="#8B5CF6" onClick={() => { setForm({}); setShowReview(mod.id); setError(""); }} />
                                    )}
                                </div>

                                {/* Checklist */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#64748B" }}>📋 Checklist ({items.length})</h4>
                                    {isProjectLead && (
                                        <button onClick={() => { setForm({}); setShowAddTask(mod.id); setError(""); }}
                                            style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#64748B", display: "flex", alignItems: "center", gap: 3 }}>
                                            <Plus size={12} /> Thêm task
                                        </button>
                                    )}
                                </div>
                                {items.length === 0 ? (
                                    <div style={{ fontSize: 12, color: "#94A3B8", padding: "12px 0" }}>Chưa có checklist item.</div>
                                ) : items.map(item => {
                                    const ts = TASK_STATUS_CFG[item.status] || TASK_STATUS_CFG.todo;
                                    return (
                                        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid #F1F5F9", marginBottom: 4, fontSize: 12 }}>
                                            <select value={item.status} onChange={e => updateTaskStatus(item.id, e.target.value, mod.id)}
                                                style={{ padding: "2px 4px", borderRadius: 6, border: `1px solid ${ts.color}40`, fontSize: 10, background: `${ts.color}10`, color: ts.color, fontWeight: 600, cursor: "pointer" }}>
                                                <option value="todo">Todo</option>
                                                <option value="doing">Đang làm</option>
                                                <option value="done">Xong</option>
                                                <option value="blocked">Blocked</option>
                                            </select>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 500, color: item.status === "done" ? "#94A3B8" : "#0F172A", textDecoration: item.status === "done" ? "line-through" : "none" }}>{item.title}</div>
                                                <div style={{ color: "#94A3B8", fontSize: 10, marginTop: 1 }}>
                                                    {item.assignee && <span>👤 {item.assignee.display_name}</span>}
                                                    {item.deadline && <span> • 📅 {new Date(item.deadline).toLocaleDateString("vi-VN")}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Modals */}
            {showAddModule && (
                <Modal title="📦 Thêm Module" onClose={() => setShowAddModule(false)}>
                    {error && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Input label="Tên module *" value={form.title || ""} onChange={v => setForm(f => ({ ...f, title: v }))} />
                    <Input label="Mô tả" value={form.description || ""} onChange={v => setForm(f => ({ ...f, description: v }))} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Select label="Assign cho" value={form.assigned_to || ""} onChange={v => setForm(f => ({ ...f, assigned_to: v }))}
                            options={users.map(u => ({ value: u.id, label: u.display_name }))} />
                        <Select label="Ưu tiên" value={form.priority || "medium"} onChange={v => setForm(f => ({ ...f, priority: v }))}
                            options={[{ value: "critical", label: "Critical" }, { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} />
                    </div>
                    <Input label="Deadline" value={form.deadline || ""} onChange={v => setForm(f => ({ ...f, deadline: v }))} placeholder="YYYY-MM-DD" />
                    <button onClick={addModule} style={{ width: "100%", background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#fff", border: "none", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, marginTop: 8 }}>Tạo Module</button>
                </Modal>
            )}

            {showAddTask && (
                <Modal title="📋 Thêm Task" onClose={() => setShowAddTask(null)}>
                    {error && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Input label="Tên task *" value={form.title || ""} onChange={v => setForm(f => ({ ...f, title: v }))} />
                    <Input label="Mô tả" value={form.description || ""} onChange={v => setForm(f => ({ ...f, description: v }))} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Select label="Assign cho" value={form.assigned_to || ""} onChange={v => setForm(f => ({ ...f, assigned_to: v }))}
                            options={users.map(u => ({ value: u.id, label: u.display_name }))} />
                        <Input label="Deadline" value={form.deadline || ""} onChange={v => setForm(f => ({ ...f, deadline: v }))} placeholder="YYYY-MM-DD" />
                    </div>
                    <button onClick={addTask} style={{ width: "100%", background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", color: "#fff", border: "none", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, marginTop: 8 }}>Thêm Task</button>
                </Modal>
            )}

            {showSubmit && (
                <Modal title="📤 Nộp kết quả" onClose={() => setShowSubmit(null)}>
                    {error && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Input label="Link demo" value={form.demo_link || ""} onChange={v => setForm(f => ({ ...f, demo_link: v }))} placeholder="https://..." />
                    <Input label="Ghi chú" value={form.notes || ""} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Mô tả giả định, hạn chế, hướng phát triển..." />
                    <button onClick={() => submitDeliverable(showSubmit)} style={{ width: "100%", background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", color: "#fff", border: "none", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, marginTop: 8 }}>📤 Nộp</button>
                </Modal>
            )}

            {showReview && (
                <Modal title="👀 Review Module" onClose={() => setShowReview(null)}>
                    {error && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Select label="Quyết định *" value={form.decision || ""} onChange={v => setForm(f => ({ ...f, decision: v }))}
                        options={[{ value: "approved", label: "✅ Phê duyệt" }, { value: "changes_requested", label: "🔄 Yêu cầu sửa" }, { value: "rejected", label: "❌ Từ chối" }]} />
                    <Input label="Comment" value={form.comment || ""} onChange={v => setForm(f => ({ ...f, comment: v }))} placeholder="Nhận xét..." />
                    <button onClick={() => { const mod = modules.find(m => m.id === showReview); if (mod) { fetch(`/api/deliverables?module_id=${showReview}`).then(r => r.json()).then(d => { if (d.length) reviewDeliverable(d[0].id); }); } }}
                        disabled={!form.decision}
                        style={{ width: "100%", background: form.decision ? "linear-gradient(135deg, #8B5CF6, #6D28D9)" : "#94A3B8", color: "#fff", border: "none", borderRadius: 8, padding: 10, cursor: form.decision ? "pointer" : "not-allowed", fontWeight: 600, fontSize: 13, marginTop: 8 }}>Gửi Review</button>
                </Modal>
            )}
        </div>
    );
}

function ActionBtn({ label, color, onClick }) {
    return (
        <button onClick={onClick} style={{ background: `${color}10`, color, border: `1px solid ${color}30`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
            {label}
        </button>
    );
}
