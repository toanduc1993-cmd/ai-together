"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { Trophy, Flame } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHTS = [100, 130, 80];
const PODIUM_BG = [
    "linear-gradient(180deg, #E8EDF2 0%, #CBD5E1 100%)",
    "linear-gradient(180deg, #FEF3C7 0%, #F59E0B 100%)",
    "linear-gradient(180deg, #FDDCB5 0%, #D97706 100%)",
];
const PODIUM_COLORS = ["#C0C0C0", "#FFD700", "#CD7F32"];

const METRIC_CFG = {
    delivery: { label: "Delivery", emoji: "📦", color: "#6366F1", desc: "Tỷ lệ hoàn thành module" },
    quality: { label: "Quality", emoji: "✅", color: "#10B981", desc: "Phê duyệt lần đầu" },
    speed: { label: "Speed", emoji: "⏱️", color: "#06B6D4", desc: "Đúng deadline" },
    consistency: { label: "Consistency", emoji: "🔥", color: "#F59E0B", desc: "Làm việc đều đặn" },
    collaboration: { label: "Collab", emoji: "💬", color: "#8B5CF6", desc: "Upload + Comment" },
};

export default function LeaderboardPage() {
    const { currentUser } = useUser();
    const [scores, setScores] = useState([]);
    const [period, setPeriod] = useState("weekly");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/scores?period=${period}`).then(r => r.json()).then(s => {
            setScores(Array.isArray(s) ? s : []);
            setLoading(false);
        });
    }, [period]);

    if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Đang tải...</div>;

    const top3 = scores.slice(0, 3);

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>🏆 Leaderboard</h1>
                    <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 4 }}>
                        Composite = Delivery (30%) + Quality (25%) + Speed (20%) + Consistency (15%) + Collab (10%)
                    </p>
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

            {/* Metric Legend */}
            <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
                {Object.entries(METRIC_CFG).map(([key, m]) => (
                    <div key={key} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: `${m.color}10`, border: `1px solid ${m.color}30`,
                        borderRadius: 10, padding: "6px 14px", fontSize: 12,
                    }}>
                        <span>{m.emoji}</span>
                        <span style={{ fontWeight: 700, color: m.color }}>{m.label}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{m.desc}</span>
                    </div>
                ))}
            </div>

            {/* Podium */}
            {top3.length >= 3 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 16, marginBottom: 32, padding: "20px 0" }}>
                    {PODIUM_ORDER.map((idx, vi) => {
                        const s = top3[idx]; if (!s) return null;
                        return (
                            <div key={idx} className="fade-in-up" style={{ textAlign: "center", animationDelay: `${vi * 120}ms`, animationFillMode: "backwards", width: 140 }}>
                                <div style={{ position: "relative", marginBottom: 8 }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: 16, margin: "0 auto",
                                        background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 24, boxShadow: `0 4px 20px ${PODIUM_COLORS[idx]}40`,
                                        border: `2px solid ${PODIUM_COLORS[idx]}60`,
                                    }}>{s.user?.avatar}</div>
                                    <div style={{ position: "absolute", top: -6, right: "calc(50% - 28px)", fontSize: 20 }}>{MEDALS[idx]}</div>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{s.user?.display_name}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>@{s.user?.username}</div>
                                <div style={{
                                    height: PODIUM_HEIGHTS[idx], borderRadius: "12px 12px 0 0",
                                    background: PODIUM_BG[idx], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                }}>
                                    <div style={{ fontSize: 24, fontWeight: 900, color: idx === 0 ? "#92400E" : "#1E293B" }}>{Number(s.composite).toFixed(0)}</div>
                                    <div style={{ fontSize: 9, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 1 }}>pts</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Table */}
            <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "var(--bg-tertiary)" }}>
                            {["#", "Thành viên", "📦 Delivery", "✅ Quality", "⏱️ Speed", "🔥 Consistency", "💬 Collab", "Composite", "Streak"].map(h => (
                                <th key={h} style={{
                                    padding: "12px 12px", textAlign: h === "Thành viên" ? "left" : "center",
                                    fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)",
                                    textTransform: "uppercase", letterSpacing: 0.4,
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {scores.map((s, i) => {
                            const isMe = s.user_id === currentUser?.id || s.user?.id === currentUser?.id;
                            // Map old fields to new names
                            const delivery = s.delivery ?? s.tempo ?? 0;
                            const quality = s.quality ?? s.task_completion ?? 0;
                            const speed = s.speed ?? s.ai_adoption ?? 0;
                            const consistency = s.consistency ?? getConsistencyFromStreak(s.streak) ?? 0;
                            const collab = s.collaboration ?? 0;

                            return (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border-primary)", background: isMe ? "var(--accent-bg)" : "transparent" }}>
                                    <td style={cellStyle}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: i < 3 ? "var(--amber)" : "var(--text-muted)" }}>
                                            {i < 3 ? MEDALS[i] : i + 1}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 12px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span style={{ fontSize: 20 }}>{s.user?.avatar}</span>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                                                    {s.user?.display_name} {isMe && <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 500 }}>(bạn)</span>}
                                                </div>
                                                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>@{s.user?.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={cellStyle}><ScoreCell value={delivery} color="#6366F1" /></td>
                                    <td style={cellStyle}><ScoreCell value={quality} color="#10B981" /></td>
                                    <td style={cellStyle}><ScoreCell value={speed} color="#06B6D4" /></td>
                                    <td style={cellStyle}><ScoreCell value={consistency} color="#F59E0B" /></td>
                                    <td style={cellStyle}><ScoreCell value={collab} color="#8B5CF6" /></td>
                                    <td style={{ ...cellStyle, fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                                        {Number(s.composite).toFixed(0)}
                                    </td>
                                    <td style={{ ...cellStyle, fontSize: 13, fontWeight: 600 }}>
                                        {s.streak > 0 ? <span style={{ color: "var(--amber)" }}>🔥 {s.streak}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ScoreCell({ value, color }) {
    const v = Number(value || 0);
    const displayColor = v >= 70 ? color : v >= 40 ? "#F59E0B" : "var(--text-muted)";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <div style={{ width: 40, height: 6, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${v}%`, background: displayColor, borderRadius: 3, transition: "width 0.6s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: displayColor, minWidth: 24, textAlign: "right" }}>{v}</span>
        </div>
    );
}

function getConsistencyFromStreak(streak) {
    if (streak >= 10) return 100;
    if (streak >= 7) return 80;
    if (streak >= 4) return 60;
    if (streak >= 2) return 40;
    if (streak >= 1) return 20;
    return 0;
}

const cellStyle = { padding: "12px 12px", textAlign: "center", color: "var(--text-primary)" };
