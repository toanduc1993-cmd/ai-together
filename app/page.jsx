"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { FolderKanban, ArrowRight, TrendingUp, Clock, Activity, CheckCircle2, AlertTriangle, Users, Package, Target, BarChart3 } from "lucide-react";
import Link from "next/link";
import TempoOverview from "@/components/TempoWidget";

export default function DashboardPage() {
    const { currentUser, unreadCount } = useUser();
    const [projects, setProjects] = useState([]);
    const [allModules, setAllModules] = useState([]);
    const [activities, setActivities] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.id) return;
        const load = async () => {
            try {
                // Fetch ALL data in parallel — 4 concurrent requests instead of 12+ sequential
                const [pRes, mRes, aRes, uRes] = await Promise.all([
                    fetch("/api/projects").then(r => r.json()),
                    fetch("/api/modules").then(r => r.json()),   // ALL modules in 1 call
                    fetch("/api/activities?limit=50").then(r => r.json()),
                    fetch("/api/users").then(r => r.json()),
                ]);
                const prjs = Array.isArray(pRes) ? pRes : [];
                setProjects(prjs);
                setActivities(Array.isArray(aRes) ? aRes : []);
                setUsers(Array.isArray(uRes) ? uRes : []);

                // Attach project info to each module using the project join
                const mods = (Array.isArray(mRes) ? mRes : []).map(m => ({
                    ...m,
                    _project: m.project || prjs.find(p => p.id === m.project_id),
                }));
                setAllModules(mods);
            } catch { }
            setLoading(false);
        };
        load();
    }, [currentUser?.id]);

    if (loading) return <Skeleton />;

    // ===== COMPUTED METRICS =====
    const now = new Date();
    const totalModules = allModules.length;
    const doneModules = allModules.filter(m => m.status === "done");
    const inProgressModules = allModules.filter(m => m.status === "in_progress");
    const inReviewModules = allModules.filter(m => m.status === "in_review");
    const changesReqModules = allModules.filter(m => m.status === "changes_requested");
    const plannedModules = allModules.filter(m => m.status === "planned");
    const overdueModules = allModules.filter(m => m.deadline && new Date(m.deadline) < now && m.status !== "done");
    const completionRate = totalModules > 0 ? Math.round((doneModules.length / totalModules) * 100) : 0;
    const onTimeModules = doneModules.filter(m => !m.deadline || new Date(m.updated_at || m.created_at) <= new Date(m.deadline));
    const onTimeRate = doneModules.length > 0 ? Math.round((onTimeModules.length / doneModules.length) * 100) : 0;

    // Per-user metrics
    const userMetrics = users.map(u => {
        const assigned = allModules.filter(m => m.assigned_to === u.id);
        const done = assigned.filter(m => m.status === "done");
        const inProg = assigned.filter(m => m.status === "in_progress");
        const review = assigned.filter(m => m.status === "in_review");
        const changesReq = assigned.filter(m => m.status === "changes_requested");
        const overdue = assigned.filter(m => m.deadline && new Date(m.deadline) < now && m.status !== "done");
        const rate = assigned.length > 0 ? Math.round((done.length / assigned.length) * 100) : 0;
        return { user: u, total: assigned.length, done: done.length, inProgress: inProg.length, inReview: review.length, changesReq: changesReq.length, overdue: overdue.length, rate };
    }).filter(u => u.total > 0).sort((a, b) => b.rate - a.rate || b.done - a.done);

    // Status distribution for chart
    const statusDist = [
        { key: "planned", label: "Kế hoạch", count: allModules.filter(m => m.status === "planned").length, color: "#6366F1" },
        { key: "in_progress", label: "Đang thực hiện", count: inProgressModules.length, color: "#F59E0B" },
        { key: "in_review", label: "Chờ duyệt", count: inReviewModules.length, color: "#8B5CF6" },
        { key: "changes_requested", label: "Yêu cầu sửa", count: changesReqModules.length, color: "#EF4444" },
        { key: "done", label: "Hoàn thành", count: doneModules.length, color: "#10B981" },
    ];
    const maxCount = Math.max(...statusDist.map(s => s.count), 1);

    // Activities grouped by user for Tempo
    const activitiesByUser = {};
    activities.forEach(a => {
        if (!a.user_id) return;
        if (!activitiesByUser[a.user_id]) activitiesByUser[a.user_id] = [];
        activitiesByUser[a.user_id].push(a);
    });

    return (
        <div className="fade-in">
            {/* Hero */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5, lineHeight: 1.2 }}>
                    Xin chào, {currentUser?.display_name} 👋
                </h1>
                <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginTop: 6 }}>
                    {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — Dashboard theo dõi hiệu suất team
                </p>
            </div>

            {/* ===== KEY METRICS ROW ===== */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
                <MetricCard icon={<Package size={20} />} label="Tổng" value={totalModules} color="#6366F1" />
                <MetricCard icon={<Target size={20} />} label="Kế hoạch" value={plannedModules.length} color="#6366F1" />
                <MetricCard icon={<Activity size={20} />} label="Đang làm" value={inProgressModules.length} color="#F59E0B" />
                <MetricCard icon={<Clock size={20} />} label="Chờ duyệt" value={inReviewModules.length} color="#8B5CF6" />
                <MetricCard icon={<AlertTriangle size={20} />} label="Cần sửa" value={changesReqModules.length} color="#EF4444" alert={changesReqModules.length > 0} />
                <MetricCard icon={<CheckCircle2 size={20} />} label="Hoàn thành" value={doneModules.length} color="#10B981" sub={`${completionRate}%`} />
            </div>

            {/* ===== TEMPO OVERVIEW ===== */}
            <TempoOverview users={users} activitiesByUser={activitiesByUser} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="grid-2">
                {/* ===== LEFT COLUMN ===== */}
                <div>
                    {/* Team Performance Table */}
                    <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)", padding: "20px 22px", marginBottom: 16, boxShadow: "var(--shadow-xs)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                                <Users size={18} color="var(--accent)" /> Team Performance
                            </h3>
                        </div>
                        {userMetrics.length === 0 ? (
                            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Chưa có dữ liệu</div>
                        ) : (
                            <div>
                                {/* Table header */}
                                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 1.2fr", gap: 4, padding: "8px 0", borderBottom: "1px solid var(--border-primary)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                    <span>Thành viên</span><span style={{ textAlign: "center" }}>Giao</span><span style={{ textAlign: "center" }}>Xong</span><span style={{ textAlign: "center" }}>Đang</span><span style={{ textAlign: "center" }}>Trễ</span><span style={{ textAlign: "center" }}>Sửa</span><span>Tiến độ</span>
                                </div>
                                {userMetrics.map((um, i) => (
                                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 1.2fr", gap: 4, padding: "10px 0", borderBottom: i < userMetrics.length - 1 ? "1px solid var(--border-primary)" : "none", alignItems: "center", fontSize: 13 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 18 }}>{um.user.avatar || "👤"}</span>
                                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{um.user.display_name}</span>
                                        </div>
                                        <span style={{ textAlign: "center", fontWeight: 600 }}>{um.total}</span>
                                        <span style={{ textAlign: "center", fontWeight: 700, color: "var(--green)" }}>{um.done}</span>
                                        <span style={{ textAlign: "center", fontWeight: 600, color: "#F59E0B" }}>{um.inProgress}</span>
                                        <span style={{ textAlign: "center", fontWeight: 700, color: um.overdue > 0 ? "#EF4444" : "var(--text-muted)" }}>{um.overdue}</span>
                                        <span style={{ textAlign: "center", fontWeight: 600, color: um.changesReq > 0 ? "#EF4444" : "var(--text-muted)" }}>{um.changesReq}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{ flex: 1, height: 8, background: "var(--bg-tertiary)", borderRadius: 4, overflow: "hidden" }}>
                                                <div style={{ height: "100%", width: `${um.rate}%`, background: um.rate >= 80 ? "#10B981" : um.rate >= 50 ? "#F59E0B" : "#EF4444", borderRadius: 4, transition: "width 0.6s" }} />
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: um.rate >= 80 ? "#10B981" : um.rate >= 50 ? "#F59E0B" : "#EF4444", minWidth: 32 }}>{um.rate}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Project Progress */}
                    <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)", padding: "20px 22px", marginBottom: 16, boxShadow: "var(--shadow-xs)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                                <FolderKanban size={18} color="var(--green)" /> Tiến độ dự án
                            </h3>
                            <Link href="/projects" style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>Xem tất cả <ArrowRight size={13} /></Link>
                        </div>
                        {projects.map(p => {
                            const pMods = allModules.filter(m => m._project?.id === p.id);
                            const pDone = pMods.filter(m => m.status === "done").length;
                            const pPct = pMods.length > 0 ? Math.round((pDone / pMods.length) * 100) : 0;
                            return (
                                <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none", display: "block", padding: "12px 0", borderBottom: "1px solid var(--border-primary)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{p.title}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: pPct === 100 ? "#10B981" : "var(--text-tertiary)" }}>{pPct}%</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ flex: 1, height: 8, background: "var(--bg-tertiary)", borderRadius: 4, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${pPct}%`, background: pPct === 100 ? "#10B981" : "var(--accent)", borderRadius: 4, transition: "width 0.6s" }} />
                                        </div>
                                        <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{pDone}/{pMods.length} modules</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* ===== RIGHT COLUMN ===== */}
                <div>
                    {/* Module Status Distribution */}
                    <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)", padding: "20px 22px", marginBottom: 16, boxShadow: "var(--shadow-xs)" }}>
                        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                            <BarChart3 size={18} color="#8B5CF6" /> Phân bổ trạng thái Module
                        </h3>
                        {statusDist.map(s => (
                            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                                <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>{s.label}</span>
                                <div style={{ width: 120, height: 8, background: "var(--bg-tertiary)", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${(s.count / maxCount) * 100}%`, background: s.color, borderRadius: 4, transition: "width 0.6s" }} />
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 700, color: s.color, minWidth: 24, textAlign: "right" }}>{s.count}</span>
                            </div>
                        ))}
                    </div>

                    {/* Overdue Alert */}
                    {overdueModules.length > 0 && (
                        <div style={{ background: "#EF444410", borderRadius: "var(--radius-lg)", border: "1px solid #EF444430", padding: "18px 22px", marginBottom: 16 }}>
                            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#EF4444", display: "flex", alignItems: "center", gap: 8 }}>
                                <AlertTriangle size={18} /> ⚠️ Modules quá hạn ({overdueModules.length})
                            </h3>
                            {overdueModules.slice(0, 5).map(m => (
                                <Link key={m.id} href={`/projects/${m._project?.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #EF444418", textDecoration: "none" }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{m.title}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m._project?.title} — {m.assignee?.display_name || "—"}</div>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#EF4444" }}>📅 {new Date(m.deadline).toLocaleDateString("vi-VN")}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Recent Activity */}
                    <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)", padding: "20px 22px", boxShadow: "var(--shadow-xs)" }}>
                        <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                            <Activity size={18} color="var(--accent)" /> Hoạt động gần đây
                        </h3>
                        {(() => {
                            const workActivities = activities.filter(a => !['chat_message', 'comment'].includes(a.action_type));
                            return workActivities.length === 0 ? (
                                <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Chưa có hoạt động</div>
                            ) : workActivities.slice(0, 8).map(a => (
                                <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-primary)" }}>
                                    <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>{a.user?.avatar || "🔵"}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>
                                            <strong>{a.user?.display_name}</strong>{" "}
                                            <span style={{ color: "var(--text-tertiary)" }}>{a.detail || a.action_type}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{timeAgo(a.created_at)}</div>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, color, sub, alert }) {
    return (
        <div className="glass-card" style={{
            padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
            borderColor: alert ? "#EF444440" : undefined,
            background: alert ? "#EF444408" : undefined,
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${color}15`, color,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
            }}>{icon}</div>
            <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</span>
                    {sub && <span style={{ fontSize: 13, fontWeight: 600, color }}>{sub}</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500, marginTop: 3 }}>{label}</div>
            </div>
        </div>
    );
}

function Skeleton() {
    return <div style={{ padding: 40, textAlign: "center" }}><div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-tertiary)", margin: "0 auto 12px", animation: "pulse-soft 1.5s infinite" }} /><div style={{ color: "var(--text-muted)", fontSize: 13 }}>Đang tải...</div></div>;
}
function timeAgo(d) { const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 60) return "Vừa xong"; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`; }
