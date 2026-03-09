"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { Plus, UserPlus, Pencil, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";

export default function TeamPage() {
    const { currentUser, isChairman } = useUser();
    const [users, setUsers] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [form, setForm] = useState({ username: "", password: "123456", display_name: "", email: "", role: "developer" });
    const [loading, setLoading] = useState(true);

    const load = () => fetch("/api/users").then(r => r.json()).then(u => { setUsers(Array.isArray(u) ? u : []); setLoading(false); });
    useEffect(() => { load(); }, []);

    const save = async () => {
        const method = editUser ? "PUT" : "POST";
        const body = editUser ? { id: editUser.id, display_name: form.display_name, email: form.email, role: form.role } : form;
        await fetch("/api/users", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        setShowAdd(false); setEditUser(null); setForm({ username: "", password: "123456", display_name: "", email: "", role: "developer" }); load();
    };

    const del = async (id) => {
        if (!confirm("Xoá user này?")) return;
        await fetch(`/api/users?id=${id}`, { method: "DELETE" }); load();
    };

    const openEdit = (u) => {
        setEditUser(u); setForm({ display_name: u.display_name, email: u.email, role: u.role }); setShowAdd(true);
    };

    const ROLE_CONFIG = {
        chairman: { color: "var(--amber)", bg: "var(--amber-bg)", label: "Chairman" },
        project_lead: { color: "var(--accent)", bg: "var(--accent-bg)", label: "Project Lead" },
        developer: { color: "var(--green)", bg: "var(--green-bg)", label: "Developer" },
        admin: { color: "var(--red)", bg: "var(--red-bg)", label: "Admin" },
    };

    if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Đang tải...</div>;

    return (
        <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>👥 Team</h1>
                    <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginTop: 4 }}>{users.length} thành viên</p>
                </div>
                {isChairman && (
                    <button onClick={() => { setEditUser(null); setForm({ username: "", password: "123456", display_name: "", email: "", role: "developer" }); setShowAdd(true); }}
                        className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <UserPlus size={15} /> Thêm thành viên
                    </button>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {users.map((u, i) => {
                    const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.developer;
                    return (
                        <div key={u.id} className="glass-card fade-in-up" style={{ padding: "20px 22px", animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12, background: "var(--gradient-brand)",
                                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                                        boxShadow: "0 2px 12px rgba(99, 102, 241, 0.2)",
                                    }}>{u.avatar}</div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{u.display_name}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>@{u.username}</div>
                                    </div>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: rc.bg, color: rc.color }}>{rc.label}</span>
                            </div>

                            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 14 }}>📧</span> {u.email}
                            </div>
                            {u.bio && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>{u.bio}</div>}

                            {isChairman && (
                                <div style={{ display: "flex", gap: 6, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-primary)" }}>
                                    <button onClick={() => openEdit(u)} className="btn-ghost" style={{ flex: 1, padding: "7px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12 }}>
                                        <Pencil size={13} /> Sửa
                                    </button>
                                    <button onClick={() => del(u.id)} style={{
                                        background: "var(--red-bg)", color: "var(--red)", border: "none",
                                        borderRadius: "var(--radius-sm)", padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center",
                                    }}><Trash2 size={13} /></button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {showAdd && (
                <Modal title={editUser ? "✏️ Sửa thành viên" : "➕ Thêm thành viên"} onClose={() => { setShowAdd(false); setEditUser(null); }}>
                    {!editUser && <Input label="Username" placeholder="Nhập username..." value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />}
                    <Input label="Tên hiển thị" placeholder="Nhập tên..." value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
                    <Input label="Email" placeholder="email@libetech.vn" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    <Select label="Vai trò" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                        <option value="developer">Developer</option>
                        <option value="project_lead">Project Lead</option>
                        <option value="chairman">Chairman</option>
                    </Select>
                    <button onClick={save} className="btn-primary" style={{ width: "100%", marginTop: 8 }}>{editUser ? "Cập nhật" : "Thêm"}</button>
                </Modal>
            )}
        </div>
    );
}
