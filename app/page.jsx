"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { FolderKanban, CheckCircle2, Zap, Award, Clock, AlertTriangle, ListChecks, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const { currentUser, isChairman, isProjectLead, unreadCount } = useUser();
    const [projects, setProjects] = useState([]);
    const [activities, setActivities] = useState([]);
    const [modules, setModules] = useState([]);
    const [scores, setScores] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.id) return;
        Promise.all([
            fetch("/api/projects").then(r => r.json()),
            fetch("/api/activities").then(r => r.json()),
            fetch("/api/scores?period=weekly").then(r => r.json()),
        ]).then(([p, a, s]) => {
            setProjects(Array.isArray(p) ? p : []);
            setActivities(Array.isArray(a) ? a : []);
            setScores(Array.isArray(s) ? s : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [currentUser?.id]);

    // Recalculate scores on load
    useEffect(() => { fetch("/api/scores/calculate", { method: "POST" }).catch(() => { }); }, []);

    if (loading) return <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Đang tải...</div>;

    const activeProjects = projects.filter(p => p.status === "active");
    const todayActivities = activities.filter(a => new Date(a.created_at).toDateString() === new Date().toDateString());
    const myScore = scores.find(s => s.user_id === currentUser?.id || s.user?.id === currentUser?.id);

    const ROLE_GREETING = {
        chairman: "Portfolio tổng quan",
        project_lead: "Tiến độ team của bạn",
        developer: "Dashboard cá nhân",
    };

    return (
        <div className="fade-in">
            {/* Greeting */}
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ color: "var(--text-primary)", margin: 0, fontSize: 22, fontWeight: 800 }}>
                    Xin chào, {currentUser?.display_name} 👋
                </h2>
                <p style={{ color: "var(--text-secondary)", margin: "4px 0 0", fontSize: 13 }}>
                    {currentUser?.role ? ROLE_GREETING[currentUser.role] || "Dashboard" : "Dashboard"} — {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
                </p>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
                <StatCard icon="📁" label="Projects" value={projects.length} color="#3B82F6" />
                <StatCard icon="✅" label="Active" value={activeProjects.length} color="#10B981" />
                <StatCard icon="⚡" label="Activities hôm nay" value={todayActivities.length} color="#F59E0B" />
                <StatCard icon="🔔" label="Chưa đọc" value={unreadCount || 0} color="#EF4444" />
                {myScore && <StatCard icon="🏆" label="Composite Score" value={Number(myScore.composite || 0).toFixed(0)} color="#8B5CF6" />}
                {myScore && <StatCard icon="🔥" label="Streak" value={`${myScore.streak || 0} ngày`} color="#F97316" />}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Left column */}
                <div>
                    {/* Chairman: Pending Reviews */}
                    {isChairman && (
                        <Card title="👀 Modules chờ Review" icon={<AlertTriangle size={16} color="#F59E0B" />}>
                            {projects.length === 0 ? (
                                <div style={emptyStyle}>Không có module nào đang chờ review</div>
                            ) : (
                                <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: 8 }}>
                                    Xem chi tiết tại trang <Link href="/projects" style={{ color: "#8B5CF6", fontWeight: 600 }}>Projects</Link>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Projects overview */}
                    <Card title="📁 Projects" icon={<FolderKanban size={16} color="#8B5CF6" />}
                        action={<Link href="/projects" style={{ color: "#8B5CF6", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>Xem tất cả <ArrowRight size={12} /></Link>}>
                        {projects.length === 0 ? (
                            <div style={emptyStyle}>Chưa có project nào. {isChairman && "Tạo project đầu tiên!"}</div>
                        ) : projects.slice(0, 5).map(p => (
                            <Link key={p.id} href={`/projects/${p.id}`} style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-primary)", marginBottom: 4, textDecoration: "none",
                            }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.title}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Lead: {p.lead?.display_name || "—"}</div>
                                </div>
                                <span style={{
                                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8,
                                    color: p.status === "active" ? "#10B981" : "#94A3B8",
                                    background: p.status === "active" ? "#10B98112" : "#F1F5F9",
                                }}>{p.status}</span>
                            </Link>
                        ))}
                    </Card>

                    {/* Developer: My Personal Tempo */}
                    {currentUser?.role === "developer" && myScore && (
                        <Card title="📊 Điểm số của tôi">
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <ScoreMini label="Tempo" value={myScore.tempo || 50} maxLabel={getTempoLabel(myScore.tempo)} />
                                <ScoreMini label="Task Completion" value={myScore.task_completion || 0} />
                                <ScoreMini label="Collaboration" value={myScore.collaboration || 0} />
                                <ScoreMini label="AI Adoption" value={myScore.ai_adoption || 0} />
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right column */}
                <div>
                    {/* Leaderboard mini */}
                    <Card title="🏆 Leaderboard"
                        action={<Link href="/leaderboard" style={{ color: "#F59E0B", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>Chi tiết <ArrowRight size={12} /></Link>}>
                        {scores.length === 0 ? (
                            <div style={emptyStyle}>Chưa có dữ liệu leaderboard</div>
                        ) : scores.slice(0, 5).map((s, idx) => (
                            <div key={s.user?.id || idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: idx < 3 ? "#F59E0B" : "var(--text-tertiary)", width: 20, textAlign: "center" }}>
                                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                                </span>
                                <span style={{ fontSize: 16 }}>{s.user?.avatar}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{s.user?.display_name}</div>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{Number(s.composite).toFixed(0)}</span>
                            </div>
                        ))}
                    </Card>

                    {/* Activity feed */}
                    <Card title="📈 Hoạt động gần đây">
                        {activities.length === 0 ? (
                            <div style={emptyStyle}>Chưa có hoạt động</div>
                        ) : activities.slice(0, 8).map(a => (
                            <div key={a.id} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--bg-tertiary)" }}>
                                <span style={{ fontSize: 16, flexShrink: 0 }}>{a.user?.avatar || "🔵"}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, color: "var(--text-primary)" }}>
                                        <strong>{a.user?.display_name}</strong> {a.detail || a.action_type}
                                    </div>
                                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>{timeAgo(a.created_at)}</div>
                                </div>
                            </div>
                        ))}
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div style={{ background: "var(--bg-primary)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border-primary)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{label}</div>
            </div>
        </div>
    );
}

function Card({ title, icon, action, children }) {
    return (
        <div style={{ background: "var(--bg-primary)", borderRadius: 12, border: "1px solid var(--border-primary)", padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>{icon} {title}</h3>
                {action}
            </div>
            {children}
        </div>
    );
}

function ScoreMini({ label, value, maxLabel }) {
    const color = value >= 80 ? "#10B981" : value >= 60 ? "#3B82F6" : value >= 40 ? "#F59E0B" : "#94A3B8";
    return (
        <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4 }}>{label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, height: 6, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 3, transition: "width 0.5s" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
            </div>
            {maxLabel && <div style={{ fontSize: 9, color, marginTop: 2 }}>{maxLabel}</div>}
        </div>
    );
}

const emptyStyle = { textAlign: "center", padding: "16px 0", color: "var(--text-tertiary)", fontSize: 12 };

function getTempoLabel(tempo) {
    if (tempo >= 80) return "🔥 On Fire";
    if (tempo >= 60) return "✅ Active";
    if (tempo >= 40) return "📋 Normal";
    return "💤 Inactive";
}

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
}
