"use client";
import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // On mount, check for saved session
    useEffect(() => {
        const savedToken = localStorage.getItem("ai_together_token");
        const savedUser = localStorage.getItem("ai_together_user");
        if (savedToken && savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                setCurrentUser(parsed);
                setToken(savedToken);
                // Re-sync from server to get latest data
                fetch("/api/members").then(r => r.json()).then(members => {
                    const found = members.find(m => m.id.toLowerCase() === parsed.id.toLowerCase());
                    if (found) {
                        const { password: _, ...safeUser } = found;
                        setCurrentUser(safeUser);
                        localStorage.setItem("ai_together_user", JSON.stringify(safeUser));
                    }
                }).catch(() => { });
            } catch { /* invalid data, ignore */ }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error };
        }
        setCurrentUser(data.user);
        setToken(data.token);
        localStorage.setItem("ai_together_token", data.token);
        localStorage.setItem("ai_together_user", JSON.stringify(data.user));
        return { success: true, user: data.user };
    };

    const updateUser = (user) => {
        setCurrentUser(user);
        localStorage.setItem("ai_together_user", JSON.stringify(user));
    };

    const logout = () => {
        setCurrentUser(null);
        setToken(null);
        localStorage.removeItem("ai_together_token");
        localStorage.removeItem("ai_together_user");
    };

    const isAuthenticated = !!currentUser && !!token;

    // Case-insensitive permission check
    const hasPermission = (perm) => {
        if (!currentUser) return false;
        if (currentUser.role === "chairman") return true;
        return currentUser.permissions?.[perm] ?? false;
    };

    return (
        <UserContext.Provider value={{ currentUser, token, loading, isAuthenticated, login, logout, updateUser, hasPermission }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUser must be used within UserProvider");
    return ctx;
}
