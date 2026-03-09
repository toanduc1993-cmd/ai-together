"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { BarChart3, TrendingUp, Users, Zap } from "lucide-react";

export default function AnalyticsPage() {
    const { currentUser } = useUser();
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
        });
    }, [period]);

    if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Đang tải...</div>;

    const byType = {};
    activities.forEach(a => { byType[a.action_type] = (byType[a.action_type] || 0) + 1; });
    const byDay = {};
    activities.forEach(a => {
        const d = new Date(a.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        byDay[d] = (byDay[d] || 0) + 1;
    });
    const days = Object.keys(byDay).slice(-7);
    const dayVals = days.map(d => byDay[d]);
    const maxVal = Math.max(...dayVals, 1);
    const avgTempo = scores.length ? Math.round(scores.reduce((s, x) => s + (x.tempo || 0), 0) / scores.length) : 0;
    const avgComp = scores.length ? Math.round(scores.reduce((s, x) => s + Number(x.composite || 0), 0) / scores.length) : 0;
    const top = scores[0];

    const LABELS = { chat_message: "💬 Chat", status_change: "🔄 Status", checklist_created: "📋 Task", module_created: "📦 Module", project_created: "📁 Project", deliverable_submitted: "📤 Nộp", review_submitted: "👀 Review", checklist_status_changed: "✅ Done" };

    return (
        <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>📊 Analytics</h1>
                    <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginTop: 4 }}>Báo cáo hiệu suất team</p>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                    {[{ v: "weekly", l: "Tuần" }, { v: "monthly", l: "Tháng" }].map(x => (
                        <button key={x.v} onClick={() => setPeriod(x.v)} style={{
                            padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            background: period === x.v ? "var(--accent-bg)" : "var(--bg-tertiary)",
                            color: period === x.v ? "var(--accent)" : "var(--text-tertiary)",
                            border: period === x.v ? "1px solid var(--border-active)" : "1px solid var(--border-primary)",
                        }}>{x.l}</button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
                <AStat icon={<Zap size={18} />} label="Activities" value={activities.length} color="var(--cyan)" />
                <AStat icon={<TrendingUp size={18} />} label="Avg Tempo" value={avgTempo} color="var(--green)" />
                <AStat icon={<BarChart3 size={18} />} label="Avg Composite" value={avgComp} color="var(--amber)" />
                <AStat icon={<Users size={18} />} label="Top Performer" value={top?.user?.display_name || "—"} color="var(--accent)" isText />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="grid-2">
                {/* Chart */}
                <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)", padding: "20px 22px", boxShadow: "var(--shadow-xs)" }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>📈 Activities 7 ngày</h3>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
                        {days.map((d, i) => (
                            <div key={d} className="fade-in-up" style={{ flex: 1, textAlign: "center", animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{dayVals[i]}</div>
                                <div style={{ height: `${Math.max((dayVals[i] / maxVal) * 100, 6)}%`, background: "var(--gradient-brand)", borderRadius: "6px 6px 0 0", transition: "height 0.6s cubic-bezier(0.16, 1, 0.3, 1)", minHeight: 4 }} />
                                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 6, fontWeight: 500 }}>{d}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Type breakdown */}
                <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)", padding: "20px 22px", boxShadow: "var(--shadow-xs)" }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>🔄 Phân loại</h3>
                    {Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([type, count]) => {
                        const pct = Math.round((count / activities.length) * 100);
                        return (
                            <div key={type} style={{ marginBottom: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{LABELS[type] || type}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{count}</span>
                                </div>
                                <div style={{ height: 5, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--gradient-brand)", borderRadius: 3, transition: "width 0.5s" }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Team perf */}
            <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)", padding: "20px 22px", marginTop: 16, boxShadow: "var(--shadow-xs)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>👥 Team Performance</h3>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                        {["Thành viên", "Tempo", "Task", "Collab", "AI", "Composite", "Streak"].map(h => (
                            <th key={h} style={{ padding: "10px 12px", textAlign: h === "Thành viên" ? "left" : "center", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                        ))}
                    </tr></thead>
                    <tbody>{scores.map((s, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border-primary)" }}>
                            <td style={{ padding: "10px 12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 18 }}>{s.user?.avatar}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{s.user?.display_name}</span>
                                </div>
                            </td>
                            <td style={cellS}><PBar v={s.tempo} /></td>
                            <td style={cellS}><PBar v={s.task_completion} /></td>
                            <td style={cellS}><PBar v={s.collaboration} /></td>
                            <td style={cellS}><PBar v={s.ai_adoption} /></td>
                            <td style={{ ...cellS, fontSize: 15, fontWeight: 800 }}>{Number(s.composite).toFixed(0)}</td>
                            <td style={{ ...cellS, fontSize: 13 }}>{s.streak > 0 ? `🔥 ${s.streak}` : "—"}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </div>
    );
}

function AStat({ icon, label, value, color, isText }) {
    return (
        <div className="glass-card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}12`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
            <div>
                <div style={{ fontSize: isText ? 14 : 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500, marginTop: 2 }}>{label}</div>
            </div>
        </div>
    );
}

function PBar({ v }) {
    const val = Number(v || 0);
    const c = val >= 70 ? "var(--green)" : val >= 50 ? "var(--blue)" : val >= 30 ? "var(--amber)" : "var(--text-muted)";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <div style={{ width: 36, height: 4, background: "var(--bg-tertiary)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${val}%`, background: c, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: c, minWidth: 20, textAlign: "right" }}>{val}</span>
        </div>
    );
}

const cellS = { padding: "10px 12px", textAlign: "center", color: "var(--text-primary)" };
