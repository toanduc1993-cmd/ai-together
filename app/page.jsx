"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { FolderKanban, ArrowRight, TrendingUp, Clock, Activity, Flame } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const { currentUser, isChairman, unreadCount } = useUser();
    const [projects, setProjects] = useState([]);
    const [activities, setActivities] = useState([]);
    const [scores, setScores] = useState([]);
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

    useEffect(() => { fetch("/api/scores/calculate", { method: "POST" }).catch(() => { }); }, []);

    if (loading) return <Skeleton />;

    const activeP = projects.filter(p => p.status === "active");
    const todayAct = activities.filter(a => new Date(a.created_at).toDateString() === new Date().toDateString());
    const myScore = scores.find(s => s.user_id === currentUser?.id);

    return (
        <div className="fade-in">
            {/* Hero */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5, lineHeight: 1.2 }}>
                    Xin chào, {currentUser?.display_name} 👋
                </h1>
                <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginTop: 6 }}>
                    {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                <Stat icon={<FolderKanban size={18} />} label="Projects" value={projects.length} color="var(--accent)" />
                <Stat icon={<Activity size={18} />} label="Active" value={activeP.length} color="var(--green)" />
                <Stat icon={<TrendingUp size={18} />} label="Hôm nay" value={todayAct.length} color="var(--blue)" />
                <Stat icon={<Clock size={18} />} label="Chưa đọc" value={unreadCount || 0} color="var(--red)" />
                {myScore && <Stat icon="🏆" label="Composite" value={Number(myScore.composite || 0).toFixed(0)} color="var(--accent)" />}
                {myScore && <Stat icon={<Flame size={18} />} label="Streak" value={`${myScore.streak || 0}d`} color="var(--amber)" />}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }} className="grid-2">
                <div>
                    {/* Projects */}
                    <Panel title="Projects" action={<Link href="/projects" style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>Tất cả <ArrowRight size={13} /></Link>}>
                        {projects.length === 0 ? <Empty text="Chưa có project" /> : projects.slice(0, 5).map(p => (
                            <Link key={p.id} href={`/projects/${p.id}`} className="glass-card" style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "12px 14px", marginBottom: 6, textDecoration: "none",
                            }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.title}</div>
                                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>Lead: {p.lead?.display_name || "—"}</div>
                                </div>
                                <StatusBadge status={p.status} />
                            </Link>
                        ))}
                    </Panel>

                    {currentUser?.role === "developer" && myScore && (
                        <Panel title="Điểm cá nhân">
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <ScoreBar label="Tempo" value={myScore.tempo || 50} />
                                <ScoreBar label="Task" value={myScore.task_completion || 0} />
                                <ScoreBar label="Collab" value={myScore.collaboration || 0} />
                                <ScoreBar label="AI" value={myScore.ai_adoption || 0} />
                            </div>
                        </Panel>
                    )}
                </div>

                <div>
                    <Panel title="Leaderboard" action={<Link href="/leaderboard" style={{ color: "var(--amber)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>Chi tiết <ArrowRight size={13} /></Link>}>
                        {scores.length === 0 ? <Empty text="Chưa có dữ liệu" /> : scores.slice(0, 5).map((s, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 4 ? "1px solid var(--border-primary)" : "none" }}>
                                <span style={{ width: 22, textAlign: "center", fontSize: 13, fontWeight: 700, color: i < 3 ? "var(--amber)" : "var(--text-muted)" }}>
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                                </span>
                                <span style={{ fontSize: 18 }}>{s.user?.avatar}</span>
                                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{s.user?.display_name}</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{Number(s.composite).toFixed(0)}</span>
                            </div>
                        ))}
                    </Panel>

                    <Panel title="Hoạt động">
                        {activities.length === 0 ? <Empty text="Chưa có hoạt động" /> : activities.slice(0, 6).map(a => (
                            <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-primary)" }}>
                                <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{a.user?.avatar || "🔵"}</span>
                                <div>
                                    <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>
                                        <strong>{a.user?.display_name}</strong> <span style={{ color: "var(--text-tertiary)" }}>{a.detail || a.action_type}</span>
                                    </div>
                                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{timeAgo(a.created_at)}</div>
                                </div>
                            </div>
                        ))}
                    </Panel>
                </div>
            </div>
        </div>
    );
}

function Stat({ icon, label, value, color }) {
    return (
        <div className="glass-card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}12`, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {typeof icon === "string" ? icon : icon}
            </div>
            <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500, marginTop: 2 }}>{label}</div>
            </div>
        </div>
    );
}

function Panel({ title, action, children }) {
    return (
        <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)", padding: "18px 20px", marginBottom: 14, boxShadow: "var(--shadow-xs)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>📋 {title}</h3>
                {action}
            </div>
            {children}
        </div>
    );
}

function StatusBadge({ status }) {
    const map = { active: { bg: "var(--green-bg)", color: "var(--green)", label: "Active" }, completed: { bg: "var(--blue-bg)", color: "var(--blue)", label: "Done" }, planning: { bg: "var(--amber-bg)", color: "var(--amber)", label: "Planning" } };
    const s = map[status] || map.planning;
    return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>;
}

function ScoreBar({ label, value }) {
    const v = Number(value || 0);
    const c = v >= 70 ? "var(--green)" : v >= 50 ? "var(--blue)" : v >= 30 ? "var(--amber)" : "var(--text-muted)";
    return (
        <div style={{ background: "var(--bg-tertiary)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{v}</span>
            </div>
            <div style={{ height: 5, background: "var(--bg-secondary)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${v}%`, background: c, borderRadius: 4, transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </div>
        </div>
    );
}

function Empty({ text }) { return <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>{text}</div>; }
function Skeleton() {
    return <div style={{ padding: 40, textAlign: "center" }}><div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-tertiary)", margin: "0 auto 12px", animation: "pulse-soft 1.5s infinite" }} /><div style={{ color: "var(--text-muted)", fontSize: 13 }}>Đang tải...</div></div>;
}
function timeAgo(d) { const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 60) return "Vừa xong"; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`; }
