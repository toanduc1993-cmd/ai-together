"use client";
import { useState, useEffect, useRef } from "react";
import { useUser } from "@/lib/UserContext";
import { MessageCircle, Send } from "lucide-react";

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
    const inputRef = useRef(null);
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
                setComments(Array.isArray(data) ? data : []);
            }
        } catch { }
        setLoading(false);
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
        if (!text.trim() || !currentUser?.id || sending) return;
        setSending(true);
        try {
            const mentions = extractMentions(text);
            const res = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    module_id: moduleId,
                    user_id: currentUser.id,
                    text: text.trim(),
                    project_id: projectId || null,
                    mentions,
                }),
            });
            if (res.ok) {
                setText("");
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
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            {/* Input with @mention */}
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
                        disabled={!text.trim() || sending}
                        style={{
                            width: 38, height: 38, borderRadius: 10, border: "none",
                            background: text.trim() ? "var(--gradient-brand)" : "var(--bg-tertiary)",
                            color: text.trim() ? "#fff" : "var(--text-muted)",
                            cursor: text.trim() ? "pointer" : "default",
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
