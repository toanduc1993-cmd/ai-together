"use client";
import { useState, useEffect, useMemo } from "react";
import { Activity, MessageCircle, CheckCircle, Plus, Bot } from "lucide-react";
import Badge from "@/components/Badge";
import Btn from "@/components/Btn";
import { timeAgo } from "@/lib/helpers";

const ACT_ICONS = { comment: MessageCircle, status: CheckCircle, task_created: Plus, ai_usage: Bot };
const ACT_COLORS = { comment: "#3B82F6", status: "#10B981", task_created: "#F59E0B", ai_usage: "#A855F7" };

export default function FeedPage() {
    const [activities, setActivities] = useState([]);
    const [members, setMembers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        Promise.all([
            fetch("/api/activities").then(r => r.json()),
            fetch("/api/members").then(r => r.json()),
            fetch("/api/projects").then(r => r.json()),
        ]).then(([a, m, p]) => { setActivities(a); setMembers(m); setProjects(p); });
    }, []);

    const sorted = useMemo(() => {
        let f = filter === "all" ? activities : activities.filter(a => a.project === filter);
        return [...f].sort((a, b) => b.ts - a.ts);
    }, [activities, filter]);

    return (
        <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h2 style={{ color: "#0F172A", margin: 0, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
                        <Activity size={22} color="#3B82F6" /> Activity Feed
                    </h2>
                    <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 13 }}>Mọi hoạt động của team — ai đang làm gì, khi nào</p>
                </div>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                <Btn size="sm" color={filter === "all" ? "#3B82F6" : "#94A3B8"} variant={filter === "all" ? "filled" : "outline"} onClick={() => setFilter("all")}>Tất cả</Btn>
                {projects.map(p => (
                    <Btn key={p.id} size="sm" color={filter === p.id ? p.color : "#94A3B8"} variant={filter === p.id ? "filled" : "outline"} onClick={() => setFilter(p.id)}>{p.name}</Btn>
                ))}
            </div>

            <div style={{ position: "relative", paddingLeft: 28 }}>
                <div style={{ position: "absolute", left: 10, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg, #E2E8F0, transparent)" }} />
                {sorted.map((act) => {
                    const member = members.find(m => m.id === act.user);
                    const project = projects.find(p => p.id === act.project);
                    const TypeIcon = ACT_ICONS[act.type] || MessageCircle;
                    const typeColor = ACT_COLORS[act.type] || "#3B82F6";
                    const assignee = act.assignee ? members.find(m => m.id === act.assignee) : null;

                    return (
                        <div key={act.id} style={{ position: "relative", marginBottom: 16 }} className="fade-in">
                            <div style={{
                                position: "absolute", left: -24, top: 4, width: 20, height: 20, borderRadius: "50%",
                                background: `${typeColor}15`, display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                <TypeIcon size={11} color={typeColor} />
                            </div>
                            <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 14, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 18 }}>{member?.avatar || "👤"}</span>
                                        <span style={{ color: "#0F172A", fontWeight: 600, fontSize: 13 }}>{member?.name}</span>
                                        {project && <Badge color={project.color}>{project.name}</Badge>}
                                        {act.taskId && <span style={{ color: "#94A3B8", fontSize: 11, fontFamily: "monospace" }}>{act.taskId}</span>}
                                    </div>
                                    <span style={{ color: "#94A3B8", fontSize: 11 }}>{timeAgo(act.ts)}</span>
                                </div>
                                <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
                                    {act.text}
                                    {assignee && <span style={{ color: "#64748B" }}> → giao cho <span style={{ color: "#0F172A", fontWeight: 600 }}>{assignee.name}</span></span>}
                                </div>
                                {act.type === "ai_usage" && (
                                    <div style={{ marginTop: 6, background: "#A855F710", padding: "4px 10px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        <Bot size={12} color="#A855F7" />
                                        <span style={{ color: "#A855F7", fontSize: 11, fontWeight: 500 }}>AI-assisted</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {sorted.length === 0 && (
                    <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Chưa có hoạt động nào</div>
                )}
            </div>
        </div>
    );
}
