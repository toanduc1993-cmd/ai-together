"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { fetchDashboard } from "@/lib/cache";
import { BarChart3, FolderKanban, Users, Clock, AlertTriangle, CheckCircle2, Target, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
    const { currentUser } = useUser();
    const [projects, setProjects] = useState([]);
    const [allModules, setAllModules] = useState([]);
    const [users, setUsers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState("all");

    useEffect(() => {
        const applyData = (data) => {
            const prjs = Array.isArray(data.projects) ? data.projects : [];
            setProjects(prjs);
            setUsers(Array.isArray(data.users) ? data.users : []);
            setActivities(Array.isArray(data.activities) ? data.activities : []);
            const mods = (Array.isArray(data.modules) ? data.modules : []).map(m => ({
                ...m, _project: m.project || prjs.find(p => p.id === m.project_id),
            }));
            setAllModules(mods);
            setLoading(false);
        };
        const load = async () => {
            const { cached, fresh } = await fetchDashboard();
            if (cached) applyData(cached);
            const freshData = await fresh;
            if (freshData) applyData(freshData);
        };
        load();
    }, []);

    if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Đang tải...</div>;

    const filteredModules = selectedProject === "all" ? allModules : allModules.filter(m => m._project?.id === selectedProject);
    const now = new Date();

    // ===== METRICS =====
    const total = filteredModules.length;
    const done = filteredModules.filter(m => m.status === "done").length;
    const inProgress = filteredModules.filter(m => m.status === "in_progress").length;
    const inReview = filteredModules.filter(m => m.status === "in_review").length;
    const overdue = filteredModules.filter(m => m.deadline && new Date(m.deadline) < now && m.status !== "done").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // ===== WORKLOAD BALANCE =====
    const workloadMap = {};
    filteredModules.forEach(m => {
        if (!m.assigned_to) return;
        if (!workloadMap[m.assigned_to]) workloadMap[m.assigned_to] = { total: 0, done: 0, inProgress: 0, overdue: 0, review: 0 };
        workloadMap[m.assigned_to].total++;
        if (m.status === "done") workloadMap[m.assigned_to].done++;
        if (m.status === "in_progress") workloadMap[m.assigned_to].inProgress++;
        if (m.status === "in_review") workloadMap[m.assigned_to].review++;
        if (m.deadline && new Date(m.deadline) < now && m.status !== "done") workloadMap[m.assigned_to].overdue++;
    });
    const workloadUsers = Object.entries(workloadMap).map(([uid, data]) => ({
        user: users.find(u => u.id === uid),
        ...data,
        rate: data.total > 0 ? Math.round((data.done / data.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
    const maxWorkload = Math.max(...workloadUsers.map(u => u.total), 1);

    // ===== PER-PROJECT STATUS =====
    const projectStats = projects.map(p => {
        const pMods = allModules.filter(m => m._project?.id === p.id);
        const pDone = pMods.filter(m => m.status === "done").length;
        const pOverdue = pMods.filter(m => m.deadline && new Date(m.deadline) < now && m.status !== "done").length;
        const pPct = pMods.length > 0 ? Math.round((pDone / pMods.length) * 100) : 0;
        return { project: p, total: pMods.length, done: pDone, overdue: pOverdue, pct: pPct };
    }).sort((a, b) => b.total - a.total);

    // ===== DEADLINE HEATMAP (next 14 days) =====
    const deadlineMap = {};
    filteredModules.forEach(m => {
        if (!m.deadline) return;
        const d = new Date(m.deadline).toISOString().split("T")[0];
        if (!deadlineMap[d]) deadlineMap[d] = { total: 0, done: 0 };
        deadlineMap[d].total++;
        if (m.status === "done") deadlineMap[d].done++;
    });
    const next14 = [];
    for (let i = -7; i < 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split("T")[0];
        next14.push({ date: d, key, label: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }), ...deadlineMap[key] || { total: 0, done: 0 } });
    }

    // ===== ACTIVITY TREND (7 days) =====
    const actByDay = {};
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit" });
        actByDay[key] = 0;
        last7.push({ key, label });
    }
    activities.forEach(a => {
        const key = new Date(a.created_at).toISOString().split("T")[0];
        if (actByDay[key] !== undefined) actByDay[key]++;
    });
    const actMax = Math.max(...last7.map(d => actByDay[d.key]), 1);

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>📊 Báo cáo chi tiết</h1>
                    <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginTop: 4 }}>Phân tích chi tiết theo dự án, nhân sự và deadline</p>
                </div>
                <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
                    background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-primary)",
                }}>
                    <option value="all">📁 Tất cả dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>📁 {p.title}</option>)}
                </select>
            </div>

            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 12, marginBottom: 24 }}>
                <KPI icon={<FolderKanban size={18} />} label="Tổng Modules" value={total} color="#6366F1" />
                <KPI icon={<CheckCircle2 size={18} />} label="Hoàn thành" value={`${done} (${completionRate}%)`} color="#10B981" />
                <KPI icon={<Clock size={18} />} label="Đang làm" value={inProgress} color="#F59E0B" />
                <KPI icon={<Target size={18} />} label="Chờ duyệt" value={inReview} color="#8B5CF6" />
                <KPI icon={<AlertTriangle size={18} />} label="Quá hạn" value={overdue} color="#EF4444" alert={overdue > 0} />
                <KPI icon={<Users size={18} />} label="Nhân sự" value={workloadUsers.length} color="#06B6D4" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="grid-2">
                {/* LEFT */}
                <div>
                    {/* Workload Balance */}
                    <Panel title="⚖️ Phân bổ công việc" sub="Cho biết ai đang overload hoặc rảnh">
                        {workloadUsers.length === 0 ? <Empty /> : workloadUsers.map((wu, i) => (
                            <div key={i} style={{ padding: "10px 0", borderBottom: i < workloadUsers.length - 1 ? "1px solid var(--border-primary)" : "none" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 18 }}>{wu.user?.avatar || "👤"}</span>
                                        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{wu.user?.display_name || "—"}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
                                        <Tag label={`${wu.done} xong`} color="#10B981" />
                                        <Tag label={`${wu.inProgress} đang`} color="#F59E0B" />
                                        {wu.overdue > 0 && <Tag label={`${wu.overdue} trễ`} color="#EF4444" />}
                                    </div>
                                </div>
                                {/* Stacked bar */}
                                <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "var(--bg-tertiary)" }}>
                                    {wu.done > 0 && <div style={{ width: `${(wu.done / maxWorkload) * 100}%`, background: "#10B981" }} title={`Xong: ${wu.done}`} />}
                                    {wu.inProgress > 0 && <div style={{ width: `${(wu.inProgress / maxWorkload) * 100}%`, background: "#F59E0B" }} title={`Đang: ${wu.inProgress}`} />}
                                    {wu.review > 0 && <div style={{ width: `${(wu.review / maxWorkload) * 100}%`, background: "#8B5CF6" }} title={`Duyệt: ${wu.review}`} />}
                                    {(wu.total - wu.done - wu.inProgress - wu.review) > 0 && <div style={{ width: `${((wu.total - wu.done - wu.inProgress - wu.review) / maxWorkload) * 100}%`, background: "#6366F140" }} title="Kế hoạch" />}
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                                    {wu.total} modules — hoàn thành {wu.rate}%
                                </div>
                            </div>
                        ))}
                        {/* Legend */}
                        <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 11, color: "var(--text-muted)" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "#10B981" }} /> Xong</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "#F59E0B" }} /> Đang</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "#8B5CF6" }} /> Duyệt</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "#6366F140" }} /> Kế hoạch</span>
                        </div>
                    </Panel>

                    {/* Project Comparison */}
                    <Panel title="📁 So sánh dự án" sub="Tiến độ từng project">
                        {projectStats.map((ps, i) => (
                            <Link key={ps.project.id} href={`/projects/${ps.project.id}`} style={{ textDecoration: "none", display: "block", padding: "10px 0", borderBottom: i < projectStats.length - 1 ? "1px solid var(--border-primary)" : "none" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{ps.project.title}</span>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                        {ps.overdue > 0 && <Tag label={`${ps.overdue} trễ`} color="#EF4444" />}
                                        <span style={{ fontSize: 14, fontWeight: 700, color: ps.pct === 100 ? "#10B981" : "var(--text-tertiary)" }}>{ps.pct}%</span>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ flex: 1, height: 8, background: "var(--bg-tertiary)", borderRadius: 4, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${ps.pct}%`, background: ps.pct === 100 ? "#10B981" : "#6366F1", borderRadius: 4, transition: "width 0.6s" }} />
                                    </div>
                                    <span style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{ps.done}/{ps.total}</span>
                                </div>
                            </Link>
                        ))}
                    </Panel>
                </div>

                {/* RIGHT */}
                <div>
                    {/* Deadline Timeline */}
                    <Panel title="📅 Deadline Timeline" sub="Lịch deadline 21 ngày (7 trước + 14 sau)">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                            {next14.map((d, i) => {
                                const isToday = d.key === new Date().toISOString().split("T")[0];
                                const isPast = d.date < now && !isToday;
                                const hasDeadline = d.total > 0;
                                const allDone = hasDeadline && d.done === d.total;
                                const hasMissed = hasDeadline && isPast && !allDone;
                                return (
                                    <div key={i} style={{
                                        textAlign: "center", padding: "8px 4px", borderRadius: 8,
                                        background: isToday ? "var(--accent-bg)" : hasMissed ? "#EF444410" : allDone ? "#10B98110" : hasDeadline ? "#F59E0B10" : "var(--bg-tertiary)",
                                        border: isToday ? "1px solid var(--accent)" : hasMissed ? "1px solid #EF444430" : "1px solid transparent",
                                    }}>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? "var(--accent)" : "var(--text-muted)" }}>{d.label}</div>
                                        {hasDeadline ? (
                                            <div style={{ fontSize: 16, fontWeight: 800, color: hasMissed ? "#EF4444" : allDone ? "#10B981" : "#F59E0B", marginTop: 2 }}>
                                                {d.total}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2, opacity: 0.3 }}>—</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "#10B981" }} /> Đã xong</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "#F59E0B" }} /> Pending</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "#EF4444" }} /> Quá hạn</span>
                        </div>
                    </Panel>

                    {/* Activity Trend */}
                    <Panel title="📈 Hoạt động 7 ngày" sub="Xu hướng hoạt động của team">
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                            {last7.map((d, i) => {
                                const val = actByDay[d.key];
                                const isToday = i === last7.length - 1;
                                return (
                                    <div key={d.key} className="fade-in-up" style={{ flex: 1, textAlign: "center", animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? "var(--accent)" : "var(--text-primary)", marginBottom: 4 }}>{val || 0}</div>
                                        <div style={{
                                            height: `${Math.max((val / actMax) * 100, 8)}%`,
                                            background: isToday ? "var(--gradient-brand)" : "var(--accent)",
                                            opacity: isToday ? 1 : 0.5,
                                            borderRadius: "6px 6px 0 0", transition: "height 0.6s", minHeight: 4,
                                        }} />
                                        <div style={{ fontSize: 10, color: isToday ? "var(--accent)" : "var(--text-muted)", marginTop: 6, fontWeight: 500 }}>{d.label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </Panel>

                    {/* Modules quá hạn */}
                    {overdue > 0 && (
                        <Panel title={`⚠️ Quá hạn (${overdue})`} alert>
                            {filteredModules.filter(m => m.deadline && new Date(m.deadline) < now && m.status !== "done").slice(0, 6).map((m, i) => {
                                const assignee = users.find(u => u.id === m.assigned_to);
                                const daysLate = Math.floor((now - new Date(m.deadline)) / (1000 * 60 * 60 * 24));
                                return (
                                    <Link key={m.id} href={`/projects/${m._project?.id}`} style={{ textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #EF444415" }}>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{m.title}</div>
                                            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{assignee?.display_name || "—"} • {m._project?.title}</div>
                                        </div>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", whiteSpace: "nowrap" }}>Trễ {daysLate}d</span>
                                    </Link>
                                );
                            })}
                        </Panel>
                    )}
                </div>
            </div>

            {/* Feature #4 — Sprint / Weekly Report */}
            {(() => {
                const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); weekStart.setHours(0,0,0,0);
                const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(prevWeekStart.getDate() - 7);
                const thisWeekDone = filteredModules.filter(m => m.updated_at && new Date(m.updated_at) >= weekStart && (m.status === 'done' || m.status === 'approved')).length;
                const prevWeekDone = filteredModules.filter(m => m.updated_at && new Date(m.updated_at) >= prevWeekStart && new Date(m.updated_at) < weekStart && (m.status === 'done' || m.status === 'approved')).length;
                const stuck = filteredModules.filter(m => m.status === 'in_progress' && m.updated_at && (now - new Date(m.updated_at)) > 3 * 24 * 60 * 60 * 1000).length;
                const comingDue = filteredModules.filter(m => m.deadline && new Date(m.deadline) > now && new Date(m.deadline) <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) && m.status !== 'done').length;
                const trend = prevWeekDone > 0 ? Math.round(((thisWeekDone - prevWeekDone) / prevWeekDone) * 100) : null;
                const weekDays = [];
                for (let i = 0; i <= 6; i++) {
                    const d = new Date(weekStart); d.setDate(d.getDate() + i);
                    const key = d.toISOString().split('T')[0];
                    const dayDone = filteredModules.filter(m => m.updated_at && new Date(m.updated_at).toISOString().split('T')[0] === key && (m.status === 'done' || m.status === 'approved')).length;
                    weekDays.push({ label: d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit' }), done: dayDone, isPast: d <= now });
                }
                const maxDay = Math.max(...weekDays.map(d => d.done), 1);
                return (
                    <div style={{ marginTop: 8 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>📋 Báo cáo tuần</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Tổng hợp hiệu suất đội nhóm trong tuần hiện tại</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                            <div className="glass-card" style={{ padding: '16px 18px', borderLeft: '4px solid #10B981' }}>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#10B981' }}>{thisWeekDone}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Task hoàn thành tuần này</div>
                                {trend !== null && <div style={{ fontSize: 12, fontWeight: 700, color: trend >= 0 ? '#10B981' : '#EF4444', marginTop: 4 }}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% so tuần trước</div>}
                            </div>
                            <div className="glass-card" style={{ padding: '16px 18px', borderLeft: '4px solid #F59E0B' }}>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B' }}>{prevWeekDone}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Task hoàn thành tuần trước</div>
                            </div>
                            <div className="glass-card" style={{ padding: '16px 18px', borderLeft: '4px solid #EF4444' }}>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#EF4444' }}>{stuck}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Task bị kẹt (3+ ngày không cập nhật)</div>
                            </div>
                            <div className="glass-card" style={{ padding: '16px 18px', borderLeft: '4px solid #8B5CF6' }}>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#8B5CF6' }}>{comingDue}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Sắp đến hạn (3 ngày tới)</div>
                            </div>
                        </div>
                        <Panel title="📉 Tiến độ hoàn thành trong tuần" sub="Số task đóng mỗi ngày trong tuần này">
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
                                {weekDays.map((d, i) => (
                                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: d.done > 0 ? '#10B981' : 'var(--text-muted)', marginBottom: 4 }}>{d.done || ''}</div>
                                        <div style={{ height: `${Math.max((d.done / maxDay) * 80, d.isPast ? 4 : 0)}px`, background: d.done > 0 ? '#10B981' : 'var(--bg-tertiary)', borderRadius: '6px 6px 0 0', minHeight: d.isPast ? 4 : 0, opacity: d.done > 0 ? 1 : 0.4, transition: 'height 0.5s' }} />
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{d.label}</div>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    </div>
                );
            })()}
        </div>
    );
}

function KPI({ icon, label, value, color, alert }) {
    return (
        <div className="glass-card" style={{
            padding: "16px 18px", display: "flex", alignItems: "center", gap: 12,
            borderColor: alert ? "#EF444440" : undefined, background: alert ? "#EF444408" : undefined,
        }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
            <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", fontWeight: 500, marginTop: 3 }}>{label}</div>
            </div>
        </div>
    );
}

function Panel({ title, sub, children, alert }) {
    return (
        <div style={{
            background: alert ? "#EF444408" : "var(--bg-elevated)", borderRadius: "var(--radius-lg)",
            border: `1px solid ${alert ? "#EF444430" : "var(--border-primary)"}`,
            padding: "20px 22px", marginBottom: 16, boxShadow: "var(--shadow-xs)",
        }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: alert ? "#EF4444" : "var(--text-primary)" }}>{title}</h3>
            {sub && <p style={{ margin: "4px 0 14px", fontSize: 13, color: "var(--text-muted)" }}>{sub}</p>}
            {!sub && <div style={{ marginBottom: 14 }} />}
            {children}
        </div>
    );
}

function Tag({ label, color }) {
    return <span style={{ fontSize: 12, fontWeight: 600, color, background: `${color}15`, padding: "2px 8px", borderRadius: 6 }}>{label}</span>;
}

function Empty() {
    return <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Chưa có dữ liệu</div>;
}
