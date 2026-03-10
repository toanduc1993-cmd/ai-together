"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import Link from "next/link";
import { Package, Clock, AlertTriangle, CheckCircle2, ChevronRight, Calendar, ArrowUpRight } from "lucide-react";

const STATUS_CFG = {
    planned: { color: "#6366F1", label: "Kế hoạch", icon: "📋", bg: "#6366F118" },
    in_progress: { color: "#F59E0B", label: "Đang thực hiện", icon: "🔨", bg: "#F59E0B18" },
    in_review: { color: "#8B5CF6", label: "Chờ duyệt", icon: "👀", bg: "#8B5CF618" },
    review: { color: "#8B5CF6", label: "Review", icon: "👀", bg: "#8B5CF618" },
    submitted: { color: "#3B82F6", label: "Đã nộp", icon: "📤", bg: "#3B82F618" },
    approved: { color: "#10B981", label: "Phê duyệt", icon: "✅", bg: "#10B98118" },
    changes_requested: { color: "#EF4444", label: "Cần sửa", icon: "🔄", bg: "#EF444418" },
    done: { color: "#10B981", label: "Hoàn thành", icon: "✅", bg: "#10B98118" },
};

const PRIORITY_CFG = {
    low: { color: "#10B981", label: "Low" },
    medium: { color: "#F59E0B", label: "Medium" },
    high: { color: "#EF4444", label: "High" },
    critical: { color: "#DC2626", label: "Critical" },
};

