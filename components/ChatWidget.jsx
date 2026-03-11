"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/lib/UserContext";
import { MessageSquare, Send, X, Plus, User, Hash, ChevronLeft } from "lucide-react";

export default function ChatWidget() {
    const { currentUser } = useUser();
    const [open, setOpen] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [showNewChat, setShowNewChat] = useState(false);
    const [unread, setUnread] = useState(0);
    const msgEnd = useRef(null);
    const poll = useRef(null);

    useEffect(() => {
        if (!currentUser?.id) return;
        fetch("/api/users").then(r => r.json()).then(u => setUsers(Array.isArray(u) ? u : []));
        loadRooms();
    }, [currentUser?.id]);

    // Close chat with Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape" && open) setOpen(false);
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [open]);

    const loadRooms = async () => {
        if (!currentUser?.id) return;
        const data = await fetch(`/api/chat/rooms?user_id=${currentUser.id}`).then(r => r.json());
        setRooms(Array.isArray(data) ? data : []);
    };

    const loadMsgs = useCallback(async (rid) => {
        const data = await fetch(`/api/chat/messages?room_id=${rid}`).then(r => r.json());
        setMessages(Array.isArray(data) ? data : []);
        setTimeout(() => msgEnd.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }, []);

    useEffect(() => {
        if (!activeRoom || !open) return;
        loadMsgs(activeRoom);
        poll.current = setInterval(() => loadMsgs(activeRoom), 5000);
        return () => clearInterval(poll.current);
    }, [activeRoom, open, loadMsgs]);

    const send = async () => {
        if (!input.trim() || !activeRoom) return;
        await fetch("/api/chat/messages", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: activeRoom, sender_id: currentUser.id, content: input, mentions: [] }),
        });
        setInput(""); loadMsgs(activeRoom);
    };

    const createDirect = async (uid) => {
        const room = await fetch("/api/chat/rooms", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "direct", member_ids: [currentUser.id, uid] }),
        }).then(r => r.json());
        setShowNewChat(false); loadRooms(); setActiveRoom(room.id);
    };

    const roomName = (r) => {
        if (r.name) return r.name;
        if (r.type === "direct" && r.members) {
            const other = r.members.find(m => m.user_id !== currentUser.id);
            return other?.user?.display_name || "Chat";
        }
        return "Chat Room";
    };

    const activeRoomObj = rooms.find(r => r.id === activeRoom);

    if (!currentUser) return null;

    return (
        <>
            {/* Floating button */}
            <button
                onClick={() => { setOpen(!open); if (!open) loadRooms(); }}
                style={{
                    position: "fixed", bottom: 28, right: 28, zIndex: 1000,
                    width: 56, height: 56, borderRadius: "50%",
                    background: "var(--gradient-brand)",
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(99, 102, 241, 0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(99, 102, 241, 0.4)"; }}
            >
                {open ? <X size={24} color="#fff" /> : <MessageSquare size={24} color="#fff" />}
                {!open && unread > 0 && (
                    <span style={{
                        position: "absolute", top: -4, right: -4,
                        background: "var(--red)", color: "#fff",
                        fontSize: 11, fontWeight: 700, borderRadius: 12,
                        padding: "2px 7px", minWidth: 20, textAlign: "center",
                    }}>{unread}</span>
                )}
            </button>

            {/* Chat panel */}
            {open && (
                <div style={{
                    position: "fixed", bottom: 96, right: 28, zIndex: 999,
                    width: 400, height: 520,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-primary)",
                    borderRadius: 20, boxShadow: "0 12px 48px rgba(0,0,0,0.15)",
                    display: "flex", flexDirection: "column",
                    overflow: "hidden",
                    animation: "scaleIn 0.2s ease",
                }}>
                    {/* Header */}
                    <div style={{
                        padding: "14px 18px", background: "var(--gradient-brand)", color: "#fff",
                        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
                    }}>
                        {activeRoom && (
                            <button onClick={() => setActiveRoom(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: 4, cursor: "pointer", display: "flex", color: "#fff" }}>
                                <ChevronLeft size={18} />
                            </button>
                        )}
                        <MessageSquare size={20} />
                        <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>
                            {activeRoom && activeRoomObj ? roomName(activeRoomObj) : "Chat"}
                        </span>
                        <button onClick={() => { if (!activeRoom) setShowNewChat(true); }} style={{
                            background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: 4,
                            cursor: "pointer", display: activeRoom ? "none" : "flex", color: "#fff",
                        }}>
                            <Plus size={18} />
                        </button>
                    </div>

                    {/* Content area */}
                    {!activeRoom ? (
                        /* Room list */
                        <div style={{ flex: 1, overflow: "auto" }}>
                            {showNewChat ? (
                                <div>
                                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Chọn người chat</span>
                                        <button onClick={() => setShowNewChat(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}><X size={16} /></button>
                                    </div>
                                    {users.filter(u => u.id !== currentUser.id).map(u => (
                                        <div key={u.id} onClick={() => createDirect(u.id)} style={{
                                            padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                                            borderBottom: "1px solid var(--border-primary)", transition: "background 0.15s",
                                        }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-tertiary)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{u.avatar}</div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{u.display_name}</div>
                                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>@{u.username}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : rooms.length === 0 ? (
                                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                                    <MessageSquare size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                                    <div>Nhấn + để bắt đầu chat!</div>
                                </div>
                            ) : rooms.map(room => (
                                <div key={room.id} onClick={() => setActiveRoom(room.id)} style={{
                                    padding: "12px 16px", cursor: "pointer",
                                    borderBottom: "1px solid var(--border-primary)", display: "flex", alignItems: "center", gap: 10,
                                    transition: "background 0.15s",
                                }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-tertiary)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, color: "#fff" }}>
                                        {room.type === "direct" ? <User size={16} /> : <Hash size={16} />}
                                    </div>
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{roomName(room)}</div>
                                        {room.last_message && (
                                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {room.last_message.content}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Messages */
                        <>
                            <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
                                {messages.map(msg => {
                                    const isMe = msg.sender_id === currentUser.id;
                                    return (
                                        <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 8 }}>
                                            <div style={{ maxWidth: "75%" }}>
                                                {!isMe && (
                                                    <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 3, marginLeft: 6 }}>
                                                        {msg.sender?.display_name}
                                                    </div>
                                                )}
                                                <div style={{
                                                    padding: "9px 13px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                                                    background: isMe ? "var(--gradient-brand)" : "var(--bg-tertiary)",
                                                    color: isMe ? "#fff" : "var(--text-primary)",
                                                    border: isMe ? "none" : "1px solid var(--border-primary)",
                                                    fontSize: 14, lineHeight: 1.5,
                                                    boxShadow: isMe ? "0 2px 8px rgba(99,102,241,0.2)" : "var(--shadow-xs)",
                                                }}>
                                                    {highlight(msg.content)}
                                                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" }}>
                                                        {new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={msgEnd} />
                            </div>

                            {/* Input */}
                            <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border-primary)", background: "var(--bg-elevated)", display: "flex", gap: 8 }}>
                                <input value={input} onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                                    placeholder="Nhập tin nhắn..."
                                    className="input-field" style={{ flex: 1, fontSize: 14, padding: "10px 14px" }} />
                                <button onClick={send} disabled={!input.trim()} style={{
                                    background: input.trim() ? "var(--gradient-brand)" : "var(--bg-tertiary)",
                                    color: input.trim() ? "#fff" : "var(--text-muted)", border: "none",
                                    borderRadius: 10, padding: "10px 14px", cursor: input.trim() ? "pointer" : "not-allowed",
                                    display: "flex", alignItems: "center",
                                    boxShadow: input.trim() ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
                                }}>
                                    <Send size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

function highlight(text) {
    if (!text) return text;
    return text.split(/(@\w+)/g).map((p, i) =>
        p.startsWith("@") ? <span key={i} style={{ color: "#818CF8", fontWeight: 600 }}>{p}</span> : p
    );
}
