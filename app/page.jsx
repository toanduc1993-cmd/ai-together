"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { FolderKanban, CheckCircle2, Clock, AlertTriangle, Zap, TrendingUp, ListChecks, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const { currentUser, isChairman, isProjectLead } = useUser();
    const [projects, setProjects] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/projects").then(r => r.json()),
            fetch("/api/activities?limit=15").then(r => r.json()),
        ]).then(([p, a]) => {
            setProjects(Array.isArray(p) ? p : []);
            setActivities(Array.isArray(a) ? a : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Đang tải...</div>;

    const activeProjects = projects.filter(p => p.status === "active");
    const ROLE_LABELS = { chairman: "Chairman", project_lead: "Project Lead", developer: "Developer" };
    const greeting = `Xin chào, ${currentUser?.display_name || "bạn"} 👋`;

    const ACTION_ICONS = {
        project_created: "🚀", module_created: "📦", module_status_changed: "🔄",
        checklist_created: "📋", checklist_status_changed: "✅",
        deliverable_submitted: "📤", review_submitted: "⭐",
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ color: "#0F172A", fontSize: 22, fontWeight: 700, margin: 0 }}>{greeting}</h1>
                <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 13 }}>
                    {ROLE_LABELS[currentUser?.role]} — Dashboard tổng quan
                </p>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
                <StatCard icon={<FolderKanban size={18} />} label="Projects" value={projects.length} color="#8B5CF6" />
                <StatCard icon={<CheckCircle2 size={18} />} label="Active" value={activeProjects.length} color="#10B981" />
                <StatCard icon={<Zap size={18} />} label="Activities" value={activities.length} color="#F59E0B" sub="gần đây" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Projects list */}
                <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 6 }}>
                            <FolderKanban size={16} color="#8B5CF6" /> Projects
                        </h3>
                        <Link href="/projects" style={{ fontSize: 12, color: "#3B82F6", textDecoration: "none" }}>Xem tất cả →</Link>
                    </div>
                    {projects.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 24, color: "#94A3B8", fontSize: 13 }}>
                            {isChairman ? "Chưa có project nào. Tạo project đầu tiên!" : "Chưa có project nào."}
                        </div>
                    ) : projects.slice(0, 5).map(p => {
                        const STATUS_COLORS = { draft: "#94A3B8", active: "#10B981", completed: "#3B82F6", archived: "#64748B" };
                        return (
                            <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                                <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #F1F5F9", marginBottom: 6, transition: "all 0.2s", cursor: "pointer" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{p.title}</div>
                                            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                                                Lead: {p.lead?.display_name || "—"} • {p.deadline ? `Deadline: ${new Date(p.deadline).toLocaleDateString("vi-VN")}` : "Không có deadline"}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLORS[p.status], background: `${STATUS_COLORS[p.status]}15`, padding: "2px 8px", borderRadius: 10, textTransform: "uppercase" }}>{p.status}</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Activity feed */}
                <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 16 }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 6 }}>
                        <TrendingUp size={16} color="#F59E0B" /> Hoạt động gần đây
                    </h3>
                    {activities.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 24, color: "#94A3B8", fontSize: 13 }}>Chưa có hoạt động</div>
                    ) : activities.slice(0, 10).map(a => (
                        <div key={a.id} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid #F8FAFC" }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{ACTION_ICONS[a.action_type] || "📌"}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: "#0F172A" }}>
                                    <strong>{a.user?.display_name || "—"}</strong> {a.detail}
                                </div>
                                <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{timeAgo(a.created_at)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color, sub }) {
    return (
        <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
            <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A" }}>{value}</div>
                <div style={{ fontSize: 11, color: "#64748B" }}>{label} {sub && <span style={{ color: "#94A3B8" }}>{sub}</span>}</div>
            </div>
        </div>
    );
}

function timeAgo(ts) {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    return `${days} ngày trước`;
}
