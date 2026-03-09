"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { Trophy, Medal, Crown, Flame, TrendingUp } from "lucide-react";

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
    const rest = scores.slice(3);
    const PODIUM_ORDER = [1, 0, 2]; // silver, gold, bronze visual order
    const PODIUM_HEIGHTS = [100, 130, 80];
    const PODIUM_COLORS = ["#C0C0C0", "#FFD700", "#CD7F32"];
    const PODIUM_BG = ["linear-gradient(180deg, #E8EDF2 0%, #CBD5E1 100%)", "linear-gradient(180deg, #FEF3C7 0%, #F59E0B 100%)", "linear-gradient(180deg, #FDDCB5 0%, #D97706 100%)"];
    const MEDALS = ["🥇", "🥈", "🥉"];

    return (
        <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>🏆 Leaderboard</h1>
                    <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 4 }}>Composite = Tempo (35%) + Task (25%) + Collab (25%) + AI (15%)</p>
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
                            {["#", "Thành viên", "Tempo", "Task", "Collab", "AI", "Composite", "Streak"].map(h => (
                                <th key={h} style={{ padding: "12px 14px", textAlign: h === "Thành viên" ? "left" : "center", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {scores.map((s, i) => {
                            const isMe = s.user_id === currentUser?.id || s.user?.id === currentUser?.id;
                            return (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border-primary)", background: isMe ? "var(--accent-bg)" : "transparent" }}>
                                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, fontSize: 13, color: i < 3 ? "var(--amber)" : "var(--text-muted)" }}>
                                        {i < 3 ? MEDALS[i] : i + 1}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span style={{ fontSize: 20 }}>{s.user?.avatar}</span>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{s.user?.display_name} {isMe && <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 500 }}>(bạn)</span>}</div>
                                                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>@{s.user?.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ ...cellStyle }}><MiniBar v={s.tempo} /></td>
                                    <td style={cellStyle}><MiniBar v={s.task_completion} /></td>
                                    <td style={cellStyle}><MiniBar v={s.collaboration} /></td>
                                    <td style={cellStyle}><MiniBar v={s.ai_adoption} /></td>
                                    <td style={{ ...cellStyle, fontSize: 16, fontWeight: 800 }}>{Number(s.composite).toFixed(0)}</td>
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

function MiniBar({ v }) {
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

const cellStyle = { padding: "12px 14px", textAlign: "center", color: "var(--text-primary)" };
