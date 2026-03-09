"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Award, Users, Bell, Zap, LogOut, ChevronRight } from "lucide-react";
import { useUser } from "@/lib/UserContext";
import LoginPage from "@/components/LoginPage";

const NAV = [
    { href: "/", label: "Dashboard", icon: Home, color: "#3B82F6" },
    { href: "/projects", label: "Projects", icon: FolderKanban, color: "#8B5CF6" },
    { href: "/leaderboard", label: "Leaderboard", icon: Award, color: "#F59E0B" },
    { href: "/team", label: "Team", icon: Users, color: "#10B981" },
];

export default function Layout({ children }) {
    const pathname = usePathname();
    const { currentUser, isAuthenticated, loading, logout, unreadCount, notifications, markNotificationsRead } = useUser();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, margin: "0 auto 16px", background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.5s ease infinite" }}>
                        <Zap size={24} color="#fff" />
                    </div>
                    <div style={{ color: "#64748B", fontSize: 13 }}>Đang kiểm tra đăng nhập...</div>
                    <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return <LoginPage />;

    const ROLE_LABELS = { chairman: "Chairman", project_lead: "Project Lead", developer: "Developer", admin: "Admin" };
    const ROLE_COLORS = { chairman: "#F59E0B", project_lead: "#8B5CF6", developer: "#3B82F6", admin: "#EF4444" };

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
            {/* Sidebar */}
            <aside style={{
                width: sidebarOpen ? 220 : 64, transition: "width 0.3s", background: "#FFFFFF",
                borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0,
                boxShadow: "2px 0 8px rgba(0,0,0,0.03)",
            }}>
                <div style={{ padding: "16px 12px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                    onClick={() => setSidebarOpen(!sidebarOpen)}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Zap size={16} color="#fff" />
                    </div>
                    {sidebarOpen && (
                        <div>
                            <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>AI Together</div>
                            <div style={{ color: "#94A3B8", fontSize: 9, letterSpacing: 1 }}>LIBE TECH</div>
                        </div>
                    )}
                </div>

                <nav style={{ flex: 1, padding: "8px 6px" }}>
                    {NAV.map(n => {
                        const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
                        const Icon = n.icon;
                        return (
                            <Link key={n.href} href={n.href} style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: sidebarOpen ? "9px 10px" : "9px 0", justifyContent: sidebarOpen ? "flex-start" : "center",
                                borderRadius: 8, marginBottom: 2, textDecoration: "none",
                                background: active ? `${n.color}10` : "transparent",
                                color: active ? n.color : "#64748B",
                                border: active ? `1px solid ${n.color}25` : "1px solid transparent",
                                fontWeight: active ? 600 : 400, fontSize: 13, transition: "all 0.2s",
                            }}>
                                <Icon size={17} />
                                {sidebarOpen && <span>{n.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User info */}
                {sidebarOpen && currentUser && (
                    <div style={{ padding: "10px 6px", borderTop: "1px solid #E2E8F0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                            <span style={{ fontSize: 18 }}>{currentUser.avatar}</span>
                            <div style={{ flex: 1, overflow: "hidden" }}>
                                <div style={{ color: "#0F172A", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.display_name}</div>
                                <div style={{ color: ROLE_COLORS[currentUser.role] || "#94A3B8", fontSize: 9, fontWeight: 500 }}>{ROLE_LABELS[currentUser.role] || currentUser.role}</div>
                            </div>
                            <button onClick={logout} title="Đăng xuất" style={{ background: "#FEF2F2", border: "1px solid #FCA5A520", borderRadius: 6, padding: "4px", cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <LogOut size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Top bar */}
                <header style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "10px 24px", borderBottom: "1px solid #E2E8F0", background: "#FFFFFF", gap: 12 }}>
                    {/* Notifications bell */}
                    <div style={{ position: "relative" }}>
                        <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications && unreadCount > 0) markNotificationsRead(); }}
                            style={{ background: unreadCount > 0 ? "#EEF2FF" : "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: unreadCount > 0 ? "#3B82F6" : "#64748B" }}>
                            <Bell size={16} />
                            {unreadCount > 0 && (
                                <span style={{ background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "0 5px", minWidth: 16, textAlign: "center", lineHeight: "16px" }}>{unreadCount}</span>
                            )}
                        </button>

                        {/* Notification dropdown */}
                        {showNotifications && (
                            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, width: 340, maxHeight: 400, overflow: "auto", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100 }}>
                                <div style={{ padding: "10px 14px", borderBottom: "1px solid #E2E8F0", fontWeight: 600, fontSize: 13, color: "#0F172A" }}>Thông báo</div>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Chưa có thông báo</div>
                                ) : notifications.slice(0, 20).map(n => (
                                    <div key={n.id} style={{ padding: "10px 14px", borderBottom: "1px solid #F1F5F9", background: n.is_read ? "transparent" : "#EEF2FF" }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{n.title}</div>
                                        <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{n.body}</div>
                                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>{new Date(n.created_at).toLocaleString("vi-VN")}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                <main style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
