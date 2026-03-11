"use client";
import { useState } from "react";
import { useUser } from "@/lib/UserContext";
import { X, UserPlus, Send } from "lucide-react";

export default function AssignModuleModal({ projectId, users = [], onClose, onCreated }) {
    const { currentUser } = useUser();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [priority, setPriority] = useState("medium");
    const [deadline, setDeadline] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const toggleUser = (uid) => {
        setSelectedUsers(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) { setError("Tên module là bắt buộc"); return; }
        setSubmitting(true);
        setError("");

        try {
            const res = await fetch("/api/modules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project_id: projectId,
                    title: title.trim(),
                    description: description.trim(),
                    assigned_to_ids: selectedUsers,
                    assigned_by: currentUser?.id,
                    priority,
                    deadline: deadline || null,
                    created_by: currentUser?.id,
                }),
            });
            if (res.ok) {
                onCreated?.();
                onClose?.();
            } else {
                const data = await res.json();
                setError(data.error || "Lỗi tạo module");
            }
        } catch {
            setError("Lỗi kết nối");
        }
        setSubmitting(false);
    };

    const inputStyle = {
        width: "100%", padding: "10px 14px", borderRadius: 10,
        border: "1px solid var(--border-primary)", background: "var(--bg-tertiary)",
        color: "var(--text-primary)", fontSize: 13, outline: "none",
        boxSizing: "border-box",
    };
    const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={onClose}>
            <div className="scale-in" onClick={e => e.stopPropagation()} style={{
                width: 480, maxHeight: "90vh", overflow: "auto",
                background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-xl)",
            }}>
                {/* Header */}
                <div style={{
                    padding: "18px 22px", borderBottom: "1px solid var(--border-primary)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <UserPlus size={18} color="var(--accent)" />
                        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                            Giao Module Mới
                        </span>
                    </div>
                    <button onClick={onClose} style={{
                        background: "var(--bg-tertiary)", border: "none", borderRadius: 8,
                        padding: 6, cursor: "pointer", color: "var(--text-muted)", display: "flex",
                    }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: "18px 22px" }}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Tên Module *</label>
                        <input value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="VD: Thiết kế giao diện Login" style={inputStyle} autoFocus />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Mô tả</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Chi tiết yêu cầu..."
                            rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div>
                            <label style={labelStyle}>Giao cho (chọn nhiều)</label>
                            <div style={{ maxHeight: 140, overflowY: "auto", border: "1px solid var(--border-primary)", borderRadius: 10, background: "var(--bg-tertiary)" }}>
                                {users.map(u => {
                                    const sel = selectedUsers.includes(u.id);
                                    return (
                                        <div
                                            key={u.id}
                                            onClick={() => toggleUser(u.id)}
                                            style={{
                                                padding: "7px 12px", fontSize: 13, cursor: "pointer",
                                                display: "flex", alignItems: "center", gap: 8,
                                                borderBottom: "1px solid var(--border-primary)",
                                                background: sel ? "var(--accent-bg)" : "transparent",
                                                color: sel ? "var(--accent)" : "var(--text-primary)",
                                                fontWeight: sel ? 600 : 400,
                                            }}
                                        >
                                            <span style={{
                                                width: 16, height: 16, borderRadius: 4,
                                                border: sel ? "2px solid var(--accent)" : "2px solid var(--border-secondary)",
                                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 10, background: sel ? "var(--accent)" : "transparent",
                                                color: "#fff", flexShrink: 0,
                                            }}>{sel ? "✓" : ""}</span>
                                            {u.avatar} {u.display_name}
                                        </div>
                                    );
                                })}
                            </div>
                            {selectedUsers.length > 0 && (
                                <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, fontWeight: 600 }}>
                                    Đã chọn {selectedUsers.length} người
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={labelStyle}>Ưu tiên</label>
                            <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                                <option value="critical">🔴 Critical</option>
                                <option value="high">🟠 High</option>
                                <option value="medium">🔵 Medium</option>
                                <option value="low">⚪ Low</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Deadline</label>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inputStyle} />
                    </div>

                    {error && (
                        <div style={{
                            padding: "10px 14px", borderRadius: 8,
                            background: "#EF444410", border: "1px solid #EF444430",
                            color: "#EF4444", fontSize: 13, marginBottom: 14,
                        }}>{error}</div>
                    )}

                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={onClose} style={{
                            flex: 1, padding: "10px 0", borderRadius: 10,
                            background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
                            color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}>Hủy</button>
                        <button type="submit" disabled={submitting} style={{
                            flex: 1, padding: "10px 0", borderRadius: 10,
                            background: "var(--gradient-brand)", border: "none",
                            color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            opacity: submitting ? 0.6 : 1,
                        }}>
                            <Send size={14} /> {submitting ? "Đang tạo..." : "Tạo & Giao"}
                        </button>
                    </div>

                    {currentUser && (
                        <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                            Giao bởi: {currentUser.avatar} {currentUser.display_name}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

