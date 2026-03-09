"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/lib/UserContext";
import { MessageSquare, Send, Pin, Plus, User, Hash } from "lucide-react";
import Modal from "@/components/Modal";

export default function ChatPage() {
    const { currentUser } = useUser();
    const [rooms, setRooms] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [showNewChat, setShowNewChat] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showMentions, setShowMentions] = useState(false);
    const [mentionUsers, setMentionUsers] = useState([]);
    const msgEnd = useRef(null);
    const poll = useRef(null);

    useEffect(() => {
        if (!currentUser?.id) return;
        fetch("/api/users").then(r => r.json()).then(u => setUsers(Array.isArray(u) ? u : []));
        loadRooms();
    }, [currentUser?.id]);

    const loadRooms = async () => {
        if (!currentUser?.id) return;
        const data = await fetch(`/api/chat/rooms?user_id=${currentUser.id}`).then(r => r.json());
        setRooms(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    const loadMsgs = useCallback(async (rid) => {
        const data = await fetch(`/api/chat/messages?room_id=${rid}`).then(r => r.json());
        setMessages(Array.isArray(data) ? data : []);
        setTimeout(() => msgEnd.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }, []);

    useEffect(() => {
        if (!activeRoom) return;
        loadMsgs(activeRoom);
        poll.current = setInterval(() => loadMsgs(activeRoom), 5000);
        return () => clearInterval(poll.current);
    }, [activeRoom, loadMsgs]);

    const send = async () => {
        if (!input.trim() || !activeRoom) return;
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let m;
        while ((m = mentionRegex.exec(input)) !== null) {
            const u = users.find(x => x.username.toLowerCase() === m[1].toLowerCase());
            if (u) mentions.push(u.id);
        }
        await fetch("/api/chat/messages", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: activeRoom, sender_id: currentUser.id, content: input, mentions: [...new Set(mentions)] }),
        });
        setInput(""); loadMsgs(activeRoom);
    };

    const togglePin = async (id, pinned) => {
        await fetch("/api/chat/messages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_pinned: !pinned }) });
        loadMsgs(activeRoom);
    };

    const createDirect = async (uid) => {
        const room = await fetch("/api/chat/rooms", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "direct", member_ids: [currentUser.id, uid] }),
        }).then(r => r.json());
        setShowNewChat(false); loadRooms(); setActiveRoom(room.id);
    };

    const handleInput = (e) => {
        const v = e.target.value; setInput(v);
        const at = v.lastIndexOf("@");
        if (at >= 0 && !/\s/.test(v.slice(at))) {
            const f = v.slice(at + 1).toLowerCase();
            setMentionUsers(users.filter(u => u.id !== currentUser.id && u.username.toLowerCase().includes(f)));
            setShowMentions(true);
        } else setShowMentions(false);
    };

    const insertMention = (un) => { setInput(input.slice(0, input.lastIndexOf("@")) + `@${un} `); setShowMentions(false); };

    const roomName = (r) => {
        if (r.name) return r.name;
        if (r.type === "direct" && r.members) {
            const other = r.members.find(m => m.user_id !== currentUser.id);
            return other?.user?.display_name || "Chat";
        }
        return "Chat Room";
    };

    const filtered = rooms.filter(r => !search || roomName(r).toLowerCase().includes(search.toLowerCase()));
    if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Đang tải...</div>;

    return (
        <div className="fade-in" style={{ display: "flex", height: "calc(100vh - var(--header-height) - 48px)", margin: "-24px -28px", overflow: "hidden", borderRadius: "var(--radius-lg)" }}>
            {/* Rooms */}
            <div style={{ width: 300, background: "var(--bg-elevated)", borderRight: "1px solid var(--border-primary)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <div style={{ padding: 16, borderBottom: "1px solid var(--border-primary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>💬 Chat</h3>
                        <button onClick={() => setShowNewChat(true)} style={{ background: "var(--accent-bg)", border: "1px solid var(--border-active)", borderRadius: 8, padding: "4px 6px", cursor: "pointer", color: "var(--accent)", display: "flex" }}>
                            <Plus size={14} />
                        </button>
                    </div>
                    <input type="text" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} className="input-field" style={{ fontSize: 12, padding: "8px 12px" }} />
                </div>

                <div style={{ flex: 1, overflow: "auto" }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>Nhấn + để bắt đầu chat!</div>
                    ) : filtered.map(room => (
                        <div key={room.id} onClick={() => setActiveRoom(room.id)} style={{
                            padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid var(--border-primary)",
                            background: activeRoom === room.id ? "var(--accent-bg)" : "transparent",
                            borderLeft: activeRoom === room.id ? "3px solid var(--accent)" : "3px solid transparent",
                            transition: "all 0.15s ease",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, color: "#fff" }}>
                                    {room.type === "direct" ? <User size={14} /> : <Hash size={14} />}
                                </div>
                                <div style={{ flex: 1, overflow: "hidden" }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{roomName(room)}</div>
                                    {room.last_message && (
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {room.last_message.content}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-secondary)" }}>
                {!activeRoom ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                                <MessageSquare size={28} strokeWidth={1.5} color="var(--text-muted)" />
                            </div>
                            <div style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>Chọn cuộc trò chuyện</div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
                            {messages.map(msg => {
                                const isMe = msg.sender_id === currentUser.id;
                                return (
                                    <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 10 }}>
                                        <div style={{ maxWidth: "65%" }}>
                                            {!isMe && (
                                                <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, marginBottom: 3, marginLeft: 6 }}>
                                                    {msg.sender?.display_name}
                                                </div>
                                            )}
                                            <div style={{
                                                padding: "10px 14px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                                                background: isMe ? "var(--gradient-brand)" : "var(--bg-elevated)",
                                                color: isMe ? "#fff" : "var(--text-primary)",
                                                border: isMe ? "none" : "1px solid var(--border-primary)",
                                                fontSize: 13, lineHeight: 1.5, boxShadow: isMe ? "0 2px 12px rgba(99,102,241,0.25)" : "var(--shadow-xs)",
                                            }}>
                                                {msg.is_pinned && <span style={{ fontSize: 10 }}>📌 </span>}
                                                {highlight(msg.content)}
                                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, opacity: 0.7 }}>
                                                    <span>{new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                                                    <button onClick={() => togglePin(msg.id, msg.is_pinned)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", display: "flex" }}>
                                                        <Pin size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={msgEnd} />
                        </div>

                        {/* Input */}
                        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-primary)", background: "var(--bg-elevated)", position: "relative" }}>
                            {showMentions && mentionUsers.length > 0 && (
                                <div className="scale-in" style={{
                                    position: "absolute", bottom: "100%", left: 20, right: 20,
                                    background: "var(--bg-elevated)", border: "1px solid var(--border-primary)",
                                    borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)", maxHeight: 160, overflow: "auto",
                                }}>
                                    {mentionUsers.slice(0, 5).map(u => (
                                        <div key={u.id} onClick={() => insertMention(u.username)} style={{
                                            padding: "8px 14px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 8,
                                            transition: "background 0.15s",
                                        }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-tertiary)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <span style={{ fontSize: 16 }}>{u.avatar}</span>
                                            <span style={{ fontWeight: 600, color: "var(--accent)" }}>@{u.username}</span>
                                            <span style={{ color: "var(--text-muted)" }}>{u.display_name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: "flex", gap: 8 }}>
                                <input value={input} onChange={handleInput}
                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                                    placeholder="Nhập tin nhắn... (@ để mention)"
                                    className="input-field" style={{ flex: 1 }} />
                                <button onClick={send} disabled={!input.trim()} style={{
                                    background: input.trim() ? "var(--gradient-brand)" : "var(--bg-tertiary)",
                                    color: input.trim() ? "#fff" : "var(--text-muted)", border: "none",
                                    borderRadius: "var(--radius-sm)", padding: "10px 16px", cursor: input.trim() ? "pointer" : "not-allowed",
                                    display: "flex", alignItems: "center", boxShadow: input.trim() ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
                                }}>
                                    <Send size={15} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {showNewChat && (
                <Modal title="💬 Chat mới" onClose={() => setShowNewChat(false)} width={360}>
                    <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginBottom: 14 }}>Chọn người muốn chat:</p>
                    {users.filter(u => u.id !== currentUser.id).map(u => (
                        <div key={u.id} onClick={() => createDirect(u.id)} className="glass-card" style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 6, cursor: "pointer",
                        }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{u.avatar}</div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{u.display_name}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>@{u.username}</div>
                            </div>
                        </div>
                    ))}
                </Modal>
            )}
        </div>
    );
}

function highlight(text) {
    if (!text) return text;
    return text.split(/(@\w+)/g).map((p, i) =>
        p.startsWith("@") ? <span key={i} style={{ color: "#818CF8", fontWeight: 600 }}>{p}</span> : p
    );
}
