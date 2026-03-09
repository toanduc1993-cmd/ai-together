"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/lib/UserContext";
import { Users, Plus, Edit2, Trash2, Shield } from "lucide-react";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";

export default function TeamPage() {
    const { currentUser, isChairman } = useUser();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(null);
    const [form, setForm] = useState({});
    const [error, setError] = useState("");

    const reload = async () => {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    useEffect(() => { reload(); }, []);

    const ROLE_CONFIG = {
        chairman: { color: "#F59E0B", bg: "#FFFBEB", label: "Chairman" },
        project_lead: { color: "#8B5CF6", bg: "#F5F3FF", label: "Project Lead" },
        developer: { color: "#3B82F6", bg: "#EFF6FF", label: "Developer" },
        admin: { color: "#EF4444", bg: "#FEF2F2", label: "Admin" },
    };

    const addUser = async () => {
        if (!form.username?.trim() || !form.display_name?.trim()) { setError("Username và tên hiển thị bắt buộc"); return; }
        setError("");
        const res = await fetch("/api/users", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        if (!res.ok) { setError((await res.json()).error); return; }
        setShowAdd(false); setForm({}); reload();
    };

    const editUser = async () => {
        setError("");
        const res = await fetch("/api/users", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: showEdit, ...form }),
        });
        if (!res.ok) { setError((await res.json()).error); return; }
        setShowEdit(null); setForm({}); reload();
    };

    const delUser = async (id) => {
        if (!confirm("Bạn chắc chắn muốn xoá?")) return;
        await fetch(`/api/users?id=${id}`, { method: "DELETE" });
        reload();
    };

    if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Đang tải...</div>;

    return (
        <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h2 style={{ color: "#0F172A", margin: 0, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                        <Users size={22} color="#10B981" /> Quản lý Team
                    </h2>
                    <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 13 }}>{users.length} thành viên</p>
                </div>
                {isChairman && (
                    <button onClick={() => { setForm({ role: "developer" }); setShowAdd(true); setError(""); }}
                        style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                        <Plus size={16} /> Thêm thành viên
                    </button>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {users.map(u => {
                    const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.developer;
                    return (
                        <div key={u.id} style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 16, transition: "all 0.2s" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                <span style={{ fontSize: 28 }}>{u.avatar}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{u.display_name}</div>
                                    <div style={{ fontSize: 11, color: "#94A3B8" }}>@{u.username}</div>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 600, color: rc.color, background: rc.bg, padding: "3px 8px", borderRadius: 8, border: `1px solid ${rc.color}20` }}>{rc.label}</span>
                            </div>
                            {u.email && <div style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>📧 {u.email}</div>}
                            {u.bio && <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 8 }}>{u.bio}</div>}
                            {isChairman && u.role !== "chairman" && (
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => { setShowEdit(u.id); setForm({ display_name: u.display_name, role: u.role, email: u.email, bio: u.bio, avatar: u.avatar }); setError(""); }}
                                        style={{ flex: 1, background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 6, padding: "5px", cursor: "pointer", fontSize: 11, color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                                        <Edit2 size={11} /> Sửa
                                    </button>
                                    <button onClick={() => delUser(u.id)}
                                        style={{ background: "#FEF2F2", border: "1px solid #FCA5A520", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {showAdd && (
                <Modal title="👤 Thêm thành viên" onClose={() => setShowAdd(false)}>
                    {error && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Input label="Username *" value={form.username || ""} onChange={v => setForm(f => ({ ...f, username: v }))} />
                    <Input label="Tên hiển thị *" value={form.display_name || ""} onChange={v => setForm(f => ({ ...f, display_name: v }))} />
                    <Input label="Email" value={form.email || ""} onChange={v => setForm(f => ({ ...f, email: v }))} />
                    <Select label="Vai trò" value={form.role || "developer"} onChange={v => setForm(f => ({ ...f, role: v }))}
                        options={[{ value: "project_lead", label: "Project Lead" }, { value: "developer", label: "Developer" }, { value: "admin", label: "Admin" }]} />
                    <button onClick={addUser} style={{ width: "100%", background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", border: "none", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, marginTop: 8 }}>Thêm</button>
                </Modal>
            )}

            {showEdit && (
                <Modal title="✏️ Chỉnh sửa thành viên" onClose={() => setShowEdit(null)}>
                    {error && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>⚠️ {error}</div>}
                    <Input label="Tên hiển thị" value={form.display_name || ""} onChange={v => setForm(f => ({ ...f, display_name: v }))} />
                    <Input label="Email" value={form.email || ""} onChange={v => setForm(f => ({ ...f, email: v }))} />
                    <Select label="Vai trò" value={form.role || "developer"} onChange={v => setForm(f => ({ ...f, role: v }))}
                        options={[{ value: "project_lead", label: "Project Lead" }, { value: "developer", label: "Developer" }]} />
                    <Input label="Bio" value={form.bio || ""} onChange={v => setForm(f => ({ ...f, bio: v }))} />
                    <button onClick={editUser} style={{ width: "100%", background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", color: "#fff", border: "none", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, marginTop: 8 }}>Lưu</button>
                </Modal>
            )}
        </div>
    );
}
