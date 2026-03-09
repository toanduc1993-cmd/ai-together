"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Award, Users, Bell, Zap, LogOut, MessageSquare, BarChart3, Moon, Sun, Menu } from "lucide-react";
import { useUser } from "@/lib/UserContext";
import LoginPage from "@/components/LoginPage";

const NAV = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/chat", label: "Chat", icon: MessageSquare },
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
                <div style={{ padding: collapsed ? "16px 12px" : "20px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border-primary)" }}>
                    <div onClick={() => setCollapsed(!collapsed)} style={{
                        width: 36, height: 36, borderRadius: 10, background: "var(--gradient-brand)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
                    }}>
                        <Zap size={18} color="#fff" />
                    </div>
                    {!collapsed && (
                        <div style={{ overflow: "hidden" }}>
                            <div style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>AI Together</div>
                            <div style={{ color: "var(--accent)", fontSize: 9, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>Libe Tech</div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
                    {NAV.map(n => {
                        const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
                        const Icon = n.icon;
                        return (
                            <Link key={n.href} href={n.href} style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: collapsed ? "10px 0" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start",
                                borderRadius: 10, textDecoration: "none", position: "relative",
                                background: active ? "var(--accent-bg)" : "transparent",
                                color: active ? "var(--accent)" : "var(--text-secondary)",
                                fontWeight: active ? 600 : 500, fontSize: 13,
                                transition: "all 0.2s ease",
                            }}>
                                {active && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, borderRadius: 4, background: "var(--accent)" }} />}
                                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                                {!collapsed && <span>{n.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                {currentUser && (
                    <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border-primary)" }}>
                        <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: collapsed ? "8px 0" : "8px 10px", justifyContent: collapsed ? "center" : "flex-start",
                            borderRadius: 10, background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 8, background: "var(--gradient-brand)",
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
                            }}>{currentUser.avatar}</div>
                            {!collapsed && (
                                <>
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <div style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.display_name}</div>
                                        <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 500 }}>{currentUser.role?.replace("_", " ")}</div>
                                    </div>
                                    <button onClick={logout} title="Đăng xuất" style={{ background: "var(--red-bg)", border: "none", borderRadius: 6, padding: 5, cursor: "pointer", color: "var(--red)", display: "flex" }}>
                                        <LogOut size={13} />
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => setCollapsed(!collapsed)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 4, display: "flex", borderRadius: 6 }}>
                            <Menu size={18} />
                        </button>
                        <span style={{ fontSize: 13, color: "var(--text-tertiary)", fontWeight: 500 }}>
                            {NAV.find(n => pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href)))?.label || "Dashboard"}
                        </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => setDark(!dark)} style={{
                            background: dark ? "var(--amber-bg)" : "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
                            borderRadius: 8, padding: 7, cursor: "pointer", display: "flex", color: dark ? "var(--amber)" : "var(--text-secondary)",
                        }}>
                            {dark ? <Sun size={15} /> : <Moon size={15} />}
                        </button>

                        <div style={{ position: "relative" }}>
                            <button onClick={() => { setShowNotif(!showNotif); if (!showNotif && unreadCount > 0) markNotificationsRead(); }} style={{
                                background: unreadCount > 0 ? "var(--accent-bg)" : "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
                                borderRadius: 8, padding: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                                color: unreadCount > 0 ? "var(--accent)" : "var(--text-secondary)",
                            }}>
                                <Bell size={15} />
                                {unreadCount > 0 && (
                                    <span style={{ background: "var(--red)", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 5px", minWidth: 16, textAlign: "center", lineHeight: "14px" }}>{unreadCount}</span>
                                )}
                            </button>

                            {showNotif && (
                                <div className="scale-in" style={{
                                    position: "absolute", right: 0, top: "calc(100% + 8px)", width: 360, maxHeight: 420, overflow: "auto",
                                    background: "var(--bg-elevated)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-lg)",
                                    boxShadow: "var(--shadow-xl)", zIndex: 100,
                                }}>
                                    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-primary)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Thông báo</div>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Chưa có thông báo</div>
                                    ) : notifications.slice(0, 20).map(n => (
                                        <div key={n.id} style={{
                                            padding: "12px 16px", borderBottom: "1px solid var(--border-primary)",
                                            background: n.is_read ? "transparent" : "var(--accent-bg)",
                                            transition: "background 0.2s",
                                        }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{n.title}</div>
                                            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>{n.body}</div>
                                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>{new Date(n.created_at).toLocaleString("vi-VN")}</div>
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
        </div>
    );
}
