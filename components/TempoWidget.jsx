"use client";
import { Flame, Zap, TrendingUp } from "lucide-react";

const TEMPO_LEVELS = [
    { min: 80, label: "On Fire", color: "#EF4444", emoji: "🔥", bg: "#EF444415" },
    { min: 60, label: "Active", color: "#F59E0B", emoji: "⚡", bg: "#F59E0B15" },
    { min: 40, label: "Normal", color: "#3B82F6", emoji: "💪", bg: "#3B82F615" },
    { min: 20, label: "Slow", color: "#9CA3AF", emoji: "🐢", bg: "#9CA3AF15" },
    { min: 0, label: "Inactive", color: "#6B7280", emoji: "💤", bg: "#6B728015" },
];

function getTempoLevel(score) {
    return TEMPO_LEVELS.find(l => score >= l.min) || TEMPO_LEVELS[TEMPO_LEVELS.length - 1];
}

function calcTempoFromActivities(activities) {
    if (!activities || activities.length === 0) {
        return { score: 0, streak: 0, last24h: 0 };
    }
    const now = Date.now();
    const last = Math.max(...activities.map(a => new Date(a.created_at).getTime()));
    const hoursSinceLast = (now - last) / 3600000;
    const last24h = activities.filter(a => (now - new Date(a.created_at).getTime()) < 86400000).length;

    // Calculate streak (consecutive working days)
    const daySet = new Set(activities.map(a => {
        const d = new Date(a.created_at);
        return d.toISOString().split("T")[0];
    }));
    let streak = 0;
    let d = new Date();
    for (let i = 0; i < 30; i++) {
        const key = d.toISOString().split("T")[0];
        const day = d.getDay();
        if (day === 0 || day === 6) { d.setDate(d.getDate() - 1); continue; }
        if (daySet.has(key)) { streak++; d.setDate(d.getDate() - 1); }
        else break;
    }

    // Calculate score
    let score;
    if (hoursSinceLast < 1) score = 100;
    else if (hoursSinceLast < 4) score = 85;
    else if (hoursSinceLast < 12) score = 70;
    else if (hoursSinceLast < 24) score = 50;
    else if (hoursSinceLast < 48) score = 30;
    else score = 10;
    score = Math.min(100, score + last24h * 5);

    return { score, streak, last24h };
}

// Small inline badge for team member lists
export function TempoBadge({ score }) {
    const level = getTempoLevel(score);
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 600, color: level.color,
            background: level.bg, padding: "2px 8px", borderRadius: 6,
        }}>
            {level.emoji} {level.label}
        </span>
    );
}

// Card for team/dashboard — shows one person's tempo
export function TempoCard({ user, activities }) {
    const tempo = calcTempoFromActivities(activities);
    const level = getTempoLevel(tempo.score);
    const circumference = 2 * Math.PI * 36;
    const progress = (tempo.score / 100) * circumference;

    return (
        <div className="glass-card" style={{
            padding: 16, textAlign: "center", minWidth: 140,
            borderColor: tempo.score >= 80 ? `${level.color}30` : undefined,
        }}>
            {/* Circular Progress */}
            <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 10px" }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="40" cy="40" r="36" fill="none" stroke="var(--bg-tertiary)" strokeWidth="5" />
                    <circle cx="40" cy="40" r="36" fill="none" stroke={level.color} strokeWidth="5"
                        strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                        strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
                </svg>
                <div style={{
                    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: level.color }}>{tempo.score}</span>
                </div>
            </div>

            {/* Avatar & Name */}
            <div style={{ fontSize: 22, marginBottom: 2 }}>{user.avatar || "👤"}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                {user.display_name}
            </div>

            {/* Level Badge */}
            <TempoBadge score={tempo.score} />

            {/* Stats */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10, fontSize: 11 }}>
                {tempo.streak > 0 && (
                    <span style={{ color: "#F59E0B", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                        <Flame size={12} /> {tempo.streak}d
                    </span>
                )}
                <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                    <Zap size={12} /> {tempo.last24h} hôm nay
                </span>
            </div>
        </div>
    );
}

// Section for dashboard — shows all team members' tempo
export default function TempoOverview({ users, activitiesByUser }) {
    if (!users || users.length === 0) return null;

    return (
        <div style={{
            background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-primary)", padding: "20px 22px",
            marginBottom: 16, boxShadow: "var(--shadow-xs)",
        }}>
            <h3 style={{
                margin: "0 0 16px", fontSize: 16, fontWeight: 700,
                color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8,
            }}>
                <TrendingUp size={18} color="#F59E0B" /> Tempo Team
            </h3>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 12,
            }}>
                {users.map(u => (
                    <TempoCard
                        key={u.id}
                        user={u}
                        activities={activitiesByUser?.[u.id] || []}
                    />
                ))}
            </div>
        </div>
    );
}
