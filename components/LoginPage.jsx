"use client";
import { useState } from "react";
import { Zap, Eye, EyeOff, User, Lock } from "lucide-react";
import { useUser } from "@/lib/UserContext";
import { setCachedData } from "@/lib/cache";

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
            fetch(`/api/dashboard?user_id=${user.id}`)
                .then(r => r.json())
                .then(data => {
                    setCachedData(user.id, data);
                });
        } catch (err) {
            setError(err.message || "Đăng nhập thất bại");
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Left side — Hero Image */}
            <div className="login-left">
                <img
                    src="/login_hero.jpg"
                    alt="AI Together — Nền tảng cộng tác thông minh cho đội ngũ của bạn"
                    className="login-hero-img"
                />
            </div>

            {/* Right side — Login Form */}
            <div className="login-right">
                <div className="login-form-wrapper">
                    <div className="login-form-card">
                        <div className="login-form-header">
                            <div className="login-form-icon">
                                <Zap size={22} color="#fff" />
                            </div>
                            <h2 className="login-form-title">Đăng nhập</h2>
                            <p className="login-form-subtitle">Chào mừng bạn trở lại</p>
                        </div>

                        <form onSubmit={handleSubmit} className="login-form">
                            {error && (
                                <div className="login-error">
                                    {error}
                                </div>
                            )}

                            <div className="login-field">
                                <label className="login-label">Username</label>
                                <div className="login-input-wrapper">
                                    <User size={16} className="login-input-icon" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="Nhập username..."
                                        autoFocus
                                        autoComplete="username"
                                        className="login-input"
                                    />
                                </div>
                            </div>

                            <div className="login-field">
                                <label className="login-label">Password</label>
                                <div className="login-input-wrapper">
                                    <Lock size={16} className="login-input-icon" />
                                    <input
                                        type={showPw ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••"
                                        autoComplete="current-password"
                                        className="login-input"
                                        style={{ paddingRight: 44 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        className="login-pw-toggle"
                                    >
                                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !username || !password}
                                className="login-submit"
                            >
                                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                            </button>
                        </form>

                        <div className="login-footer">
                            Libe Tech © 2026 — AI OS Platform
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
