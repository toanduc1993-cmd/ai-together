"use client";
import { useState, useEffect } from "react";
import { Users, UserPlus, Tag, Edit3, Trash2, Shield, ShieldCheck, ShieldAlert, Search, X } from "lucide-react";
import Badge from "@/components/Badge";
import Btn from "@/components/Btn";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { calcTempo, timeAgo } from "@/lib/helpers";
import { useUser } from "@/lib/UserContext";

const PERMISSION_LABELS = {
    canCreateTask: { label: "Tạo task", desc: "Tạo task mới trên Task Board", icon: "📝" },
    canAssignTask: { label: "Giao task", desc: "Giao việc cho người khác", icon: "📋" },
    canChangeStatus: { label: "Đổi trạng thái", desc: "Thay đổi status task", icon: "🔄" },
    canComment: { label: "Trao đổi", desc: "Comment trong tasks", icon: "💬" },
    canManageMembers: { label: "Quản lý user", desc: "Thêm, sửa, xoá thành viên", icon: "👥" },
    canManageRoles: { label: "Quản lý Role", desc: "Tạo, sửa vai trò & quyền", icon: "🏷️" },
    canViewDashboard: { label: "Xem Dashboard", desc: "Truy cập trang Dashboard", icon: "📊" },
    canViewWorkflow: { label: "Xem Workflow", desc: "Truy cập trang Workflow", icon: "📁" },
};

const DEFAULT_PERMISSIONS = {
    canCreateTask: true,
    canAssignTask: false,
    canChangeStatus: true,
    canComment: true,
    canManageMembers: false,
    canManageRoles: false,
    canViewDashboard: true,
    canViewWorkflow: true,
};

