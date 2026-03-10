"use client";
import { useState } from "react";
import { Zap, Eye, EyeOff } from "lucide-react";
import { useUser } from "@/lib/UserContext";

export default function LoginPage() {
    const { login } = useUser();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); setLoading(true);
        try {
            const user = await login(username, password);
            // Pre-warm dashboard cache immediately after login
            // so Dashboard renders instantly without a second cold start
            fetch(`/api/dashboard?user_id=${user.id}`)
                .then(r => r.json())
                .then(data => {
                    try { localStorage.setItem("ai_together_cache", JSON.stringify({ data, ts: Date.now() })); } catch { }
                });
        } catch (err) {
            setError(err.message || "Đăng nhập thất bại");
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #0F0C29 0%, #1A1040 25%, #302B63 50%, #24243e 75%, #0F0C29 100%)",
            position: "relative", overflow: "hidden",
        }}>
            {/* Decorative orbs */}
            <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", top: -100, right: -100, animation: "float 6s ease-in-out infinite" }} />
            <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)", bottom: -50, left: -50, animation: "float 8s ease-in-out infinite reverse" }} />

            <div className="scale-in" style={{
                width: 400, padding: "40px 36px", borderRadius: 24,
                background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
                        background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 8px 32px rgba(99, 102, 241, 0.35)",
                    }}>
                        <Zap size={26} color="#fff" />
                    </div>
                    <h1 style={{ color: "#F1F5F9", fontSize: 22, fontWeight: 800, marginBottom: 4, letterSpacing: -0.5 }}>Libe AI OS</h1>
                    <p style={{ color: "#94A3B8", fontSize: 13, fontWeight: 400 }}>Đăng nhập vào nền tảng cộng tác</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#FCA5A5", fontWeight: 500 }}>
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#CBD5E1", marginBottom: 6 }}>Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Nhập username..."
                            autoFocus autoComplete="username"
                            style={{
                                width: "100%", padding: "12px 16px", borderRadius: 10,
                                border: "1.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
                                color: "#F1F5F9", fontSize: 14, outline: "none", transition: "all 0.2s",
                                boxSizing: "border-box",
                            }}
                            onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
                            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                        />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#CBD5E1", marginBottom: 6 }}>Password</label>
                        <div style={{ position: "relative" }}>
                            <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••"
                                autoComplete="current-password"
                                style={{
                                    width: "100%", padding: "12px 44px 12px 16px", borderRadius: 10,
                                    border: "1.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
                                    color: "#F1F5F9", fontSize: 14, outline: "none", transition: "all 0.2s",
                                    boxSizing: "border-box",
                                }}
                                onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; }}
                                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                            />
                            <button type="button" onClick={() => setShowPw(!showPw)} style={{
                                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                                background: "none", border: "none", cursor: "pointer", color: "#64748B", display: "flex", padding: 2,
                            }}>
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading || !username || !password} style={{
                        width: "100%", padding: "13px", borderRadius: 10, border: "none", cursor: "pointer",
                        background: loading ? "#4B5563" : "var(--gradient-brand)", color: "#fff",
                        fontSize: 14, fontWeight: 700, letterSpacing: 0.2,
                        boxShadow: loading ? "none" : "0 4px 16px rgba(99, 102, 241, 0.35)",
                        transition: "all 0.2s",
                        opacity: (!username || !password) ? 0.5 : 1,
                    }}>
                        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 24 }}>
                    <span style={{ fontSize: 11, color: "#64748B" }}>Libe Tech © 2026 — AI OS Platform</span>
                </div>
            </div>
        </div>
    );
}
