"use client";
import { useState, useEffect, useMemo } from "react";
import { useUser } from "@/lib/UserContext";
import { Plus, Clock, Search, LayoutGrid, List, Users, Package, Calendar, ArrowRight, FolderOpen } from "lucide-react";
import Link from "next/link";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";

const STATUS_MAP = {
    active: { bg: "var(--green-bg)", color: "var(--green)", dot: "#22c55e", t: "Active" },
    completed: { bg: "var(--blue-bg)", color: "var(--blue)", dot: "#3b82f6", t: "Done" },
    planning: { bg: "var(--amber-bg)", color: "var(--amber)", dot: "#f59e0b", t: "Planning" },
    draft: { bg: "var(--bg-tertiary)", color: "var(--text-muted)", dot: "#9ca3af", t: "Draft" },
};
const FILTER_TABS = ["all", "active", "draft", "planning", "completed"];

export default function ProjectsPage() {
    const { currentUser, isChairman } = useUser();
    const [projects, setProjects] = useState([]);
    const [modules, setModules] = useState([]);
    const [users, setUsers] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", lead_id: "", deadline: "" });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [viewMode, setViewMode] = useState("grid"); // grid | list

    useEffect(() => {
        Promise.all([
            fetch("/api/projects").then(r => r.json()),
            fetch("/api/users").then(r => r.json()),
            fetch("/api/modules").then(r => r.json()),
        ]).then(([p, u, m]) => {
            setProjects(Array.isArray(p) ? p : []);
            setUsers(Array.isArray(u) ? u : []);
            setModules(Array.isArray(m) ? m : []);
            setLoading(false);
        });
    }, []);

    // Compute per-project stats
    const projectStats = useMemo(() => {
        const stats = {};
        for (const p of projects) {
            const pModules = modules.filter(m => m.project_id === p.id);
            const done = pModules.filter(m => m.status === "done" || m.status === "completed").length;
            const total = pModules.length;
            // Unique assignees
            const memberSet = new Set();
            pModules.forEach(m => {
                if (m.assigned_to) memberSet.add(m.assigned_to);
                (m.assignees || []).forEach(a => { if (a?.id) memberSet.add(a.id); });
            });
            if (p.chairman_id) memberSet.add(p.chairman_id);
            if (p.lead_id) memberSet.add(p.lead_id);

            stats[p.id] = {
                moduleCount: total,
                doneCount: done,
                progress: total > 0 ? Math.round((done / total) * 100) : 0,
                memberCount: memberSet.size,
                members: [...memberSet].slice(0, 4).map(uid => users.find(u => u.id === uid)).filter(Boolean),
            };
        }
        return stats;
    }, [projects, modules, users]);

    // Filtered + searched projects
    const filtered = useMemo(() => {
        let list = projects;
        if (filter !== "all") list = list.filter(p => (p.status || "draft") === filter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                p.title?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [projects, filter, search]);

    const create = async () => {
        if (!form.title.trim()) return;
        await fetch("/api/projects", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, chairman_id: currentUser.id }),
        });
        setShowCreate(false);
        setForm({ title: "", description: "", lead_id: "", deadline: "" });
        const p = await fetch("/api/projects").then(r => r.json());
        setProjects(Array.isArray(p) ? p : []);
    };

    const isDeadlineNear = (d) => {
        if (!d) return false;
        const diff = (new Date(d) - Date.now()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
    };
    const isOverdue = (d) => d && new Date(d) < new Date();

    if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Đang tải...</div>;

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3, margin: 0 }}>Projects</h1>
                    <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginTop: 4 }}>{filtered.length} / {projects.length} dự án</p>
                </div>
                {isChairman && (
                    <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Plus size={15} /> Tạo Project
                    </button>
                )}
            </div>

            {/* Search + Filter + View Toggle */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
                {/* Search */}
                <div style={{
                    flex: "1 1 220px", maxWidth: 320, position: "relative",
                }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm dự án..."
                        style={{
                            width: "100%", padding: "9px 12px 9px 36px", borderRadius: 10,
                            border: "1px solid var(--border-primary)", background: "var(--bg-tertiary)",
                            color: "var(--text-primary)", fontSize: 13, outline: "none",
                            boxSizing: "border-box",
                        }}
                    />
                </div>

                {/* Filter tabs */}
                <div style={{ display: "flex", gap: 4 }}>
                    {FILTER_TABS.map(tab => {
                        const active = filter === tab;
                        const count = tab === "all" ? projects.length : projects.filter(p => (p.status || "draft") === tab).length;
                        return (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                style={{
                                    padding: "6px 14px", borderRadius: 20, border: "none",
                                    background: active ? "var(--accent)" : "var(--bg-tertiary)",
                                    color: active ? "#fff" : "var(--text-secondary)",
                                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                {tab === "all" ? "Tất cả" : (STATUS_MAP[tab]?.t || tab)} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                            </button>
                        );
                    })}
                </div>

                {/* View toggle */}
                <div style={{ display: "flex", gap: 2, background: "var(--bg-tertiary)", borderRadius: 8, padding: 2, marginLeft: "auto" }}>
                    <button onClick={() => setViewMode("grid")} style={{
                        padding: "6px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                        background: viewMode === "grid" ? "var(--accent)" : "transparent",
                        color: viewMode === "grid" ? "#fff" : "var(--text-muted)",
                        display: "flex", transition: "all 0.15s",
                    }}><LayoutGrid size={15} /></button>
                    <button onClick={() => setViewMode("list")} style={{
                        padding: "6px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                        background: viewMode === "list" ? "var(--accent)" : "transparent",
                        color: viewMode === "list" ? "#fff" : "var(--text-muted)",
                        display: "flex", transition: "all 0.15s",
                    }}><List size={15} /></button>
                </div>
            </div>

            {/* Project list */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <FolderOpen size={24} color="var(--text-muted)" />
                    </div>
                    <div style={{ color: "var(--text-tertiary)", fontSize: 14, fontWeight: 500 }}>
                        {search ? "Không tìm thấy dự án nào" : "Chưa có project nào"}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                        {search ? "Thử từ khóa khác" : 'Nhấn "Tạo Project" để bắt đầu'}
                    </div>
                </div>
            ) : viewMode === "grid" ? (
                /* ===== GRID VIEW — Style B ===== */
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                    {filtered.map((p, i) => {
                        const s = STATUS_MAP[p.status] || STATUS_MAP.draft;
                        const stats = projectStats[p.id] || {};
                        const lead = p.lead || null;
                        return (
                            <Link key={p.id} href={`/projects/${p.id}`} className="fade-in-up" style={{
                                textDecoration: "none", animationDelay: `${i * 40}ms`, animationFillMode: "backwards",
                                display: "block", borderRadius: 14, overflow: "hidden",
                                border: "1px solid var(--border-primary)", background: "var(--bg-elevated)",
                                transition: "all 0.25s ease",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                            }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = "translateY(-3px)";
                                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
                                    e.currentTarget.style.borderColor = s.dot;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                                    e.currentTarget.style.borderColor = "var(--border-primary)";
                                }}
                            >
                                {/* Top gradient strip */}
                                <div style={{
                                    height: 4,
                                    background: `linear-gradient(90deg, ${s.dot}, ${s.dot}88)`,
                                }} />

                                <div style={{ padding: "14px 16px" }}>
                                    {/* Title */}
                                    <h3 style={{
                                        fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px",
                                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                    }}>{p.title}</h3>

                                    {/* Description — 1 line */}
                                    <p style={{
                                        fontSize: 11, color: "var(--text-muted)", margin: "0 0 12px",
                                        lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                    }}>{p.description || "Chưa có mô tả"}</p>

                                    {/* Progress bar */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--bg-tertiary)", overflow: "hidden" }}>
                                            <div style={{
                                                height: "100%", borderRadius: 2,
                                                width: `${stats.progress || 0}%`,
                                                background: stats.progress >= 100 ? "var(--green)" : `linear-gradient(90deg, ${s.dot}, ${s.dot}88)`,
                                                transition: "width 0.6s ease",
                                            }} />
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: s.color, minWidth: 28, textAlign: "right" }}>
                                            {stats.progress || 0}%
                                        </span>
                                    </div>

                                    {/* Bottom row: Lead + Status badge */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        {/* Project Lead */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                            <div style={{
                                                width: 22, height: 22, borderRadius: 7,
                                                background: "var(--gradient-brand)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 11, flexShrink: 0,
                                            }}>{lead?.avatar || "👤"}</div>
                                            <span style={{
                                                fontSize: 11, color: "var(--text-secondary)", fontWeight: 500,
                                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                            }}>{lead?.display_name || "Chưa assign"}</span>
                                        </div>

                                        {/* Status badge */}
                                        <span style={{
                                            fontSize: 10, fontWeight: 600, padding: "2px 10px", borderRadius: 12, flexShrink: 0,
                                            background: s.bg, color: s.color,
                                        }}>{s.t}</span>
                                    </div>

                                    {/* Deadline if exists */}
                                    {p.deadline && (
                                        <div style={{
                                            marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-primary)",
                                            display: "flex", alignItems: "center", gap: 4,
                                            fontSize: 10, fontWeight: 500,
                                            color: isOverdue(p.deadline) ? "var(--red)" : isDeadlineNear(p.deadline) ? "var(--amber)" : "var(--text-muted)",
                                        }}>
                                            <Calendar size={10} />
                                            {new Date(p.deadline).toLocaleDateString("vi-VN")}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                /* ===== LIST VIEW ===== */
                <div style={{ borderRadius: 12, border: "1px solid var(--border-primary)", overflow: "hidden" }}>
                    {/* Table header */}
                    <div style={{
                        display: "grid", gridTemplateColumns: "2fr 1fr 120px 100px 80px",
                        padding: "10px 16px", background: "var(--bg-secondary)",
                        fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px",
                        borderBottom: "1px solid var(--border-primary)",
                    }}>
                        <span>Dự án</span>
                        <span>Lead</span>
                        <span>Tiến độ</span>
                        <span>Deadline</span>
                        <span style={{ textAlign: "right" }}>Status</span>
                    </div>
                    {filtered.map((p, i) => {
                        const s = STATUS_MAP[p.status] || STATUS_MAP.draft;
                        const stats = projectStats[p.id] || {};
                        const lead = p.lead || null;
                        return (
                            <Link key={p.id} href={`/projects/${p.id}`} className="fade-in-up" style={{
                                display: "grid", gridTemplateColumns: "2fr 1fr 120px 100px 80px",
                                padding: "12px 16px", textDecoration: "none",
                                borderBottom: "1px solid var(--border-primary)",
                                background: "var(--bg-elevated)", alignItems: "center",
                                transition: "background 0.15s",
                                animationDelay: `${i * 30}ms`, animationFillMode: "backwards",
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"}
                                onMouseLeave={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                            >
                                {/* Project info */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                    <div style={{
                                        width: 6, height: 28, borderRadius: 3, background: s.dot, flexShrink: 0,
                                    }} />
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
                                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                        }}>{p.title}</div>
                                        {p.description && (
                                            <div style={{
                                                fontSize: 11, color: "var(--text-muted)", marginTop: 2,
                                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                            }}>{p.description}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Lead */}
                                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: 7,
                                        background: "var(--gradient-brand)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 11, flexShrink: 0,
                                    }}>{lead?.avatar || "👤"}</div>
                                    <span style={{
                                        fontSize: 11, color: "var(--text-secondary)", fontWeight: 500,
                                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                    }}>{lead?.display_name || "—"}</span>
                                </div>

                                {/* Progress */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: "var(--bg-tertiary)", overflow: "hidden" }}>
                                        <div style={{
                                            height: "100%", borderRadius: 2,
                                            width: `${stats.progress || 0}%`,
                                            background: stats.progress >= 100 ? "var(--green)" : "var(--gradient-brand)",
                                        }} />
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", minWidth: 28, textAlign: "right" }}>
                                        {stats.progress || 0}%
                                    </span>
                                </div>

                                {/* Deadline */}
                                <span style={{
                                    fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", gap: 4,
                                    color: p.deadline ? (isOverdue(p.deadline) ? "var(--red)" : isDeadlineNear(p.deadline) ? "var(--amber)" : "var(--text-muted)") : "var(--text-muted)",
                                }}>
                                    {p.deadline ? (
                                        <><Calendar size={11} />{new Date(p.deadline).toLocaleDateString("vi-VN")}</>
                                    ) : "—"}
                                </span>

                                {/* Status */}
                                <div style={{ textAlign: "right" }}>
                                    <span style={{
                                        fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 12,
                                        background: s.bg, color: s.color,
                                    }}>{s.t}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Create modal */}
            {showCreate && (
                <Modal title="✨ Tạo Project mới" onClose={() => setShowCreate(false)}>
                    <Input label="Tên project" placeholder="Nhập tên..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    <Input label="Mô tả" placeholder="Mô tả ngắn..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    <Select label="Project Lead" value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })}>
                        <option value="">-- Chọn Lead --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.display_name} ({u.role})</option>)}
                    </Select>
                    <Input label="Deadline" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                    <button onClick={create} className="btn-primary" style={{ width: "100%", marginTop: 8 }}>Tạo Project</button>
                </Modal>
            )}
        </div>
    );
}
