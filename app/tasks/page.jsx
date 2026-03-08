"use client";
import { useState, useEffect, useMemo } from "react";
import { ListTodo, Plus, MessageCircle, Send } from "lucide-react";
import Badge from "@/components/Badge";
import Btn from "@/components/Btn";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { STATUS_CONFIG, PRIORITY_CONFIG, timeAgo } from "@/lib/helpers";
import { useUser } from "@/lib/UserContext";

const LIGHT_STATUS = {
    todo: { label: "Todo", color: "#64748B", bg: "#F1F5F9" },
    doing: { label: "Đang làm", color: "#3B82F6", bg: "#EFF6FF" },
    review: { label: "Review", color: "#A855F7", bg: "#F5F3FF" },
    blocked: { label: "Blocked", color: "#EF4444", bg: "#FEF2F2" },
    done: { label: "Hoàn thành", color: "#10B981", bg: "#ECFDF5" },
};

export default function TaskBoardPage() {
    const { currentUser } = useUser();
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [newComment, setNewComment] = useState("");
    const [filterProject, setFilterProject] = useState("all");
    const [filterOwner, setFilterOwner] = useState("all");
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);

    const reload = () => Promise.all([
        fetch("/api/tasks").then(r => r.json()),
        fetch("/api/members").then(r => r.json()),
        fetch("/api/projects").then(r => r.json()),
    ]).then(([t, m, p]) => { setTasks(t); setMembers(m); setProjects(p); });

    useEffect(() => { reload(); }, []);

    const filteredTasks = useMemo(() => {
        let t = tasks;
        if (filterProject !== "all") t = t.filter(x => x.project === filterProject);
        if (filterOwner !== "all") t = t.filter(x => x.owner === filterOwner);
        return t;
    }, [tasks, filterProject, filterOwner]);

    const openCreate = () => {
        setForm({ title: "", owner: "", assignedBy: currentUser?.id || "le", project: "", priority: "medium", deadline: "" });
        setShowCreate(true);
    };

    const saveTask = async () => {
        if (!form.title || saving) return;
        setSaving(true);
        await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form }) });
        setSaving(false); setShowCreate(false); reload();
    };

    const changeStatus = async (taskId, newStatus) => {
        await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status", taskId, status: newStatus, userId: currentUser?.id }) });
        reload();
        if (showDetail?.id === taskId) setShowDetail(prev => ({ ...prev, status: newStatus }));
    };

    const addComment = async (taskId) => {
        if (!newComment.trim()) return;
        await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", taskId, author: currentUser?.id || "le", text: newComment }) });
        setNewComment("");
        const updated = await fetch("/api/tasks").then(r => r.json());
        setTasks(updated);
        const detail = updated.find(t => t.id === taskId);
        if (detail) setShowDetail(detail);
    };

    const columns = Object.entries(LIGHT_STATUS);

    return (
        <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h2 style={{ color: "#0F172A", margin: 0, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
                        <ListTodo size={22} color="#10B981" /> Task Board
                    </h2>
                    <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 13 }}>Giao việc cho nhau, theo dõi tiến độ, trao đổi trực tiếp</p>
                </div>
                <Btn onClick={openCreate} color="#10B981"><Plus size={14} /> Tạo Task Mới</Btn>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <Select value={filterProject} onChange={setFilterProject} options={[{ value: "all", label: "Tất cả dự án" }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
                <Select value={filterOwner} onChange={setFilterOwner} options={[{ value: "all", label: "Tất cả thành viên" }, ...members.map(m => ({ value: m.id, label: m.name }))]} />
            </div>

            {/* Kanban */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 12 }}>
                {columns.map(([status, config]) => {
                    const colTasks = filteredTasks.filter(t => t.status === status);
                    return (
                        <div key={status} style={{ background: config.bg, borderRadius: 12, padding: 12, minHeight: 200 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: config.color }} />
                                    <span style={{ color: "#475569", fontSize: 13, fontWeight: 600 }}>{config.label}</span>
                                </div>
                                <span style={{ background: "#FFFFFF", color: config.color, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, border: `1px solid ${config.color}30` }}>{colTasks.length}</span>
                            </div>
                            {colTasks.map(task => {
                                const member = members.find(m => m.id === task.owner);
                                const assigner = members.find(m => m.id === task.assignedBy);
                                const project = projects.find(p => p.id === task.project);
                                const pc = PRIORITY_CONFIG[task.priority];
                                const daysLeft = task.deadline ? Math.ceil((new Date(task.deadline) - new Date()) / 86400000) : null;
                                return (
                                    <div key={task.id} style={{
                                        background: "#FFFFFF", borderRadius: 8, padding: 12, marginBottom: 8, cursor: "pointer",
                                        border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s",
                                    }} onClick={() => setShowDetail(task)}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                            <span style={{ color: "#94A3B8", fontSize: 10, fontFamily: "monospace" }}>{task.id}</span>
                                            {project && <Badge color={project.color}>{project.name}</Badge>}
                                            <span style={{ fontSize: 10, marginLeft: "auto" }}>{pc?.icon}</span>
                                        </div>
                                        <div style={{ color: "#0F172A", fontSize: 13, fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>{task.title}</div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <span style={{ fontSize: 14 }}>{member?.avatar || "👤"}</span>
                                                <span style={{ color: "#64748B", fontSize: 11 }}>{member?.name || "—"}</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {task.comments?.length > 0 && (
                                                    <span style={{ display: "flex", alignItems: "center", gap: 2, color: "#94A3B8", fontSize: 11 }}>
                                                        <MessageCircle size={10} /> {task.comments.length}
                                                    </span>
                                                )}
                                                {daysLeft !== null && (
                                                    <span style={{ fontSize: 10, color: daysLeft < 0 ? "#EF4444" : daysLeft <= 2 ? "#F59E0B" : "#94A3B8" }}>
                                                        {daysLeft < 0 ? `+${-daysLeft}d` : `${daysLeft}d`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {assigner && assigner.id !== task.owner && (
                                            <div style={{ marginTop: 6, fontSize: 10, color: "#94A3B8" }}>giao bởi {assigner.name}</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <Modal title="Tạo Task Mới — Giao việc cho team" onClose={() => setShowCreate(false)}>
                    <Input label="Tiêu đề task" value={form.title || ""} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="Mô tả task cần làm..." />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Select label="Giao cho" value={form.owner || ""} onChange={v => setForm(f => ({ ...f, owner: v }))} options={members.map(m => ({ value: m.id, label: m.name }))} placeholder="Chọn người..." />
                        <Select label="Người giao" value={form.assignedBy || ""} onChange={v => setForm(f => ({ ...f, assignedBy: v }))} options={members.map(m => ({ value: m.id, label: m.name }))} placeholder="Ai giao?" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Select label="Dự án" value={form.project || ""} onChange={v => setForm(f => ({ ...f, project: v }))} options={projects.map(p => ({ value: p.id, label: p.name }))} />
                        <Select label="Priority" value={form.priority || ""} onChange={v => setForm(f => ({ ...f, priority: v }))} options={Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` }))} />
                    </div>
                    <Input label="Deadline" value={form.deadline || ""} onChange={v => setForm(f => ({ ...f, deadline: v }))} type="date" />
                    <Btn onClick={saveTask} color="#10B981" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                        <Plus size={14} /> {saving ? "Đang lưu..." : "Tạo Task"}
                    </Btn>
                </Modal>
            )}

            {/* Detail Modal */}
            {showDetail && (
                <Modal title={`${showDetail.id}: ${showDetail.title}`} onClose={() => setShowDetail(null)} width={600}>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                            <Badge color={LIGHT_STATUS[showDetail.status]?.color} bg={LIGHT_STATUS[showDetail.status]?.bg}>{LIGHT_STATUS[showDetail.status]?.label}</Badge>
                            <Badge color={PRIORITY_CONFIG[showDetail.priority]?.color}>{PRIORITY_CONFIG[showDetail.priority]?.icon} {PRIORITY_CONFIG[showDetail.priority]?.label}</Badge>
                            {projects.find(p => p.id === showDetail.project) && <Badge color={projects.find(p => p.id === showDetail.project).color}>{projects.find(p => p.id === showDetail.project).name}</Badge>}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                            <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 8 }}>
                                <div style={{ color: "#94A3B8", fontSize: 11, marginBottom: 4 }}>Người thực hiện</div>
                                <div style={{ color: "#0F172A", fontSize: 13 }}>{members.find(m => m.id === showDetail.owner)?.avatar} {members.find(m => m.id === showDetail.owner)?.name || "—"}</div>
                            </div>
                            <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 8 }}>
                                <div style={{ color: "#94A3B8", fontSize: 11, marginBottom: 4 }}>Người giao</div>
                                <div style={{ color: "#0F172A", fontSize: 13 }}>{members.find(m => m.id === showDetail.assignedBy)?.avatar} {members.find(m => m.id === showDetail.assignedBy)?.name || "—"}</div>
                            </div>
                        </div>
                        {showDetail.deadline && <div style={{ color: "#64748B", fontSize: 12, marginBottom: 8 }}>Deadline: <span style={{ color: "#0F172A", fontWeight: 500 }}>{showDetail.deadline}</span></div>}
                        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                            {showDetail.status === "todo" && <Btn size="sm" color="#3B82F6" onClick={() => changeStatus(showDetail.id, "doing")}>▶ Bắt đầu làm</Btn>}
                            {showDetail.status === "doing" && <Btn size="sm" color="#A855F7" onClick={() => changeStatus(showDetail.id, "review")}>📋 Gửi Review</Btn>}
                            {showDetail.status === "doing" && <Btn size="sm" color="#10B981" onClick={() => changeStatus(showDetail.id, "done")}>✅ Hoàn thành</Btn>}
                            {showDetail.status === "review" && <Btn size="sm" color="#10B981" onClick={() => changeStatus(showDetail.id, "done")}>✅ Approve</Btn>}
                            {showDetail.status === "review" && <Btn size="sm" color="#EF4444" variant="outline" onClick={() => changeStatus(showDetail.id, "doing")}>↩ Cần sửa</Btn>}
                            {(showDetail.status === "doing" || showDetail.status === "todo") && <Btn size="sm" color="#EF4444" onClick={() => changeStatus(showDetail.id, "blocked")}>🔴 Blocked</Btn>}
                            {showDetail.status === "blocked" && <Btn size="sm" color="#3B82F6" onClick={() => changeStatus(showDetail.id, "doing")}>🔓 Unblock</Btn>}
                        </div>
                    </div>
                    <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                        <h4 style={{ color: "#0F172A", margin: "0 0 12px", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                            <MessageCircle size={14} color="#3B82F6" /> Trao đổi ({showDetail.comments?.length || 0})
                        </h4>
                        <div style={{ maxHeight: 250, overflow: "auto", marginBottom: 12 }}>
                            {(showDetail.comments || []).map((c, i) => {
                                const author = members.find(m => m.id === c.author);
                                return (
                                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                                        <span style={{ fontSize: 18 }}>{author?.avatar || "👤"}</span>
                                        <div style={{ flex: 1, background: "#F8FAFC", padding: "8px 12px", borderRadius: 8 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                <span style={{ color: "#0F172A", fontSize: 12, fontWeight: 600 }}>{author?.name || c.author}</span>
                                                <span style={{ color: "#94A3B8", fontSize: 10 }}>{c.ts ? timeAgo(c.ts) : ""}</span>
                                            </div>
                                            <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.5 }}>{c.text}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {(!showDetail.comments || showDetail.comments.length === 0) && (
                                <div style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", padding: 20 }}>Chưa có trao đổi — hãy bắt đầu thảo luận!</div>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Viết comment, hỏi, trao đổi..."
                                onKeyDown={e => e.key === "Enter" && addComment(showDetail.id)}
                                style={{ flex: 1, background: "#F8FAFC", color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }} />
                            <Btn onClick={() => addComment(showDetail.id)} color="#3B82F6"><Send size={14} /></Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
