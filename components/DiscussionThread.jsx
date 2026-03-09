"use client";
import { useState, useEffect, useRef } from "react";
import { useUser } from "@/lib/UserContext";
import { MessageCircle, Send } from "lucide-react";

export default function DiscussionThread({ moduleId, projectId }) {
    const { currentUser } = useUser();
    const [comments, setComments] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const endRef = useRef(null);

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

    const handleSend = async () => {
        if (!text.trim() || !currentUser?.id || sending) return;
        setSending(true);
        try {
            const res = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    module_id: moduleId,
                    user_id: currentUser.id,
                    text: text.trim(),
                    project_id: projectId || null,
                }),
            });
            if (res.ok) {
                setText("");
                await fetchComments();
            }
        } catch { }
        setSending(false);
    };

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
                                    {c.detail}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            {/* Input */}
            <div style={{
                padding: "12px 18px", borderTop: "1px solid var(--border-primary)",
                display: "flex", gap: 8, alignItems: "center",
            }}>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Nhập bình luận..."
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
    );
}
