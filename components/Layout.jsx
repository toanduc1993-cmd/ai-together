"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Award, ListTodo, Users, BarChart3, ChevronDown, Zap, FileText, LogOut } from "lucide-react";
import { useUser } from "@/lib/UserContext";
import LoginPage from "@/components/LoginPage";

const NAV = [
    { href: "/", label: "Activity Feed", icon: Home, color: "#3B82F6" },
    { href: "/leaderboard", label: "Leaderboard", icon: Award, color: "#F59E0B" },
    { href: "/tasks", label: "Task Board", icon: ListTodo, color: "#10B981" },
    { href: "/team", label: "Team & Roles", icon: Users, color: "#8B5CF6" },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3, color: "#EC4899" },
    { href: "/workflow", label: "Workflow", icon: FileText, color: "#F97316" },
];

export default function Layout({ children }) {
    const pathname = usePathname();
    const { currentUser, isAuthenticated, loading, logout } = useUser();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div style={{
                minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
                background: "#F8FAFC", fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 12, margin: "0 auto 16px",
                        background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        animation: "pulse 1.5s ease infinite",
                    }}>
                        <Zap size={24} color="#fff" />
                    </div>
                    <div style={{ color: "#64748B", fontSize: 13 }}>Đang kiểm tra đăng nhập...</div>
                    <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
                </div>
            </div>
        );
    }

    // Auth guard — show login page if not authenticated
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
            {/* Sidebar */}
            <aside style={{
                width: sidebarOpen ? 240 : 64, transition: "width 0.3s",
                background: "#FFFFFF",
                borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0,
                boxShadow: "2px 0 8px rgba(0,0,0,0.03)",
            }}>
                {/* Logo */}
                <div style={{ padding: "20px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                    onClick={() => setSidebarOpen(!sidebarOpen)}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
                    }}>
                        <Zap size={20} color="#fff" />
                    </div>
                    {sidebarOpen && (
                        <div>
                            <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>AI Together</div>
                            <div style={{ color: "#94A3B8", fontSize: 10, letterSpacing: 1 }}>LIBE TECH</div>
                        </div>
                    )}
                </div>

                {/* Nav items */}
                <nav style={{ flex: 1, padding: "12px 8px" }}>
                    {NAV.map(n => {
                        const active = pathname === n.href;
                        const Icon = n.icon;
                        return (
                            <Link key={n.href} href={n.href} style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: sidebarOpen ? "10px 12px" : "10px 0", justifyContent: sidebarOpen ? "flex-start" : "center",
                                borderRadius: 8, marginBottom: 4, textDecoration: "none",
                                background: active ? `${n.color}10` : "transparent",
                                color: active ? n.color : "#64748B",
                                border: active ? `1px solid ${n.color}25` : "1px solid transparent",
                                transition: "all 0.2s",
                                fontWeight: active ? 600 : 400,
                            }}>
                                <Icon size={18} />
                                {sidebarOpen && <span style={{ fontSize: 13 }}>{n.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User info & logout at bottom */}
                {sidebarOpen && currentUser && (
                    <div style={{ padding: "12px 8px", borderTop: "1px solid #E2E8F0" }}>
                        <div style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                            borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0",
                        }}>
                            <span style={{ fontSize: 20 }}>{currentUser.avatar}</span>
                            <div style={{ flex: 1, overflow: "hidden" }}>
                                <div style={{ color: "#0F172A", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.name}</div>
                                <div style={{ color: "#94A3B8", fontSize: 10 }}>@{currentUser.id}</div>
                            </div>
                            <button
                                onClick={logout}
                                title="Đăng xuất"
                                style={{
                                    background: "#FEF2F2", border: "1px solid #FCA5A520", borderRadius: 6,
                                    padding: "5px", cursor: "pointer", color: "#EF4444",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "all 0.2s",
                                }}
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main content */}
            <main style={{ flex: 1, padding: "24px 32px", overflow: "auto", maxHeight: "100vh" }}>
                {children}
            </main>
        </div>
    );
}
