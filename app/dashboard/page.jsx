"use client";
import { useState, useEffect, useMemo } from "react";
import { BarChart3, Users, CheckCircle, AlertTriangle, Clock, TrendingUp, Bot, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import { calcTempo } from "@/lib/helpers";

export default function DashboardPage() {
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        Promise.all([
            fetch("/api/tasks").then(r => r.json()),
            fetch("/api/members").then(r => r.json()),
            fetch("/api/activities").then(r => r.json()),
            fetch("/api/projects").then(r => r.json()),
        ]).then(([t, m, a, p]) => { setTasks(t); setMembers(m); setActivities(a); setProjects(p); });
    }, []);

    const stats = useMemo(() => {
        const total = tasks.length;
        const done = tasks.filter(t => t.status === "done").length;
        const doing = tasks.filter(t => t.status === "doing").length;
        const blocked = tasks.filter(t => t.status === "blocked").length;
        const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== "done").length;
        const last24h = activities.filter(a => (Date.now() - a.ts) < 86400000).length;
        const aiActs = activities.filter(a => a.type === "ai_usage").length;
        const avgTempo = members.length > 0 ? Math.round(members.reduce((s, m) => s + calcTempo(m.id, activities).score, 0) / members.length) : 0;
        return { total, done, doing, blocked, overdue, last24h, aiActs, avgTempo };
    }, [tasks, members, activities]);

    const projectStats = useMemo(() => {
        return projects.map(p => {
            const pTasks = tasks.filter(t => t.project === p.id);
            const done = pTasks.filter(t => t.status === "done").length;
            const total = pTasks.length;
            return { ...p, done, total, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
        }).filter(p => p.total > 0);
    }, [projects, tasks]);

    const memberStats = useMemo(() => {
        return members.map(m => {
            const mTasks = tasks.filter(t => t.owner === m.id);
            return { name: m.name, done: mTasks.filter(t => t.status === "done").length, doing: mTasks.filter(t => t.status === "doing").length, total: mTasks.length };
        }).filter(m => m.total > 0);
    }, [members, tasks]);

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ color: "#0F172A", margin: 0, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <BarChart3 size={22} color="#EC4899" /> Dashboard Overview
                </h2>
                <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 13 }}>Toàn cảnh hoạt động team — tất cả trong 1 màn hình</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
                <StatCard icon={CheckCircle} label="Hoàn thành" value={stats.done} sub={`/${stats.total} tasks`} color="#10B981" />
                <StatCard icon={Clock} label="Đang làm" value={stats.doing} color="#3B82F6" />
                <StatCard icon={AlertTriangle} label="Blocked" value={stats.blocked} color="#EF4444" highlight={stats.blocked > 0} />
                <StatCard icon={AlertTriangle} label="Quá hạn" value={stats.overdue} color="#F59E0B" highlight={stats.overdue > 0} />
                <StatCard icon={TrendingUp} label="Hoạt động 24h" value={stats.last24h} color="#8B5CF6" />
                <StatCard icon={Target} label="Tempo TB" value={stats.avgTempo} sub="/100" color="#EC4899" />
                <StatCard icon={Users} label="Team size" value={members.length} color="#64748B" />
                <StatCard icon={Bot} label="AI Usage" value={stats.aiActs} sub="lần dùng" color="#A855F7" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <h3 style={{ color: "#0F172A", margin: "0 0 16px", fontSize: 15 }}>Tiến độ dự án</h3>
                    {projectStats.map(p => (
                        <div key={p.id} style={{ marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <Badge color={p.color}>{p.name}</Badge>
                                <span style={{ color: "#64748B", fontSize: 12 }}>{p.done}/{p.total} ({p.progress}%)</span>
                            </div>
                            <div style={{ height: 6, background: "#F1F5F9", borderRadius: 3 }}>
                                <div style={{ width: `${p.progress}%`, height: "100%", background: `linear-gradient(90deg, ${p.color}, ${p.color}90)`, borderRadius: 3, transition: "width 0.5s" }} />
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <h3 style={{ color: "#0F172A", margin: "0 0 16px", fontSize: 15 }}>Tasks theo thành viên</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={memberStats}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                            <YAxis stroke="#94A3B8" fontSize={11} />
                            <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, color: "#0F172A", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                            <Bar dataKey="done" fill="#10B981" name="Hoàn thành" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="doing" fill="#3B82F6" name="Đang làm" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