export default function TeamPage() {
    const { currentUser, hasPermission, updateUser } = useUser();
    const [members, setMembers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [activities, setActivities] = useState([]);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showAddRole, setShowAddRole] = useState(false);
    const [editMember, setEditMember] = useState(null);
    const [showPermissions, setShowPermissions] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [form, setForm] = useState({});
    const [error, setError] = useState("");

    const reload = () => Promise.all([
        fetch("/api/members").then(r => r.json()),
        fetch("/api/roles").then(r => r.json()),
        fetch("/api/activities").then(r => r.json()),
    ]).then(([m, r, a]) => { setMembers(m); setRoles(r); setActivities(a); });

    useEffect(() => { reload(); }, []);

    const canManage = hasPermission("canManageMembers");
    const canManageRoles = hasPermission("canManageRoles");

    // Case-insensitive filter
    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const openAdd = () => {
        setForm({ name: "", email: "", avatar: "🧑‍💻", role: "", permissions: { ...DEFAULT_PERMISSIONS } });
        setShowAddMember(true);
        setError("");
    };

    const openEdit = (m) => {
        setForm({ ...m, permissions: m.permissions || { ...DEFAULT_PERMISSIONS } });
        setEditMember(m.id);
        setError("");
    };

    const saveMember = async () => {
        if (!form.name?.trim()) { setError("Tên không được để trống"); return; }
        setError("");

        if (editMember) {
            const res = await fetch("/api/members", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editMember, ...form }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Lỗi khi lưu");
                return;
            }
            const updated = await res.json();
            // If editing self, update context
            if (currentUser?.id?.toLowerCase() === editMember.toLowerCase()) {
                updateUser(updated);
            }
            setEditMember(null);
        } else {
            const res = await fetch("/api/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Lỗi khi thêm");
                return;
            }
            setShowAddMember(false);
        }
        setForm({});
        reload();
    };

    const deleteMember = async (id) => {
        const res = await fetch(`/api/members?id=${id}`, { method: "DELETE" });
        if (!res.ok) {
            const data = await res.json();
            setError(data.error || "Lỗi khi xoá");
            setConfirmDelete(null);
            return;
        }
        setConfirmDelete(null);
        reload();
    };

    const savePermissions = async (memberId, permissions) => {
        await fetch("/api/members", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: memberId, permissions }),
        });
        // If editing self, refresh user
        if (currentUser?.id?.toLowerCase() === memberId.toLowerCase()) {
            const updated = await fetch("/api/members").then(r => r.json());
            const self = updated.find(m => m.id.toLowerCase() === memberId.toLowerCase());
            if (self) updateUser(self);
        }
        reload();
    };

    const saveRole = async () => {
        if (!form.name) return;
        await fetch("/api/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        setShowAddRole(false); setForm({}); reload();
    };

    return (
        <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h2 style={{ color: "#0F172A", margin: 0, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
                        <Users size={22} color="#8B5CF6" /> Team & Quản trị User
                    </h2>
                    <p style={{ color: "#64748B", margin: "4px 0 0", fontSize: 13 }}>
                        Quản lý thành viên, phân quyền, vai trò — {members.length} thành viên
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    {canManage && (
                        <Btn onClick={openAdd} color="#8B5CF6"><UserPlus size={14} /> Thêm thành viên</Btn>
                    )}
                    {canManageRoles && (
                        <Btn onClick={() => { setForm({ name: "", color: "#3B82F6", desc: "" }); setShowAddRole(true); }} color="#94A3B8" variant="outline"><Tag size={14} /> Thêm Role</Btn>
                    )}
                </div>
            </div>

            {/* Search bar — case-insensitive */}
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                    display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF",
                    border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", flex: 1, maxWidth: 400,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                    <Search size={16} color="#94A3B8" />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Tìm thành viên (không phân biệt HOA/thường)..."
                        style={{ border: "none", background: "none", outline: "none", fontSize: 13, color: "#0F172A", width: "100%", fontFamily: "inherit" }}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 0 }}>
                            <X size={14} />
                        </button>
                    )}
                </div>
                <span style={{ color: "#94A3B8", fontSize: 12 }}>{filteredMembers.length} kết quả</span>
            </div>

            {/* Permission info */}
            {!canManage && currentUser && (
                <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldAlert size={16} color="#D97706" />
                    <span style={{ color: "#92400E", fontSize: 13 }}>Bạn không có quyền quản lý user. Liên hệ Chairman để được cấp quyền.</span>
                </div>
            )}

            {/* Member cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12, marginBottom: 24 }}>
                {filteredMembers.map(m => {
                    const role = m.role ? roles.find(r => r.id === m.role) : null;
                    const tempo = calcTempo(m.id, activities);
                    const isChairman = m.role === "chairman";
                    const permCount = m.permissions ? Object.values(m.permissions).filter(Boolean).length : 0;

                    return (
                        <div key={m.id} style={{
                            background: "#FFFFFF", borderRadius: 12, padding: 16,
                            border: `1px solid ${isChairman ? "#F59E0B40" : "#E2E8F0"}`,
                            boxShadow: isChairman ? "0 2px 8px rgba(245,158,11,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ display: "flex", gap: 10 }}>
                                    <span style={{ fontSize: 32 }}>{m.avatar}</span>
                                    <div>
                                        <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                                        <div style={{ color: "#94A3B8", fontSize: 12 }}>{m.email || "—"}</div>
                                        <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                                            {role ? <Badge color={role.color}>{role.name}</Badge> : <Badge color="#94A3B8">Chưa phân vai trò</Badge>}
                                            <Badge color={tempo.color}>{tempo.label}</Badge>
                                            {isChairman && <Badge color="#F59E0B">👑 Full quyền</Badge>}
                                        </div>
                                    </div>
                                </div>
                                {canManage && (
                                    <div style={{ display: "flex", gap: 4 }}>
                                        <button onClick={() => setShowPermissions(m)} style={{ background: "#F1F5F9", border: "none", borderRadius: 6, padding: "6px", cursor: "pointer", color: "#64748B" }} title="Phân quyền">
                                            <Shield size={14} />
                                        </button>
                                        <button onClick={() => openEdit(m)} style={{ background: "#F1F5F9", border: "none", borderRadius: 6, padding: "6px", cursor: "pointer", color: "#64748B" }} title="Sửa">
                                            <Edit3 size={14} />
                                        </button>
                                        {!isChairman && (
                                            <button onClick={() => setConfirmDelete(m)} style={{ background: "#FEF2F2", border: "none", borderRadius: 6, padding: "6px", cursor: "pointer", color: "#EF4444" }} title="Xoá">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Tempo bar */}
                            <div style={{ marginTop: 12, padding: "8px 10px", background: "#F8FAFC", borderRadius: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ color: "#64748B", fontSize: 11 }}>Tempo</span>
                                    <span style={{ color: tempo.color, fontSize: 11, fontWeight: 600 }}>{tempo.score}/100</span>
                                </div>
                                <div style={{ height: 4, background: "#E2E8F0", borderRadius: 2 }}>
                                    <div style={{ width: `${tempo.score}%`, height: "100%", background: tempo.color, borderRadius: 2, transition: "width 0.5s" }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                                    <span style={{ color: "#94A3B8", fontSize: 10 }}>
                                        {tempo.lastActive ? `Hoạt động ${timeAgo(tempo.lastActive)}` : "Chưa có hoạt động"}
                                    </span>
                                    {tempo.streak > 0 && <span style={{ color: "#F59E0B", fontSize: 10 }}>🔥 {tempo.streak} ngày</span>}
                                </div>
                            </div>

                            {/* Permissions summary */}
                            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                                <ShieldCheck size={12} color={isChairman ? "#F59E0B" : "#10B981"} />
                                <span style={{ color: "#94A3B8", fontSize: 11 }}>
                                    {isChairman ? "Tất cả quyền" : `${permCount}/${Object.keys(PERMISSION_LABELS).length} quyền`}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Roles section */}
            <h3 style={{ color: "#0F172A", fontSize: 15, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <Tag size={16} color="#8B5CF6" /> Vai trò có thể gán
            </h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {roles.map(r => (
                    <div key={r.id} style={{ background: `${r.color}08`, padding: "8px 16px", borderRadius: 10, border: `1px solid ${r.color}20` }}>
                        <div style={{ color: r.color, fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                        <div style={{ color: "#64748B", fontSize: 11 }}>{r.desc}</div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Member Modal */}
            {(showAddMember || editMember) && (
                <Modal title={editMember ? "✏️ Sửa thành viên" : "➕ Thêm thành viên mới"} onClose={() => { setShowAddMember(false); setEditMember(null); setForm({}); setError(""); }}>
                    {error && (
                        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "#DC2626", fontSize: 13 }}>
                            ⚠️ {error}
                        </div>
                    )}
                    <Input label="Tên thành viên *" value={form.name || ""} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Nhập tên (không phân biệt hoa/thường khi đăng nhập)" />
                    <Input label="Email" value={form.email || ""} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="email@libetech.vn" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Select label="Vai trò" value={form.role || ""} onChange={v => setForm(f => ({ ...f, role: v }))} options={roles.map(r => ({ value: r.id, label: r.name }))} placeholder="Chọn vai trò" />
                        <Input label="Avatar (emoji)" value={form.avatar || ""} onChange={v => setForm(f => ({ ...f, avatar: v }))} placeholder="🧑‍💻" />
                    </div>

                    {/* Permissions in form */}
                    <div style={{ marginTop: 8 }}>
                        <label style={{ color: "#64748B", fontSize: 12, fontWeight: 500, display: "block", marginBottom: 8 }}>Phân quyền chức năng</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            {Object.entries(PERMISSION_LABELS).map(([key, { label, icon }]) => {
                                const checked = form.permissions?.[key] ?? DEFAULT_PERMISSIONS[key];
                                return (
                                    <label key={key} style={{
                                        display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                                        background: checked ? "#ECFDF5" : "#F8FAFC",
                                        border: `1px solid ${checked ? "#10B98140" : "#E2E8F0"}`,
                                        borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#0F172A",
                                        transition: "all 0.2s",
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={e => setForm(f => ({
                                                ...f,
                                                permissions: { ...f.permissions, [key]: e.target.checked },
                                            }))}
                                            style={{ accentColor: "#10B981" }}
                                        />
                                        <span>{icon}</span>
                                        <span>{label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <Btn onClick={saveMember} color="#8B5CF6" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
                        {editMember ? "💾 Lưu thay đổi" : "➕ Thêm thành viên"}
                    </Btn>
                </Modal>
            )}

            {/* Permissions Modal */}
            {showPermissions && (
                <Modal title={`🛡️ Phân quyền — ${showPermissions.name}`} onClose={() => setShowPermissions(null)} width={500}>
                    {showPermissions.role === "chairman" ? (
                        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "16px", textAlign: "center" }}>
                            <span style={{ fontSize: 32 }}>👑</span>
                            <div style={{ color: "#92400E", fontWeight: 600, fontSize: 14, marginTop: 8 }}>Chairman có tất cả quyền</div>
                            <div style={{ color: "#78716C", fontSize: 12, marginTop: 4 }}>Không cần phân quyền riêng cho Chairman</div>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {Object.entries(PERMISSION_LABELS).map(([key, { label, desc, icon }]) => {
                                const perms = showPermissions.permissions || DEFAULT_PERMISSIONS;
                                const checked = perms[key] ?? false;
                                return (
                                    <div key={key} style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "10px 14px", background: checked ? "#ECFDF5" : "#F8FAFC",
                                        border: `1px solid ${checked ? "#10B98130" : "#E2E8F0"}`,
                                        borderRadius: 8, transition: "all 0.2s",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                                            <span style={{ fontSize: 18 }}>{icon}</span>
                                            <div>
                                                <div style={{ color: "#0F172A", fontSize: 13, fontWeight: 500 }}>{label}</div>
                                                <div style={{ color: "#94A3B8", fontSize: 11 }}>{desc}</div>
                                            </div>
                                        </div>
                                        <label style={{ position: "relative", width: 44, height: 24, cursor: "pointer" }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={e => {
                                                    const newPerms = { ...perms, [key]: e.target.checked };
                                                    const updated = { ...showPermissions, permissions: newPerms };
                                                    setShowPermissions(updated);
                                                    savePermissions(showPermissions.id, newPerms);
                                                }}
                                                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                                            />
                                            <div style={{
                                                width: 44, height: 24, borderRadius: 12,
                                                background: checked ? "#10B981" : "#CBD5E1",
                                                transition: "background 0.2s", position: "relative",
                                            }}>
                                                <div style={{
                                                    width: 20, height: 20, borderRadius: "50%",
                                                    background: "#FFFFFF", position: "absolute",
                                                    top: 2, left: checked ? 22 : 2,
                                                    transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                                }} />
                                            </div>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <Modal title="⚠️ Xác nhận xoá thành viên" onClose={() => setConfirmDelete(null)} width={420}>
                    <div style={{ textAlign: "center", padding: "12px 0" }}>
                        <span style={{ fontSize: 48 }}>{confirmDelete.avatar}</span>
                        <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 18, marginTop: 8 }}>{confirmDelete.name}</div>
                        <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>{confirmDelete.email}</div>
                        <div style={{ color: "#EF4444", fontSize: 13, marginTop: 12, padding: "8px 16px", background: "#FEF2F2", borderRadius: 8, display: "inline-block" }}>
                            Thành viên sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                        <Btn onClick={() => setConfirmDelete(null)} color="#94A3B8" variant="outline" style={{ flex: 1, justifyContent: "center" }}>Huỷ</Btn>
                        <Btn onClick={() => deleteMember(confirmDelete.id)} color="#EF4444" style={{ flex: 1, justifyContent: "center" }}>
                            <Trash2 size={14} /> Xoá thành viên
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* Add Role Modal */}
            {showAddRole && (
                <Modal title="🏷️ Thêm vai trò mới" onClose={() => setShowAddRole(false)}>
                    <Input label="Tên vai trò" value={form.name || ""} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="VD: DevOps Engineer" />
                    <Input label="Mô tả" value={form.desc || ""} onChange={v => setForm(f => ({ ...f, desc: v }))} placeholder="Trách nhiệm chính..." />
                    <Input label="Màu (hex)" value={form.color || ""} onChange={v => setForm(f => ({ ...f, color: v }))} placeholder="#3B82F6" />
                    <Btn onClick={saveRole} color="#10B981" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>Thêm Role</Btn>
                </Modal>
            )}
        </div>
    );
}