export default function MyTasksPage() {
    const { currentUser } = useUser();
    const [modules, setModules] = useState([]);
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // all, in_progress, planned, done

    useEffect(() => {
        if (!currentUser?.id) return;
        loadMyTasks();
    }, [currentUser?.id]);

    const loadMyTasks = async () => {
        setLoading(true);
        try {
            // 1 consolidated call instead of 25-40+ sequential calls
            const res = await fetch(`/api/dashboard?user_id=${currentUser.id}`);
            const data = await res.json();
            const projects = Array.isArray(data.projects) ? data.projects : [];
            const allMods = Array.isArray(data.modules) ? data.modules : [];

            const myModules = [];
            for (const mod of allMods) {
                const proj = mod.project || projects.find(p => p.id === mod.project_id);
                // Modules assigned to me
                if (mod.assigned_to === currentUser.id) {
                    myModules.push({ ...mod, _project: proj });
                }
                // Modules needing my review (I'm chairman/lead)
                else if (proj && (proj.chairman_id === currentUser.id || proj.lead_id === currentUser.id) &&
                    mod.status === "in_review") {
                    myModules.push({ ...mod, _project: proj, _needsReview: true });
                }
            }
            setModules(myModules);

            // Fetch checklists in parallel (not sequentially!)
            const myAssigned = myModules.filter(m => m.assigned_to === currentUser.id);
            if (myAssigned.length > 0) {
                const checklistResults = await Promise.all(
                    myAssigned.map(mod =>
                        fetch(`/api/checklist?module_id=${mod.id}`)
                            .then(r => r.json())
                            .then(items => {
                                const myItems = (Array.isArray(items) ? items : [])
                                    .filter(t => t.assigned_to === currentUser.id);
                                myItems.forEach(t => {
                                    t._module = mod;
                                    t._project = mod._project;
                                });
                                return myItems;
                            })
                            .catch(() => [])
                    )
                );
                setChecklists(checklistResults.flat());
            } else {
                setChecklists([]);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const filtered = filter === "all" ? modules : filter === "in_review" ? modules.filter(m => m.status === "in_review") : modules.filter(m => m.status === filter);
    const now = new Date();
    const overdue = modules.filter(m => m.deadline && new Date(m.deadline) < now && m.status !== "done");
    const inProgress = modules.filter(m => m.status === "in_progress");
    const planned = modules.filter(m => m.status === "planned");
    const done = modules.filter(m => m.status === "done");
    const inReview = modules.filter(m => m.status === "in_review");

    if (loading) return <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)", fontSize: 16 }}>⏳ Đang tải công việc...</div>;

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>
                    📋 Công việc của tôi
                </h2>
                <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
                    Tổng hợp các module và task được giao cho bạn
                </p>
            </div>

            {/* Stats cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                <StatCard icon={<Package size={20} />} label="Tổng" value={modules.length} color="#6366F1" />
                <StatCard icon={<Clock size={20} />} label="Đang thực hiện" value={inProgress.length} color="#F59E0B" />
                <StatCard icon={<AlertTriangle size={20} />} label="Quá hạn" value={overdue.length} color="#EF4444" />
                <StatCard icon={<CheckCircle2 size={20} />} label="Hoàn thành" value={done.length} color="#10B981" />
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {[
                    { key: "all", label: "Tất cả", count: modules.length },
                    { key: "planned", label: "Kế hoạch", count: planned.length },
                    { key: "in_progress", label: "Đang thực hiện", count: inProgress.length },
                    { key: "in_review", label: "Chờ duyệt", count: inReview.length },
                    { key: "done", label: "Hoàn thành", count: done.length },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                        padding: "8px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
                        border: filter === tab.key ? "1px solid var(--accent)" : "1px solid var(--border-primary)",
                        background: filter === tab.key ? "var(--accent-bg)" : "var(--bg-elevated)",
                        color: filter === tab.key ? "var(--accent)" : "var(--text-tertiary)",
                        transition: "all 0.2s",
                    }}>
                        {tab.label} <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>({tab.count})</span>
                    </button>
                ))}
            </div>

            {/* Module list */}
            {filtered.length === 0 ? (
                <div className="glass-card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)", fontSize: 15 }}>
                    {filter === "all" ? "Bạn chưa được giao module nào." : `Không có module ở trạng thái "${filter}".`}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filtered.map(mod => {
                        const sc = STATUS_CFG[mod.status] || STATUS_CFG.planned;
                        const pc = PRIORITY_CFG[mod.priority] || PRIORITY_CFG.medium;
                        const isOverdue = mod.deadline && new Date(mod.deadline) < now && mod.status !== "done";
                        return (
                            <Link key={mod.id} href={`/projects/${mod._project?.id}`} style={{ textDecoration: "none" }}>
                                <div className="glass-card" style={{
                                    padding: "16px 20px", cursor: "pointer",
                                    borderLeft: `4px solid ${sc.color}`,
                                    transition: "transform 0.15s, box-shadow 0.15s",
                                }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = ""; }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                                <span style={{ fontSize: 18 }}>{sc.icon}</span>
                                                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{mod.title}</span>
                                                <span style={{
                                                    fontSize: 12, fontWeight: 600, color: sc.color, background: sc.bg,
                                                    padding: "2px 10px", borderRadius: 8,
                                                }}>{sc.label}</span>
                                                <span style={{
                                                    fontSize: 12, fontWeight: 600, color: pc.color, background: `${pc.color}18`,
                                                    padding: "2px 10px", borderRadius: 8,
                                                }}>{pc.label}</span>
                                                {isOverdue && (
                                                    <span style={{
                                                        fontSize: 12, fontWeight: 700, color: "#EF4444", background: "#EF444418",
                                                        padding: "2px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4,
                                                    }}>
                                                        <AlertTriangle size={12} /> Quá hạn
                                                    </span>
                                                )}
                                                {mod._needsReview && (
                                                    <span style={{
                                                        fontSize: 12, fontWeight: 700, color: "#8B5CF6", background: "#8B5CF618",
                                                        padding: "2px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4,
                                                    }}>
                                                        👀 Cần duyệt
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: "var(--text-muted)" }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <ArrowUpRight size={13} /> {mod._project?.title || "—"}
                                                </span>
                                                {mod.deadline && (
                                                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: isOverdue ? "#EF4444" : "var(--text-muted)" }}>
                                                        <Calendar size={13} /> {new Date(mod.deadline).toLocaleDateString("vi-VN")}
                                                    </span>
                                                )}
                                                {mod.description && (
                                                    <span style={{ opacity: 0.7 }}>{mod.description.slice(0, 60)}{mod.description.length > 60 ? "..." : ""}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{ width: 80, display: "flex", alignItems: "center", gap: 6 }}>
                                                <div style={{ flex: 1, height: 6, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                                                    <div style={{ height: "100%", width: `${mod.progress_pct}%`, background: mod.progress_pct === 100 ? "#10B981" : "#6366F1", borderRadius: 3, transition: "width 0.3s" }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>{mod.progress_pct}%</span>
                                            </div>
                                            <ChevronRight size={18} color="var(--text-muted)" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Checklist tasks section */}
            {checklists.length > 0 && (
                <div style={{ marginTop: 32 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
                        ✅ Các task được giao ({checklists.length})
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {checklists.map(task => {
                            const isDone = task.status === "done";
                            return (
                                <Link key={task.id} href={`/projects/${task._project?.id}`} style={{ textDecoration: "none" }}>
                                    <div className="glass-card" style={{
                                        padding: "12px 18px", display: "flex", alignItems: "center", gap: 12,
                                        opacity: isDone ? 0.6 : 1, cursor: "pointer",
                                        transition: "transform 0.15s",
                                    }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                                        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                                        <span style={{ fontSize: 16 }}>{isDone ? "✅" : "⬜"}</span>
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", textDecoration: isDone ? "line-through" : "none" }}>
                                                {task.title}
                                            </span>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                                {task._project?.title} → {task._module?.title}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: 12, fontWeight: 600,
                                            color: isDone ? "#10B981" : task.status === "in_progress" ? "#F59E0B" : "#6366F1",
                                            background: isDone ? "#10B98118" : task.status === "in_progress" ? "#F59E0B18" : "#6366F118",
                                            padding: "3px 10px", borderRadius: 8,
                                        }}>
                                            {isDone ? "Xong" : task.status === "in_progress" ? "Đang làm" : "Todo"}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="glass-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${color}18`, color,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>{icon}</div>
            <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
            </div>
        </div>
    );
}
