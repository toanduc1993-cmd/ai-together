"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Restore session on mount
    useEffect(() => {
        const stored = localStorage.getItem("ai_together_user");
        const token = localStorage.getItem("ai_together_token");
        if (stored && token) {
            try {
                const user = JSON.parse(stored);
                setCurrentUser(user);
                setIsAuthenticated(true);
            } catch { }
        }
        setLoading(false);
    }, []);

    // Fetch notifications when authenticated
    useEffect(() => {
        if (!currentUser?.id) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [currentUser?.id]);

    const fetchNotifications = useCallback(async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch(`/api/notifications?user_id=${currentUser.id}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch { }
    }, [currentUser?.id]);

    const login = async (username, password) => {
        const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setCurrentUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem("ai_together_user", JSON.stringify(data.user));
        localStorage.setItem("ai_together_token", data.token);
        return data.user;
    };

    const logout = () => {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setNotifications([]);
        setUnreadCount(0);
        localStorage.removeItem("ai_together_user");
        localStorage.removeItem("ai_together_token");
    };

    const updateUser = (user) => {
        setCurrentUser(user);
        localStorage.setItem("ai_together_user", JSON.stringify(user));
    };

    const markNotificationsRead = async () => {
        if (!currentUser?.id) return;
        try {
            await fetch("/api/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: currentUser.id }),
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch { }
    };

    const hasPermission = (perm) => {
        if (!currentUser) return false;
        if (currentUser.role === "chairman") return true;
        return currentUser.permissions?.[perm] === true;
    };

    const isChairman = currentUser?.role === "chairman";
    const isProjectLead = currentUser?.role === "project_lead" || isChairman;

    return (
        <UserContext.Provider value={{
            currentUser, isAuthenticated, loading,
            login, logout, updateUser, hasPermission,
            isChairman, isProjectLead,
            notifications, unreadCount, fetchNotifications, markNotificationsRead,
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}
