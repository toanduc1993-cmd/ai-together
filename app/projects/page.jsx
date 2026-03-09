"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { Plus, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";

export default function ProjectsPage() {
    const { currentUser, isChairman } = useUser();
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", lead_id: "", deadline: "" });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/projects").then(r => r.json()),
            fetch("/api/users").then(r => r.json()),
        ]).then(([p, u]) => {
            setProjects(Array.isArray(p) ? p : []);
            setUsers(Array.isArray(u) ? u : []);
            setLoading(false);
        });
    }, []);

    const create = async () => {
        if (!form.title.trim()) return;
        await fetch("/api/projects", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, chairman_id: currentUser.id }),
        });
        setShowCreate(false);
        setForm({ title: "", description: "", lead_id: "", deadline: "" });
        fetch("/api/projects").then(r => r.json()).then(p => setProjects(Array.isArray(p) ? p : []));
    };

    if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Đang tải...</div>;

    return (
        <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>Projects</h1>
                    <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginTop: 4 }}>{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
                </div>
                {isChairman && (
                    <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Plus size={15} /> Tạo Project
                    </button>
                )}
            </div>

            {projects.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>📁</div>
                    <div style={{ color: "var(--text-tertiary)", fontSize: 14, fontWeight: 500 }}>Chưa có project nào</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>Nhấn &quot;Tạo Project&quot; để bắt đầu</div>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                    {projects.map((p, i) => (
                        <Link key={p.id} href={`/projects/${p.id}`} className="glass-card fade-in-up" style={{ padding: "20px 22px", textDecoration: "none", animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{p.title}</h3>
                                <StatusBadge status={p.status} />
                            </div>
                            {p.description && <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "0 0 14px", lineHeight: 1.5 }}>{p.description.substring(0, 100)}{p.description.length > 100 ? "..." : ""}</p>}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                                    <span style={{ fontSize: 16 }}>{p.lead?.avatar || "👤"}</span>
                                    <span style={{ fontWeight: 500 }}>{p.lead?.display_name || "Chưa assign"}</span>
                                </div>
                                {p.deadline && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--amber)", fontWeight: 500 }}>
                                        <Clock size={12} /> {new Date(p.deadline).toLocaleDateString("vi-VN")}
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {showCreate && (
                <Modal title="✨ Tạo Project mới" onClose={() => setShowCreate(false)}>
                    <Input label="Tên project" placeholder="Nhập tên..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    <Input label="Mô tả" placeholder="Mô tả ngắn..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    <Select label="Project Lead" value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })}>
                        <option value="">-- Chọn Lead --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.display_name} ({u.role})</option>)}
                    </Select>
                    <Input label="Deadline" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                    <button onClick={create} className="btn-primary" style={{ width: "100%", marginTop: 8 }}>Tạo Project</button>
                </Modal>
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const map = { active: { bg: "var(--green-bg)", color: "var(--green)", t: "Active" }, completed: { bg: "var(--blue-bg)", color: "var(--blue)", t: "Done" }, planning: { bg: "var(--amber-bg)", color: "var(--amber)", t: "Planning" } };
    const s = map[status] || { bg: "var(--bg-tertiary)", color: "var(--text-muted)", t: status };
    return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color }}>{s.t}</span>;
}
