"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { BarChart3, TrendingUp, Users, Activity, Calendar } from "lucide-react";

export default function AnalyticsPage() {
    const { currentUser, isChairman } = useUser();
    const [scores, setScores] = useState([]);
    const [activities, setActivities] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("weekly");

    useEffect(() => {
        Promise.all([
            fetch(`/api/scores?period=${period}`).then(r => r.json()),
            fetch("/api/activities").then(r => r.json()),
            fetch("/api/projects").then(r => r.json()),
        ]).then(([s, a, p]) => {
            setScores(Array.isArray(s) ? s : []);
            setActivities(Array.isArray(a) ? a : []);
            setProjects(Array.isArray(p) ? p : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [period]);

    if (loading) return <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Đang tải...</div>;

    // Compute analytics
    const totalActivities = activities.length;
    const activitiesByType = {};
    activities.forEach(a => { activitiesByType[a.action_type] = (activitiesByType[a.action_type] || 0) + 1; });

    const activitiesByDay = {};
    activities.forEach(a => {
        const day = new Date(a.created_at).toLocaleDateString("vi-VN");
        activitiesByDay[day] = (activitiesByDay[day] || 0) + 1;
    });
    const dayLabels = Object.keys(activitiesByDay).slice(-7);
    const dayValues = dayLabels.map(d => activitiesByDay[d]);
    const maxDayVal = Math.max(...dayValues, 1);

    const avgTempo = scores.length > 0 ? Math.round(scores.reduce((s, x) => s + (x.tempo || 0), 0) / scores.length) : 0;
    const avgComposite = scores.length > 0 ? Math.round(scores.reduce((s, x) => s + Number(x.composite || 0), 0) / scores.length) : 0;
    const topPerformer = scores[0];

    const ACTION_LABELS = {
        chat_message: "💬 Chat", status_change: "🔄 Status", checklist_created: "📋 Task", module_created: "📦 Module",
        project_created: "📁 Project", deliverable_submitted: "📤 Nộp", review_submitted: "👀 Review", checklist_status_changed: "✅ Task Done",
    };

    return (
        <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h2 style={{ color: "var(--text-primary)", margin: 0, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                        <BarChart3 size={22} color="#06B6D4" /> Analytics
                    </h2>
                    <p style={{ color: "var(--text-secondary)", margin: "4px 0 0", fontSize: 13 }}>Báo cáo hiệu suất team</p>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                    {["weekly", "monthly"].map(p => (
                        <button key={p} onClick={() => setPeriod(p)} style={{
                            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            background: period === p ? "#06B6D410" : "var(--bg-secondary)",
                            color: period === p ? "#06B6D4" : "var(--text-tertiary)",
                            border: period === p ? "1px solid #06B6D430" : "1px solid var(--border-primary)",
                        }}>{p === "weekly" ? "Tuần" : "Tháng"}</button>
                    ))}
                </div>
            </div>

            {/* Overview stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
                <AnalStatCard icon="📊" label="Activities tổng" value={totalActivities} color="#06B6D4" />
                <AnalStatCard icon="🎯" label="Avg Tempo" value={avgTempo} color="#10B981" />
                <AnalStatCard icon="⭐" label="Avg Composite" value={avgComposite} color="#F59E0B" />
                <AnalStatCard icon="🏅" label="Top Performer" value={topPerformer?.user?.display_name || "—"} color="#8B5CF6" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Activity chart (bar) */}
                <div style={{ background: "var(--bg-primary)", borderRadius: 12, border: "1px solid var(--border-primary)", padding: 16 }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>📈 Activities 7 ngày gần nhất</h3>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140, padding: "0 4px" }}>
                        {dayLabels.map((day, i) => (
                            <div key={day} style={{ flex: 1, textAlign: "center" }}>
                                <div style={{
                                    height: `${(dayValues[i] / maxDayVal) * 100}%`, minHeight: 4,
                                    background: "linear-gradient(to top, #06B6D4, #8B5CF6)", borderRadius: "4px 4px 0 0",
                                    transition: "height 0.5s",
                                }} />
                                <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 4 }}>{day.split("/").slice(0, 2).join("/")}</div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>{dayValues[i]}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity breakdown */}
                <div style={{ background: "var(--bg-primary)", borderRadius: 12, border: "1px solid var(--border-primary)", padding: 16 }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>🔄 Phân loại Activity</h3>
                    {Object.entries(activitiesByType).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([type, count]) => {
                        const pct = Math.round((count / totalActivities) * 100);
                        return (
                            <div key={type} style={{ marginBottom: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                                    <span style={{ color: "var(--text-secondary)" }}>{ACTION_LABELS[type] || type}</span>
                                    <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{count} ({pct}%)</span>
                                </div>
                                <div style={{ height: 6, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: `hsl(${180 + pct * 2}, 70%, 50%)`, borderRadius: 3, transition: "width 0.5s" }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Team scores table */}
                <div style={{ background: "var(--bg-primary)", borderRadius: 12, border: "1px solid var(--border-primary)", padding: 16, gridColumn: "1 / -1" }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>👥 Team Performance</h3>
                    <div style={{ overflow: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                                    <th style={thStyle}>Thành viên</th>
                                    <th style={thStyle}>Tempo</th>
                                    <th style={thStyle}>Task</th>
                                    <th style={thStyle}>Collab</th>
                                    <th style={thStyle}>AI</th>
                                    <th style={thStyle}>Composite</th>
                                    <th style={thStyle}>Streak</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scores.map(s => (
                                    <tr key={s.user?.id} style={{ borderBottom: "1px solid var(--bg-tertiary)" }}>
                                        <td style={tdStyle}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span>{s.user?.avatar}</span>
                                                <strong>{s.user?.display_name}</strong>
                                            </div>
                                        </td>
                                        <td style={tdStyle}><BarMini value={s.tempo} /></td>
                                        <td style={tdStyle}><BarMini value={s.task_completion} /></td>
                                        <td style={tdStyle}><BarMini value={s.collaboration} /></td>
                                        <td style={tdStyle}><BarMini value={s.ai_adoption} /></td>
                                        <td style={{ ...tdStyle, fontWeight: 700, fontSize: 14 }}>{Number(s.composite).toFixed(0)}</td>
                                        <td style={tdStyle}>{s.streak > 0 ? `🔥 ${s.streak}` : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Projects overview */}
                <div style={{ background: "var(--bg-primary)", borderRadius: 12, border: "1px solid var(--border-primary)", padding: 16, gridColumn: "1 / -1" }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>📁 Projects Status</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8 }}>
                        {projects.map(p => (
                            <div key={p.id} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-primary)", background: "var(--bg-secondary)" }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.title}</div>
                                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
                                    Lead: {p.lead?.display_name || "—"} • Status: {p.status}
                                </div>
                                {p.deadline && <div style={{ fontSize: 10, color: "#F59E0B", marginTop: 2 }}>📅 {new Date(p.deadline).toLocaleDateString("vi-VN")}</div>}
                            </div>
                        ))}
                        {projects.length === 0 && <div style={{ color: "var(--text-tertiary)", fontSize: 12, padding: 12 }}>Chưa có project</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnalStatCard({ icon, label, value, color }) {
    return (
        <div style={{ background: "var(--bg-primary)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border-primary)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{label}</div>
            </div>
        </div>
    );
}

function BarMini({ value }) {
    const v = Number(value || 0);
    const color = v >= 80 ? "#10B981" : v >= 60 ? "#3B82F6" : v >= 40 ? "#F59E0B" : "#94A3B8";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 40, height: 5, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${v}%`, background: color, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color }}>{v}</span>
        </div>
    );
}

const thStyle = { padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "var(--text-tertiary)", fontSize: 11 };
const tdStyle = { padding: "8px 10px", color: "var(--text-primary)" };
