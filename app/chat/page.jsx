"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/lib/UserContext";
import { MessageSquare, Send, Pin, Search, Plus, Users as UsersIcon, Hash, User } from "lucide-react";
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
    const [searchFilter, setSearchFilter] = useState("");
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState("");
    const [mentionUsers, setMentionUsers] = useState([]);
    const msgEnd = useRef(null);
    const pollingRef = useRef(null);

    useEffect(() => {
        if (!currentUser?.id) return;
        fetch("/api/users").then(r => r.json()).then(u => setUsers(Array.isArray(u) ? u : []));
        loadRooms();
    }, [currentUser?.id]);

    const loadRooms = async () => {
        if (!currentUser?.id) return;
        const res = await fetch(`/api/chat/rooms?user_id=${currentUser.id}`);
        const data = await res.json();
        setRooms(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    const loadMessages = useCallback(async (roomId) => {
        const res = await fetch(`/api/chat/messages?room_id=${roomId}`);
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        setTimeout(() => msgEnd.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, []);

    useEffect(() => {
        if (!activeRoom) return;
        loadMessages(activeRoom);
        pollingRef.current = setInterval(() => loadMessages(activeRoom), 5000);
        return () => clearInterval(pollingRef.current);
    }, [activeRoom, loadMessages]);

    const sendMessage = async () => {
        if (!input.trim() || !activeRoom) return;
        // Parse @mentions
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let m;
        while ((m = mentionRegex.exec(input)) !== null) {
            const user = users.find(u => u.username.toLowerCase() === m[1].toLowerCase());
            if (user) mentions.push(user.id);
        }

        await fetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                room_id: activeRoom,
                sender_id: currentUser.id,
                content: input,
                mentions: [...new Set(mentions)],
            }),
        });
        setInput("");
        loadMessages(activeRoom);
    };

    const pinMessage = async (msgId, pinned) => {
        await fetch("/api/chat/messages", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: msgId, is_pinned: !pinned }),
        });
        loadMessages(activeRoom);
    };

    const createDirectChat = async (userId) => {
        const res = await fetch("/api/chat/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "direct", member_ids: [currentUser.id, userId] }),
        });
        const room = await res.json();
        setShowNewChat(false);
        loadRooms();
        setActiveRoom(room.id);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInput(val);
        const lastAt = val.lastIndexOf("@");
        if (lastAt >= 0 && lastAt === val.length - 1 || (lastAt >= 0 && !/\s/.test(val.slice(lastAt)))) {
            const filter = val.slice(lastAt + 1).toLowerCase();
            setMentionFilter(filter);
            setMentionUsers(users.filter(u => u.id !== currentUser.id && u.username.toLowerCase().includes(filter)));
            setShowMentions(true);
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (username) => {
        const lastAt = input.lastIndexOf("@");
        setInput(input.slice(0, lastAt) + `@${username} `);
        setShowMentions(false);
    };

    const getRoomName = (room) => {
        if (room.name) return room.name;
        if (room.type === "direct" && room.members) {
            const other = room.members.find(m => m.user_id !== currentUser.id);
            return other?.user?.display_name || "Chat";
        }
        return "Chat Room";
    };

    const ROOM_ICONS = { direct: <User size={14} />, project: <Hash size={14} />, module: <Hash size={14} /> };
    const filteredRooms = rooms.filter(r => {
        if (!searchFilter) return true;
        return getRoomName(r).toLowerCase().includes(searchFilter.toLowerCase());
    });

    if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>Đang tải...</div>;

    return (
        <div className="fade-in" style={{ display: "flex", height: "calc(100vh - 100px)", gap: 0, margin: "-20px -24px", overflow: "hidden" }}>
            {/* Rooms sidebar */}
            <div style={{ width: 280, background: "#FFFFFF", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <div style={{ padding: "12px", borderBottom: "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 6 }}>
                            <MessageSquare size={16} color="#8B5CF6" /> Chat
                        </h3>
                        <button onClick={() => setShowNewChat(true)} style={{ background: "#8B5CF610", border: "1px solid #8B5CF630", borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: "#8B5CF6" }}>
                            <Plus size={14} />
                        </button>
                    </div>
                    <input type="text" placeholder="Tìm kiếm..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
                        style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                </div>

                <div style={{ flex: 1, overflow: "auto" }}>
                    {filteredRooms.length === 0 ? (
                        <div style={{ padding: 16, textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                            Chưa có cuộc trò chuyện. Nhấn + để bắt đầu!
                        </div>
                    ) : filteredRooms.map(room => (
                        <div key={room.id} onClick={() => setActiveRoom(room.id)} style={{
                            padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #F8FAFC",
                            background: activeRoom === room.id ? "#EEF2FF" : "transparent",
                            borderLeft: activeRoom === room.id ? "3px solid #8B5CF6" : "3px solid transparent",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ color: "#8B5CF6" }}>{ROOM_ICONS[room.type]}</span>
                                <div style={{ flex: 1, overflow: "hidden" }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getRoomName(room)}</div>
                                    {room.last_message && (
                                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {room.last_message.sender?.display_name}: {room.last_message.content}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Message area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F8FAFC" }}>
                {!activeRoom ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8" }}>
                        <div style={{ textAlign: "center" }}>
                            <MessageSquare size={48} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 12 }} />
                            <div style={{ fontSize: 14 }}>Chọn cuộc trò chuyện hoặc tạo mới</div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Messages */}
                        <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
                            {messages.map(msg => {
                                const isMe = msg.sender_id === currentUser.id;
                                return (
                                    <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 8 }}>
                                        <div style={{ maxWidth: "70%" }}>
                                            {!isMe && (
                                                <div style={{ fontSize: 10, color: "#8B5CF6", fontWeight: 600, marginBottom: 2, marginLeft: 8 }}>
                                                    {msg.sender?.avatar} {msg.sender?.display_name}
                                                </div>
                                            )}
                                            <div style={{
                                                padding: "8px 12px", borderRadius: 12,
                                                background: isMe ? "linear-gradient(135deg, #8B5CF6, #6D28D9)" : "#FFFFFF",
                                                color: isMe ? "#fff" : "#0F172A",
                                                border: isMe ? "none" : "1px solid #E2E8F0",
                                                fontSize: 13, lineHeight: 1.5, position: "relative",
                                                boxShadow: isMe ? "0 2px 8px rgba(139,92,246,0.2)" : "0 1px 3px rgba(0,0,0,0.04)",
                                            }}>
                                                {msg.is_pinned && <span style={{ fontSize: 10, color: isMe ? "#E9D5FF" : "#F59E0B" }}>📌 </span>}
                                                {highlightMentions(msg.content)}
                                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: isMe ? "#C4B5FD" : "#94A3B8" }}>
                                                    <span>{new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                                                    <button onClick={() => pinMessage(msg.id, msg.is_pinned)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: isMe ? "#C4B5FD" : "#94A3B8" }}>
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
                        <div style={{ padding: "12px 16px", borderTop: "1px solid #E2E8F0", background: "#FFFFFF", position: "relative" }}>
                            {showMentions && mentionUsers.length > 0 && (
                                <div style={{ position: "absolute", bottom: "100%", left: 16, right: 16, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, boxShadow: "0 -4px 12px rgba(0,0,0,0.08)", maxHeight: 160, overflow: "auto" }}>
                                    {mentionUsers.slice(0, 5).map(u => (
                                        <div key={u.id} onClick={() => insertMention(u.username)} style={{ padding: "6px 12px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                                            onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <span>{u.avatar}</span> <strong>@{u.username}</strong> <span style={{ color: "#94A3B8" }}>— {u.display_name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: "flex", gap: 8 }}>
                                <input value={input} onChange={handleInputChange}
                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                    placeholder="Nhập tin nhắn... (@ để mention)"
                                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                                    onFocus={e => e.target.style.borderColor = "#8B5CF6"} onBlur={e => e.target.style.borderColor = "#E2E8F0"} />
                                <button onClick={sendMessage} disabled={!input.trim()}
                                    style={{ background: input.trim() ? "linear-gradient(135deg, #8B5CF6, #6D28D9)" : "#E2E8F0", color: input.trim() ? "#fff" : "#94A3B8", border: "none", borderRadius: 8, padding: "8px 14px", cursor: input.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 4 }}>
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* New chat modal */}
            {showNewChat && (
                <Modal title="💬 Cuộc trò chuyện mới" onClose={() => setShowNewChat(false)}>
                    <p style={{ color: "#64748B", fontSize: 13, marginBottom: 12 }}>Chọn người muốn chat:</p>
                    {users.filter(u => u.id !== currentUser.id).map(u => (
                        <div key={u.id} onClick={() => createDirectChat(u.id)} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                            borderRadius: 8, cursor: "pointer", border: "1px solid #F1F5F9", marginBottom: 4,
                        }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <span style={{ fontSize: 22 }}>{u.avatar}</span>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{u.display_name}</div>
                                <div style={{ fontSize: 11, color: "#94A3B8" }}>@{u.username}</div>
                            </div>
                        </div>
                    ))}
                </Modal>
            )}
        </div>
    );
}

function highlightMentions(text) {
    if (!text) return text;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
        part.startsWith("@") ? (
            <span key={i} style={{ color: "#8B5CF6", fontWeight: 600 }}>{part}</span>
        ) : part
    );
}
