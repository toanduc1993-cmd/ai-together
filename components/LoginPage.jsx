"use client";
import { useState } from "react";
import { Zap, LogIn, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useUser } from "@/lib/UserContext";

export default function LoginPage({ onLoginSuccess }) {
    const { login } = useUser();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim()) { setError("Vui lòng nhập username"); return; }
        if (!password) { setError("Vui lòng nhập mật khẩu"); return; }

        setLoading(true);
        setError("");
        const result = await login(username.trim(), password);
        setLoading(false);

        if (result.success) {
            onLoginSuccess?.();
        } else {
            setError(result.error || "Đăng nhập thất bại");
        }
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 50%, #FFF1F2 100%)",
            fontFamily: "'Inter', sans-serif",
        }}>
            {/* Decorative blobs */}
            <div style={{ position: "fixed", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08), transparent)", pointerEvents: "none" }} />
            <div style={{ position: "fixed", bottom: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent)", pointerEvents: "none" }} />

            <div style={{
                background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)",
                borderRadius: 20, padding: "40px 36px", width: 400,
                boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
                border: "1px solid rgba(255,255,255,0.8)",
                position: "relative", zIndex: 1,
            }}>
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 16, margin: "0 auto 16px",
                        background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 8px 24px rgba(59,130,246,0.3)",
                    }}>
                        <Zap size={32} color="#fff" />
                    </div>
                    <h1 style={{ color: "#0F172A", fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>AI Together</h1>
                    <p style={{ color: "#94A3B8", fontSize: 13, margin: 0 }}>Libe Tech — Đăng nhập để tiếp tục</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Error message */}
                    {error && (
                        <div style={{
                            background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10,
                            padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
                            animation: "shake 0.3s ease",
                        }}>
                            <AlertCircle size={16} color="#EF4444" />
                            <span style={{ color: "#DC2626", fontSize: 13 }}>{error}</span>
                        </div>
                    )}

                    {/* Username */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ color: "#475569", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => { setUsername(e.target.value); setError(""); }}
                            placeholder="VD: toan, quan, le... (không phân biệt HOA/thường)"
                            autoFocus
                            autoComplete="username"
                            style={{
                                width: "100%", padding: "12px 14px", borderRadius: 10,
                                border: `1px solid ${error ? "#FCA5A5" : "#E2E8F0"}`,
                                background: "#F8FAFC", fontSize: 14, color: "#0F172A",
                                outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                                transition: "border-color 0.2s, box-shadow 0.2s",
                            }}
                            onFocus={e => { e.target.style.borderColor = "#3B82F6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                            onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
                        />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ color: "#475569", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                            Mật khẩu
                        </label>
                        <div style={{ position: "relative" }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(""); }}
                                placeholder="Nhập mật khẩu"
                                autoComplete="current-password"
                                style={{
                                    width: "100%", padding: "12px 42px 12px 14px", borderRadius: 10,
                                    border: `1px solid ${error ? "#FCA5A5" : "#E2E8F0"}`,
                                    background: "#F8FAFC", fontSize: 14, color: "#0F172A",
                                    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                                    transition: "border-color 0.2s, box-shadow 0.2s",
                                }}
                                onFocus={e => { e.target.style.borderColor = "#3B82F6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                                onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                                    background: "none", border: "none", cursor: "pointer", color: "#94A3B8",
                                    padding: 0,
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%", padding: "12px 16px", borderRadius: 10,
                            background: loading ? "#94A3B8" : "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                            color: "#fff", fontSize: 14, fontWeight: 600,
                            border: "none", cursor: loading ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            boxShadow: loading ? "none" : "0 4px 12px rgba(59,130,246,0.3)",
                            transition: "all 0.3s",
                            fontFamily: "inherit",
                        }}
                    >
                        <LogIn size={16} />
                        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </form>

                {/* Available accounts hint */}
                <div style={{
                    marginTop: 24, padding: "12px 16px",
                    background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0",
                }}>
                    <div style={{ color: "#64748B", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                        💡 Tài khoản có sẵn:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {["le", "quan", "tuan", "phuong", "toan", "linh", "loi"].map(u => (
                            <span key={u} onClick={() => { setUsername(u); setError(""); }} style={{
                                padding: "3px 10px", background: "#EFF6FF", color: "#3B82F6",
                                borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "monospace",
                                transition: "all 0.15s", border: "1px solid transparent",
                            }}
                                onMouseEnter={e => { e.target.style.background = "#3B82F6"; e.target.style.color = "#fff"; }}
                                onMouseLeave={e => { e.target.style.background = "#EFF6FF"; e.target.style.color = "#3B82F6"; }}
                            >{u}</span>
                        ))}
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: 10, marginTop: 6 }}>
                        Mật khẩu mặc định: <code style={{ background: "#E2E8F0", padding: "1px 5px", borderRadius: 4 }}>123456</code>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
        </div>
    );
}
