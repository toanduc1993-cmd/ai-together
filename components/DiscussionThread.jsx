"use client";
import { useState, useEffect, useRef } from "react";
import { useUser } from "@/lib/UserContext";
import { MessageCircle, Send, Paperclip, X, Download } from "lucide-react";

/* ========== Render comment text with highlighted @mentions ========== */
function RenderMentionText({ text, users }) {
    if (!text) return null;
    // Split on @username patterns (word chars, dots, hyphens)
    const parts = text.split(/(@[\w.\-]+)/g);
    return parts.map((part, i) => {
        if (part.startsWith("@")) {
            const username = part.slice(1);
            const user = users.find(u =>
                u.username?.toLowerCase() === username.toLowerCase() ||
                u.display_name?.toLowerCase() === username.toLowerCase()
            );
            return (
                <span key={i} style={{
                    background: "var(--accent-bg)", color: "var(--accent)",
                    fontWeight: 600, padding: "1px 5px", borderRadius: 4,
                    cursor: "default",
                }} title={user ? user.display_name : username}>
                    {part}
                </span>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

/* ========== File icon helper ========== */
function getFileIcon(type) {
    if (!type) return "📄";
    if (type.startsWith("image/")) return "🖼️";
    if (type.includes("pdf")) return "📕";
    if (type.includes("word") || type.includes("document")) return "📘";
    if (type.includes("sheet") || type.includes("excel")) return "📗";
    if (type.includes("zip") || type.includes("rar")) return "📦";
    if (type.includes("video")) return "🎬";
    return "📄";
}

function formatFileSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DiscussionThread({ moduleId, projectId }) {
    const { currentUser } = useUser();
    const [comments, setComments] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [users, setUsers] = useState([]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState("");
    const [mentionIndex, setMentionIndex] = useState(0);
    const [cursorPos, setCursorPos] = useState(0);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [commentFiles, setCommentFiles] = useState({});
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const endRef = useRef(null);
    const mentionRef = useRef(null);

    // Fetch users for @mention
    useEffect(() => {
        fetch("/api/users").then(r => r.json()).then(d => {
            setUsers(Array.isArray(d) ? d : []);
        }).catch(() => { });
    }, []);

    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/comments?module_id=${moduleId}`);
            if (res.ok) {
                const data = await res.json();
                const comments = Array.isArray(data) ? data : [];
                setComments(comments);
                // Fetch files for each comment
                for (const c of comments) {
                    fetchCommentFiles(c.id);
                }
            }
        } catch { }
        setLoading(false);
    };

    const fetchCommentFiles = async (activityId) => {
        try {
            const res = await fetch(`/api/files?activity_id=${activityId}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setCommentFiles(prev => ({ ...prev, [activityId]: data }));
                }
            }
        } catch { }
    };

    useEffect(() => {
        if (!moduleId) return;
        fetchComments();
        const interval = setInterval(fetchComments, 15000);
        return () => clearInterval(interval);
    }, [moduleId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [comments.length]);

    // Extract @mentions from text
    const extractMentions = (txt) => {
        const matches = txt.match(/@[\w.\-]+/g) || [];
        return matches.map(m => m.slice(1));
    };

    const handleSend = async () => {
        if ((!text.trim() && pendingFiles.length === 0) || !currentUser?.id || sending) return;
        setSending(true);
        try {
            const mentions = extractMentions(text);
            const res = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    module_id: moduleId,
                    user_id: currentUser.id,
                    text: text.trim() || (pendingFiles.length > 0 ? `📎 ${pendingFiles.length} file đính kèm` : ""),
                    project_id: projectId || null,
                    mentions,
                }),
            });
            if (res.ok) {
                const activity = await res.json();
                // Upload pending files linked to this comment's activity_id
                if (pendingFiles.length > 0 && activity?.id) {
                    for (const file of pendingFiles) {
                        const fd = new FormData();
                        fd.append("file", file);
                        fd.append("activity_id", activity.id);
                        fd.append("module_id", moduleId);
                        fd.append("uploaded_by", currentUser.id);
                        fd.append("label", "Comment attachment");
                        await fetch("/api/files", { method: "POST", body: fd });
                    }
                }
                setText("");
                setPendingFiles([]);
                setShowMentions(false);
                await fetchComments();
            }
        } catch { }
        setSending(false);
    };

    // Handle text change — detect @ trigger
    const handleTextChange = (e) => {
        const val = e.target.value;
        const pos = e.target.selectionStart;
        setText(val);
        setCursorPos(pos);

        // Find the @ trigger: look backwards from cursor for @
        const before = val.slice(0, pos);
        const atIdx = before.lastIndexOf("@");
        if (atIdx >= 0) {
            const afterAt = before.slice(atIdx + 1);
            // Only show dropdown if @ is at start or after a space, and no space in the query
            const charBefore = atIdx > 0 ? before[atIdx - 1] : " ";
            if ((charBefore === " " || charBefore === "\n" || atIdx === 0) && !afterAt.includes(" ")) {
                setMentionFilter(afterAt.toLowerCase());
                setShowMentions(true);
                setMentionIndex(0);
                return;
            }
        }
        setShowMentions(false);
    };

    // Filter users by mention query
    const filteredUsers = users.filter(u =>
        u.display_name?.toLowerCase().includes(mentionFilter) ||
        u.username?.toLowerCase().includes(mentionFilter)
    ).slice(0, 6);

    // Insert mention into text
    const insertMention = (user) => {
        const before = text.slice(0, cursorPos);
        const after = text.slice(cursorPos);
        const atIdx = before.lastIndexOf("@");
        const mentionName = user.username || user.display_name.replace(/\s+/g, "_");
        const newText = before.slice(0, atIdx) + "@" + mentionName + " " + after;
        setText(newText);
        setShowMentions(false);
        // Focus input and set cursor
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newPos = atIdx + 1 + mentionName.length + 1;
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    // Keyboard nav in mention dropdown
    const handleKeyDown = (e) => {
        if (showMentions && filteredUsers.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex(i => (i + 1) % filteredUsers.length);
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex(i => (i - 1 + filteredUsers.length) % filteredUsers.length);
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(filteredUsers[mentionIndex]);
                return;
            }
            if (e.key === "Escape") {
                setShowMentions(false);
                return;
            }
        }
        if (e.key === "Enter" && !showMentions) {
            handleSend();
        }
    };

    // Close mention dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (mentionRef.current && !mentionRef.current.contains(e.target)) {
                setShowMentions(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const timeAgo = (d) => {
        const s = Math.floor((Date.now() - new Date(d)) / 1000);
        if (s < 60) return "vừa xong";
        if (s < 3600) return `${Math.floor(s / 60)}m`;
        if (s < 86400) return `${Math.floor(s / 3600)}h`;
        return `${Math.floor(s / 86400)}d`;
    };

    return (
        <div style={{
            background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-primary)", overflow: "hidden",
        }}>
            {/* Header */}
            <div style={{
                padding: "14px 18px", borderBottom: "1px solid var(--border-primary)",
                display: "flex", alignItems: "center", gap: 8,
            }}>
                <MessageCircle size={16} color="var(--accent)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                    Trao đổi ({comments.length})
                </span>
            </div>

            {/* Messages */}
            <div style={{ maxHeight: 320, overflowY: "auto", padding: "12px 18px" }}>
                {loading ? (
                    <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Đang tải...</div>
                ) : comments.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                        Chưa có bình luận. Hãy bắt đầu trao đổi! 💬
                    </div>
                ) : comments.map((c) => {
                    const isMe = c.user_id === currentUser?.id;
                    const cFiles = commentFiles[c.id] || [];
                    return (
                        <div key={c.id} style={{
                            display: "flex", gap: 10, marginBottom: 14,
                            flexDirection: isMe ? "row-reverse" : "row",
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: "var(--gradient-brand)", display: "flex",
                                alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
                            }}>
                                {c.user?.avatar || "👤"}
                            </div>
                            <div style={{ maxWidth: "75%" }}>
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    marginBottom: 4, flexDirection: isMe ? "row-reverse" : "row",
                                }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                                        {c.user?.display_name}
                                    </span>
                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                        {timeAgo(c.created_at)}
                                    </span>
                                </div>
                                <div style={{
                                    padding: "10px 14px", borderRadius: 12,
                                    background: isMe ? "var(--accent-bg)" : "var(--bg-tertiary)",
                                    border: isMe ? "1px solid var(--border-active)" : "1px solid var(--border-primary)",
                                    fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5,
                                    wordBreak: "break-word",
                                }}>
                                    <RenderMentionText text={c.detail} users={users} />
                                    {/* Attached files */}
                                    {cFiles.length > 0 && (
                                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-primary)" }}>
                                            {cFiles.map(f => (
                                                <div key={f.id} style={{
                                                    display: "flex", alignItems: "center", gap: 6,
                                                    padding: "4px 0", fontSize: 12,
                                                }}>
                                                    <span style={{ fontSize: 14 }}>{getFileIcon(f.file_type)}</span>
                                                    <span style={{
                                                        flex: 1, color: "var(--text-secondary)", fontWeight: 500,
                                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                    }}>{f.filename}</span>
                                                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{formatFileSize(f.file_size)}</span>
                                                    {f.file_url?.startsWith("http") && (
                                                        <a href={f.file_url} target="_blank" rel="noopener noreferrer" download
                                                            style={{ color: "var(--green)", display: "flex", flexShrink: 0 }}>
                                                            <Download size={13} />
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            {/* Pending files preview */}
            {pendingFiles.length > 0 && (
                <div style={{ padding: "8px 18px", borderTop: "1px solid var(--border-primary)", background: "var(--bg-secondary)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4 }}>📎 File đính kèm ({pendingFiles.length})</div>
                    {pendingFiles.map((f, i) => (
                        <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "4px 0",
                            fontSize: 12, color: "var(--text-secondary)",
                        }}>
                            <span style={{ fontSize: 14 }}>{getFileIcon(f.type)}</span>
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{f.name}</span>
                            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{formatFileSize(f.size)}</span>
                            <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", padding: 0, display: "flex" }}>
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input with @mention + file attach */}
            <div style={{
                padding: "12px 18px", borderTop: "1px solid var(--border-primary)",
                position: "relative",
            }} ref={mentionRef}>
                {/* Mention dropdown */}
                {showMentions && filteredUsers.length > 0 && (
                    <div style={{
                        position: "absolute", bottom: "100%", left: 18, right: 18,
                        background: "var(--bg-elevated)", border: "1px solid var(--border-primary)",
                        borderRadius: 10, boxShadow: "var(--shadow-xl)", marginBottom: 4,
                        maxHeight: 200, overflowY: "auto", zIndex: 100,
                    }}>
                        <div style={{
                            padding: "6px 12px", fontSize: 11, fontWeight: 700,
                            color: "var(--text-muted)", borderBottom: "1px solid var(--border-primary)",
                        }}>
                            👥 Tag người dùng
                        </div>
                        {filteredUsers.map((u, idx) => (
                            <div
                                key={u.id}
                                onClick={() => insertMention(u)}
                                style={{
                                    padding: "8px 14px", cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: 10,
                                    background: idx === mentionIndex ? "var(--bg-tertiary)" : "transparent",
                                    borderBottom: "1px solid var(--border-primary)",
                                    transition: "background 0.1s",
                                }}
                                onMouseEnter={() => setMentionIndex(idx)}
                            >
                                <span style={{ fontSize: 18 }}>{u.avatar || "👤"}</span>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                                        {u.display_name}
                                    </div>
                                    {u.username && (
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                            @{u.username}
                                        </div>
                                    )}
                                </div>
                                <span style={{
                                    marginLeft: "auto", fontSize: 11, padding: "2px 8px",
                                    borderRadius: 6, background: "var(--accent-bg)", color: "var(--accent)",
                                    fontWeight: 600,
                                }}>
                                    {u.role}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {/* Attach file button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        title="Đính kèm file"
                        style={{
                            width: 38, height: 38, borderRadius: 10, border: "none",
                            background: pendingFiles.length > 0 ? "var(--accent-bg)" : "var(--bg-tertiary)",
                            color: pendingFiles.length > 0 ? "var(--accent)" : "var(--text-muted)",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s", position: "relative",
                        }}
                    >
                        <Paperclip size={16} />
                        {pendingFiles.length > 0 && (
                            <span style={{
                                position: "absolute", top: -4, right: -4,
                                width: 16, height: 16, borderRadius: "50%",
                                background: "var(--accent)", color: "#fff",
                                fontSize: 10, fontWeight: 700,
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>{pendingFiles.length}</span>
                        )}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => {
                            if (e.target.files.length > 0) {
                                setPendingFiles(prev => [...prev, ...Array.from(e.target.files)]);
                            }
                            e.target.value = "";
                        }}
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={text}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập bình luận... Gõ @ để tag người"
                        style={{
                            flex: 1, padding: "10px 14px", borderRadius: 10,
                            border: "1px solid var(--border-primary)", background: "var(--bg-tertiary)",
                            color: "var(--text-primary)", fontSize: 13, outline: "none",
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={(!text.trim() && pendingFiles.length === 0) || sending}
                        style={{
                            width: 38, height: 38, borderRadius: 10, border: "none",
                            background: (text.trim() || pendingFiles.length > 0) ? "var(--gradient-brand)" : "var(--bg-tertiary)",
                            color: (text.trim() || pendingFiles.length > 0) ? "#fff" : "var(--text-muted)",
                            cursor: (text.trim() || pendingFiles.length > 0) ? "pointer" : "default",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s",
                        }}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
