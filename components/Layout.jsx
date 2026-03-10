"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Award, Users, Bell, Zap, LogOut, BarChart3, Moon, Sun, Menu, ClipboardList } from "lucide-react";
import { useUser } from "@/lib/UserContext";
import LoginPage from "@/components/LoginPage";
import ChatWidget from "@/components/ChatWidget";

const NAV = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/my-tasks", label: "Công việc của tôi", icon: ClipboardList },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/leaderboard", label: "Leaderboard", icon: Award },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/team", label: "Team", icon: Users },
];

export default function Layout({ children }) {
    const pathname = usePathname();
    const { currentUser, isAuthenticated, loading, logout, unreadCount, notifications, markNotificationsRead } = useUser();
    const [collapsed, setCollapsed] = useState(false);
    const [showNotif, setShowNotif] = useState(false);
    const [dark, setDark] = useState(false);
    const [myTaskCount, setMyTaskCount] = useState(0);

    // Fetch task count — instant from cache, then refresh periodically
    useEffect(() => {
        if (!currentUser?.id) return;
        // Instantly set from cache if available
        try {
            const raw = localStorage.getItem("ai_together_cache");
            if (raw) {
                const { data } = JSON.parse(raw);
                if (data?.myTaskCount !== undefined) setMyTaskCount(data.myTaskCount);
            }
        } catch { }
        // Only refresh periodically — Dashboard page handles the initial fetch
        const fetchCount = async () => {
            try {
                const res = await fetch(`/api/dashboard?user_id=${currentUser.id}`);
                const data = await res.json();
                if (data.myTaskCount !== undefined) setMyTaskCount(data.myTaskCount);
                // Update shared cache
                try { localStorage.setItem("ai_together_cache", JSON.stringify({ data, ts: Date.now() })); } catch { }
            } catch { }
        };
        // Delay first fetch by 5s so it doesn't compete with the page's own fetch
        const timeout = setTimeout(fetchCount, 5000);
        const interval = setInterval(fetchCount, 60000);
        return () => { clearTimeout(timeout); clearInterval(interval); };
    }, [currentUser?.id]);

    useEffect(() => {
        if (typeof window !== "undefined" && localStorage.getItem("theme") === "dark") setDark(true);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
        localStorage.setItem("theme", dark ? "dark" : "light");
    }, [dark]);

    if (loading) return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-secondary)" }}>
            <div style={{ textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, margin: "0 auto 20px", background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse-soft 1.5s ease infinite", boxShadow: "var(--shadow-glow)" }}>
                    <Zap size={24} color="#fff" />
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: 13, fontWeight: 500 }}>Đang tải...</div>
            </div>
        </div>
    );

    if (!isAuthenticated) return <LoginPage />;

    const w = collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)";

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-secondary)" }}>
            {/* ===== SIDEBAR ===== */}
            <aside style={{
                width: w, minWidth: w, transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                background: "var(--gradient-sidebar)", borderRight: "1px solid var(--border-primary)",
                display: "flex", flexDirection: "column", overflow: "hidden", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 50,
            }}>
                {/* Brand */}
                <div style={{ padding: collapsed ? "18px 14px" : "22px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border-primary)" }}>
                    <div onClick={() => setCollapsed(!collapsed)} style={{
                        width: 42, height: 42, borderRadius: 12, background: "var(--gradient-brand)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
                    }}>
                        <Zap size={22} color="#fff" />
                    </div>
                    {!collapsed && (
                        <div style={{ overflow: "hidden" }}>
                            <div style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, letterSpacing: -0.3 }}>Libe AI OS</div>
                            <div style={{ color: "var(--accent)", fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>LIBE TECH</div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {NAV.map(n => {
                        const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
                        const Icon = n.icon;
                        return (
                            <Link key={n.href} href={n.href} style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: collapsed ? "12px 0" : "12px 16px", justifyContent: collapsed ? "center" : "flex-start",
                                borderRadius: 10, textDecoration: "none", position: "relative",
                                background: active ? "var(--accent-bg)" : "transparent",
                                color: active ? "var(--accent)" : "var(--text-secondary)",
                                fontWeight: active ? 600 : 500, fontSize: 15,
                                transition: "all 0.2s ease",
                            }}>
                                {active && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 24, borderRadius: 4, background: "var(--accent)" }} />}
                                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                                {!collapsed && <span style={{ flex: 1 }}>{n.label}</span>}
                                {!collapsed && n.href === "/my-tasks" && myTaskCount > 0 && (
                                    <span style={{
                                        background: "var(--red)", color: "#fff", fontSize: 11, fontWeight: 700,
                                        minWidth: 20, height: 20, borderRadius: 10, display: "flex",
                                        alignItems: "center", justifyContent: "center", padding: "0 5px",
                                    }}>{myTaskCount}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                {currentUser && (
                    <div style={{ padding: "14px 10px", borderTop: "1px solid var(--border-primary)" }}>
                        <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: collapsed ? "10px 0" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start",
                            borderRadius: 10, background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
                        }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: 10, background: "var(--gradient-brand)",
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
                            }}>{currentUser.avatar}</div>
                            {!collapsed && (
                                <>
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <div style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.display_name}</div>
                                        <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{currentUser.role?.replace("_", " ")}</div>
                                    </div>
                                    <button onClick={logout} title="Đăng xuất" style={{ background: "var(--red-bg)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--red)", display: "flex" }}>
                                        <LogOut size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </aside>

            {/* ===== MAIN ===== */}
            <div style={{ flex: 1, marginLeft: w, transition: "margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                {/* Header */}
                <header style={{
                    height: "var(--header-height)", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0 24px", background: "var(--bg-glass)", backdropFilter: "blur(12px)",
                    borderBottom: "1px solid var(--border-primary)", position: "sticky", top: 0, zIndex: 40,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button onClick={() => setCollapsed(!collapsed)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 6, display: "flex", borderRadius: 8 }}>
                            <Menu size={22} />
                        </button>
                        <span style={{ fontSize: 16, color: "var(--text-tertiary)", fontWeight: 600 }}>
                            {NAV.find(n => pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href)))?.label || "Dashboard"}
                        </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => setDark(!dark)} style={{
                            background: dark ? "var(--amber-bg)" : "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
                            borderRadius: 8, padding: 8, cursor: "pointer", display: "flex", color: dark ? "var(--amber)" : "var(--text-secondary)",
                        }}>
                            {dark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <div style={{ position: "relative" }}>
                            <button onClick={() => { setShowNotif(!showNotif); if (!showNotif && unreadCount > 0) markNotificationsRead(); }} style={{
                                background: unreadCount > 0 ? "var(--accent-bg)" : "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
                                borderRadius: 8, padding: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                                color: unreadCount > 0 ? "var(--accent)" : "var(--text-secondary)",
                            }}>
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span style={{ background: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "2px 6px", minWidth: 18, textAlign: "center", lineHeight: "16px" }}>{unreadCount}</span>
                                )}
                            </button>

                            {showNotif && (
                                <div className="scale-in" style={{
                                    position: "absolute", right: 0, top: "calc(100% + 8px)", width: 360, maxHeight: 420, overflow: "auto",
                                    background: "var(--bg-elevated)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-lg)",
                                    boxShadow: "var(--shadow-xl)", zIndex: 100,
                                }}>
                                    <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-primary)", fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>Thông báo</div>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Chưa có thông báo</div>
                                    ) : notifications.slice(0, 20).map(n => (
                                        <div key={n.id} style={{
                                            padding: "12px 16px", borderBottom: "1px solid var(--border-primary)",
                                            background: n.is_read ? "transparent" : "var(--accent-bg)",
                                            transition: "background 0.2s",
                                        }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{n.title}</div>
                                            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>{n.body}</div>
                                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{new Date(n.created_at).toLocaleString("vi-VN")}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main style={{ flex: 1, padding: "24px 28px", overflow: "auto" }}>
                    {children}
                </main>
            </div>
            <ChatWidget />
        </div>
    );
}
