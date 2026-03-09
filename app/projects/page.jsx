"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { FolderKanban, Plus, Calendar, Users as UsersIcon, ChevronRight } from "lucide-react";
import Link from "next/link";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";

export default function ProjectsPage() {
    const { currentUser, isChairman } = useUser();
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({});
    const [error, setError] = useState("");

    const reload = () => {
        Promise.all([
            fetch("/api/projects").then(r => r.json()),
            fetch("/api/users").then(r => r.json()),
        ]).then(([p, u]) => {
            setProjects(Array.isArray(p) ? p : []);
            setUsers(Array.isArray(u) ? u : []);
            setLoading(false);
        });
    };

    useEffect(() => { reload(); }, []);

    const createProject = async () => {
        if (!form.title?.trim()) { setError("Tên project là bắt buộc"); return; }
        setError("");
        const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, chairman_id: currentUser.id }),
        });
        if (!res.ok) {
            const data = await res.json();
            setError(data.error);
            return;
        }
        setShowCreate(false);
        setForm({});
        reload();
    };

    const STATUS_CONFIG = {
        draft: { color: "#94A3B8", label: "Draft", bg: "#F1F5F9" },
        active: { color: "#10B981", label: "Active", bg: "#ECFDF5" },
        completed: { color: "#3B82F6", label: "Completed", bg: "#EFF6FF" },
        archived: { color: "#64748B", label: "Archived", bg: "#F8FAFC" },
    };

    if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Đang tải...</div>;

    return (
        <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h2 style={{ color: "#0F172A", margin: 0, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                        <FolderKanban size={22} color="#8B5CF6" /> Quản lý Projects
                    </h2>
                    <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 13 }}>{projects.length} projects</p>
                </div>
                {isChairman && (
                    <button onClick={() => { setForm({ title: "", description: "", lead_id: "", deadline: "" }); setShowCreate(true); setError(""); }}
                        style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                        <Plus size={16} /> Tạo Project
                    </button>
                )}
            </div>

            {/* Project grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
                {projects.map(p => {
                    const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
                    return (
                        <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                            <div style={{
                                background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 18,
                                transition: "all 0.2s", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                            }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#8B5CF620"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(139,92,246,0.08)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{p.title}</div>
                                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{p.slug}</div>
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: sc.color, background: sc.bg, padding: "3px 10px", borderRadius: 10, border: `1px solid ${sc.color}20` }}>{sc.label}</span>
                                </div>
                                {p.description && (
                                    <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.description}</div>
                                )}
                                <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#94A3B8" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <UsersIcon size={12} /> {p.lead?.display_name || "Chưa có lead"}
                                    </span>
                                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <Calendar size={12} /> {p.deadline ? new Date(p.deadline).toLocaleDateString("vi-VN") : "—"}
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                                    <ChevronRight size={16} color="#94A3B8" />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {projects.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>
                    <FolderKanban size={48} strokeWidth={1} style={{ opacity: 0.3 }} />
                    <div style={{ fontSize: 14, marginTop: 12 }}>
                        {isChairman ? "Chưa có project nào. Nhấn \"Tạo Project\" để bắt đầu!" : "Chưa có project nào được tạo."}
                    </div>
                </div>
            )}

            {/* Create Project Modal */}
            {showCreate && (
                <Modal title="🚀 Tạo Project mới" onClose={() => setShowCreate(false)}>
                    {error && (
                        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "#DC2626", fontSize: 13 }}>⚠️ {error}</div>
                    )}
                    <Input label="Tên project *" value={form.title || ""} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="VD: AI Together Platform" />
                    <Input label="Mô tả" value={form.description || ""} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Mục tiêu sản phẩm, yêu cầu chính..." />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Select label="Project Lead" value={form.lead_id || ""} onChange={v => setForm(f => ({ ...f, lead_id: v }))}
                            options={users.filter(u => u.role !== "developer" || true).map(u => ({ value: u.id, label: `${u.display_name} (${u.role})` }))}
                            placeholder="Chọn người phụ trách" />
                        <Input label="Deadline" value={form.deadline || ""} onChange={v => setForm(f => ({ ...f, deadline: v }))} placeholder="YYYY-MM-DD" />
                    </div>
                    <button onClick={createProject}
                        style={{ width: "100%", background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#fff", border: "none", borderRadius: 8, padding: "10px", cursor: "pointer", fontWeight: 600, fontSize: 13, marginTop: 12 }}>
                        🚀 Tạo Project
                    </button>
                </Modal>
            )}
        </div>
    );
}
