"use client";
import { useState, useEffect, useMemo } from "react";
import { Award, Flame, TrendingUp, Bot } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Badge from "@/components/Badge";
import { calcTempo } from "@/lib/helpers";

export default function LeaderboardPage() {
    const [members, setMembers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [roles, setRoles] = useState([]);

    useEffect(() => {
        Promise.all([
            fetch("/api/members").then(r => r.json()),
            fetch("/api/activities").then(r => r.json()),
            fetch("/api/tasks").then(r => r.json()),
            fetch("/api/roles").then(r => r.json()),
        ]).then(([m, a, t, r]) => { setMembers(m); setActivities(a); setTasks(t); setRoles(r); });
    }, []);

    const rankings = useMemo(() => {
        return members.map(m => {
            const tempo = calcTempo(m.id, activities);
            const memberTasks = tasks.filter(t => t.owner === m.id);
            const done = memberTasks.filter(t => t.status === "done").length;
            const total = memberTasks.length;
            const assigned = tasks.filter(t => t.assignedBy === m.id && t.owner !== m.id).length;
            const comments = activities.filter(a => a.user === m.id && a.type === "comment").length;
            const aiUsage = activities.filter(a => a.user === m.id && a.type === "ai_usage").length;
            const role = m.role ? roles.find(r => r.id === m.role) : null;
            const completionRate = total > 0 ? (done / total) * 100 : 0;
            const collabScore = Math.min(100, (comments * 15) + (assigned * 20));
            const aiScore = Math.min(100, aiUsage * 30);
            const composite = Math.round(tempo.score * 0.35 + completionRate * 0.25 + collabScore * 0.25 + aiScore * 0.15);
            return { ...m, tempo, done, total, assigned, comments, aiUsage, role, completionRate, collabScore, aiScore, composite };
        }).sort((a, b) => b.composite - a.composite);
    }, [members, activities, tasks, roles]);

    const medalColors = ["#F59E0B", "#9CA3AF", "#CD7F32"];
    const tempoChart = useMemo(() => {
        const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
        return days.map((d) => {
            const obj = { name: d };
            members.slice(0, 4).forEach(m => { obj[m.name] = Math.floor(30 + Math.random() * 70); });
            return obj;
        });
    }, [members]);
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

    if (members.length === 0) return <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Đang tải...</div>;

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ color: "#0F172A", margin: 0, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <Award size={22} color="#F59E0B" /> Leaderboard & Tempo
                </h2>
                <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 13 }}>Cạnh tranh lành mạnh — ai đang dẫn đầu, ai cần bứt phá</p>
            </div>

            {/* Top 3 podium */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
                {rankings.slice(0, 3).map((r, i) => (
                    <div key={r.id} style={{
                        background: i === 0 ? "#FFFBEB" : "#FFFFFF", borderRadius: 16, padding: 20, textAlign: "center",
                        border: `2px solid ${i === 0 ? "#F59E0B" : "#E2E8F0"}`, boxShadow: i === 0 ? "0 4px 12px rgba(245,158,11,0.15)" : "0 1px 3px rgba(0,0,0,0.04)",
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 4 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>{r.avatar}</div>
                        <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 16 }}>{r.name}</div>
                        {r.role && <Badge color={r.role.color}>{r.role.name}</Badge>}
                        <div style={{ fontSize: 36, fontWeight: 800, color: medalColors[i], marginTop: 8 }}>{r.composite}</div>
                        <div style={{ color: "#94A3B8", fontSize: 11 }}>điểm tổng hợp</div>
                        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 12, flexWrap: "wrap" }}>
                            <Badge color={r.tempo.color}><Flame size={10} /> {r.tempo.label}</Badge>
                            {r.tempo.streak > 0 && <Badge color="#F59E0B">🔥 {r.tempo.streak} ngày</Badge>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Full ranking table */}
            <div style={{ background: "#FFFFFF", borderRadius: 12, overflow: "hidden", border: "1px solid #E2E8F0", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#F8FAFC" }}>
                            {["#", "Thành viên", "Tempo", "Streak", "Tasks", "Giao cho người khác", "Trao đổi", "AI", "Tổng"].map(h => (
                                <th key={h} style={{ padding: "10px 12px", color: "#64748B", fontSize: 11, textAlign: "left", fontWeight: 600 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rankings.map((r, i) => (
                            <tr key={r.id} style={{ borderTop: "1px solid #F1F5F9" }}>
                                <td style={{ padding: "10px 12px", color: i < 3 ? medalColors[i] : "#94A3B8", fontWeight: 700 }}>{i + 1}</td>
                                <td style={{ padding: "10px 12px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 20 }}>{r.avatar}</span>
                                        <div>
                                            <div style={{ color: "#0F172A", fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                                            {r.role && <span style={{ color: r.role.color, fontSize: 11 }}>{r.role.name}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ width: 60, height: 6, background: "#F1F5F9", borderRadius: 3 }}>
                                            <div style={{ width: `${r.tempo.score}%`, height: "100%", background: r.tempo.color, borderRadius: 3 }} />
                                        </div>
                                        <span style={{ color: r.tempo.color, fontSize: 11, fontWeight: 600 }}>{r.tempo.score}</span>
                                    </div>
                                </td>
                                <td style={{ padding: "10px 12px", color: r.tempo.streak > 0 ? "#F59E0B" : "#CBD5E1", fontSize: 13 }}>
                                    {r.tempo.streak > 0 ? `🔥 ${r.tempo.streak}d` : "—"}
                                </td>
                                <td style={{ padding: "10px 12px", color: "#475569", fontSize: 13 }}>
                                    <span style={{ color: "#10B981", fontWeight: 600 }}>{r.done}</span>
                                    <span style={{ color: "#CBD5E1" }}>/{r.total}</span>
                                </td>
                                <td style={{ padding: "10px 12px", color: r.assigned > 0 ? "#3B82F6" : "#CBD5E1", fontSize: 13 }}>{r.assigned}</td>
                                <td style={{ padding: "10px 12px", color: r.comments > 0 ? "#3B82F6" : "#CBD5E1", fontSize: 13 }}>{r.comments}</td>
                                <td style={{ padding: "10px 12px" }}>
                                    {r.aiUsage > 0 ? <Badge color="#A855F7"><Bot size={10} /> {r.aiUsage}</Badge> : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                <td style={{ padding: "10px 12px", color: "#0F172A", fontWeight: 700, fontSize: 16 }}>{r.composite}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Tempo chart */}
            <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <h3 style={{ color: "#0F172A", margin: "0 0 16px", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={16} color="#3B82F6" /> Tempo tuần này
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={tempoChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                        <YAxis stroke="#94A3B8" fontSize={12} />
                        <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, color: "#0F172A", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                        <Legend />
                        {members.slice(0, 4).map((m, i) => (
                            <Area key={m.id} type="monotone" dataKey={m.name} stroke={colors[i]} fill={`${colors[i]}15`} />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
