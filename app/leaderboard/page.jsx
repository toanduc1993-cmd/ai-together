"use client";
import { useState, useEffect } from "react";
import { Award, Trophy, Flame, TrendingUp, Zap } from "lucide-react";

export default function LeaderboardPage() {
    const [scores, setScores] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/scores?period=weekly").then(r => r.json()),
            fetch("/api/users").then(r => r.json()),
        ]).then(([s, u]) => {
            setScores(Array.isArray(s) ? s : []);
            setUsers(Array.isArray(u) ? u : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    // Build leaderboard from users if no scores yet
    const leaderboard = scores.length > 0
        ? scores.map((s, i) => ({ ...s, rank: i + 1 }))
        : users.filter(u => u.role !== "admin").map((u, i) => ({
            rank: i + 1,
            user: { id: u.id, display_name: u.display_name, avatar: u.avatar, username: u.username, role: u.role },
            tempo: 50, task_completion: 0, collaboration: 0, ai_adoption: 0, composite: 0, streak: 0,
        }));

    const PODIUM_MEDALS = ["🥇", "🥈", "🥉"];
    const PODIUM_COLORS = ["#F59E0B", "#94A3B8", "#CD7F32"];
    const TEMPO_LABELS = { 80: "🔥 On Fire", 60: "✅ Active", 40: "📋 Normal", 20: "🐢 Slow", 0: "💤 Inactive" };

    const getTempoLabel = (tempo) => {
        if (tempo >= 80) return TEMPO_LABELS[80];
        if (tempo >= 60) return TEMPO_LABELS[60];
        if (tempo >= 40) return TEMPO_LABELS[40];
        if (tempo >= 20) return TEMPO_LABELS[20];
        return TEMPO_LABELS[0];
    };

    if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Đang tải...</div>;

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ color: "#0F172A", margin: 0, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <Award size={22} color="#F59E0B" /> Leaderboard
                </h2>
                <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 13 }}>Composite Score = Tempo (35%) + Task (25%) + Collab (25%) + AI (15%)</p>
            </div>

            {/* Podium */}
            {leaderboard.length >= 3 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12, marginBottom: 24, padding: "0 40px" }}>
                    {[1, 0, 2].map(idx => {
                        const entry = leaderboard[idx];
                        if (!entry) return null;
                        const isFirst = idx === 0;
                        return (
                            <div key={entry.user?.id || idx} style={{
                                textAlign: "center", flex: 1, maxWidth: 200,
                                background: "#FFFFFF", borderRadius: 16, border: `2px solid ${PODIUM_COLORS[idx]}30`,
                                padding: isFirst ? "20px 16px" : "16px", transform: isFirst ? "scale(1.05)" : "none",
                                boxShadow: isFirst ? `0 8px 24px ${PODIUM_COLORS[idx]}20` : "0 2px 8px rgba(0,0,0,0.04)",
                            }}>
                                <div style={{ fontSize: 32 }}>{PODIUM_MEDALS[idx]}</div>
                                <div style={{ fontSize: 28, margin: "6px 0" }}>{entry.user?.avatar}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{entry.user?.display_name}</div>
                                <div style={{ fontSize: 10, color: "#94A3B8" }}>@{entry.user?.username}</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: PODIUM_COLORS[idx], marginTop: 6 }}>{Number(entry.composite).toFixed(0)}</div>
                                <div style={{ fontSize: 10, color: "#64748B" }}>Composite Score</div>
                                <div style={{ fontSize: 11, marginTop: 4 }}>{getTempoLabel(entry.tempo)}</div>
                                {entry.streak > 0 && <div style={{ fontSize: 10, color: "#F59E0B", marginTop: 2 }}>🔥 {entry.streak} ngày streak</div>}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Full table */}
            <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                            <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#64748B", fontSize: 11 }}>#</th>
                            <th style={{ padding: "10px", textAlign: "left", fontWeight: 600, color: "#64748B", fontSize: 11 }}>Thành viên</th>
                            <th style={{ padding: "10px", textAlign: "center", fontWeight: 600, color: "#64748B", fontSize: 11 }}>Tempo</th>
                            <th style={{ padding: "10px", textAlign: "center", fontWeight: 600, color: "#64748B", fontSize: 11 }}>Task</th>
                            <th style={{ padding: "10px", textAlign: "center", fontWeight: 600, color: "#64748B", fontSize: 11 }}>Collab</th>
                            <th style={{ padding: "10px", textAlign: "center", fontWeight: 600, color: "#64748B", fontSize: 11 }}>AI</th>
                            <th style={{ padding: "10px", textAlign: "center", fontWeight: 600, color: "#64748B", fontSize: 11 }}>Composite</th>
                            <th style={{ padding: "10px", textAlign: "center", fontWeight: 600, color: "#64748B", fontSize: 11 }}>Streak</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map(entry => (
                            <tr key={entry.user?.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                <td style={{ padding: "10px 16px", fontWeight: 700, color: "#0F172A" }}>{entry.rank <= 3 ? PODIUM_MEDALS[entry.rank - 1] : entry.rank}</td>
                                <td style={{ padding: "10px", display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 20 }}>{entry.user?.avatar}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, color: "#0F172A" }}>{entry.user?.display_name}</div>
                                        <div style={{ fontSize: 10, color: "#94A3B8" }}>@{entry.user?.username}</div>
                                    </div>
                                </td>
                                <td style={{ padding: "10px", textAlign: "center" }}><ScoreBadge value={entry.tempo} /></td>
                                <td style={{ padding: "10px", textAlign: "center" }}><ScoreBadge value={entry.task_completion} /></td>
                                <td style={{ padding: "10px", textAlign: "center" }}><ScoreBadge value={entry.collaboration} /></td>
                                <td style={{ padding: "10px", textAlign: "center" }}><ScoreBadge value={entry.ai_adoption} /></td>
                                <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#0F172A", fontSize: 15 }}>{Number(entry.composite).toFixed(0)}</td>
                                <td style={{ padding: "10px", textAlign: "center", color: entry.streak > 0 ? "#F59E0B" : "#94A3B8", fontWeight: 600 }}>
                                    {entry.streak > 0 ? `🔥 ${entry.streak}` : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {leaderboard.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
                    <Trophy size={48} strokeWidth={1} style={{ opacity: 0.3 }} />
                    <div style={{ fontSize: 14, marginTop: 12 }}>Chưa có dữ liệu leaderboard</div>
                </div>
            )}
        </div>
    );
}

function ScoreBadge({ value }) {
    const v = Number(value) || 0;
    const color = v >= 80 ? "#10B981" : v >= 60 ? "#3B82F6" : v >= 40 ? "#F59E0B" : v >= 20 ? "#FC7B25" : "#94A3B8";
    return (
        <span style={{ fontSize: 12, fontWeight: 600, color, background: `${color}12`, padding: "2px 8px", borderRadius: 8 }}>{v}</span>
    );
}
