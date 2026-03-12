"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { clearCachedData, getCachedData } from "@/lib/cache";

const UserContext = createContext();

export function UserProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevUserIdRef = useRef(null);

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

    // Fetch notifications — use user-scoped cache first, then API
    useEffect(() => {
        if (!currentUser?.id) return;

        // If user changed, clear old state immediately
        if (prevUserIdRef.current && prevUserIdRef.current !== currentUser.id) {
            setNotifications([]);
            setUnreadCount(0);
        }
        prevUserIdRef.current = currentUser.id;

        // Load from user-scoped cache
        try {
            const cached = getCachedData(currentUser.id);
            if (cached?.data && Array.isArray(cached.data.notifications)) {
                setNotifications(cached.data.notifications);
                setUnreadCount(cached.data.notifications.filter(n => !n.is_read).length);
            }
        } catch { }

        // Fetch fresh immediately on user change, then periodically
        fetchNotificationsForUser(currentUser.id);
        const interval = setInterval(() => fetchNotificationsForUser(currentUser.id), 60000);
        return () => clearInterval(interval);
    }, [currentUser?.id]);

    const fetchNotificationsForUser = async (userId) => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/notifications?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch { }
    };

    const fetchNotifications = useCallback(async () => {
        if (!currentUser?.id) return;
        await fetchNotificationsForUser(currentUser.id);
    }, [currentUser?.id]);

    const login = async (username, password) => {
        // Clear previous user's state BEFORE login
        setNotifications([]);
        setUnreadCount(0);

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
        const userId = currentUser?.id;
        setCurrentUser(null);
        setIsAuthenticated(false);
        setNotifications([]);
        setUnreadCount(0);
        prevUserIdRef.current = null;
        localStorage.removeItem("ai_together_user");
        localStorage.removeItem("ai_together_token");
        // Clear user-scoped cache on logout
        clearCachedData(userId);
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
