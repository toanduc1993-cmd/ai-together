// Stale-While-Revalidate data cache
// Shows cached data INSTANTLY, then refreshes in background
// Cache is scoped per user to prevent cross-account data leaks

const CACHE_PREFIX = "ai_together_cache_";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId) {
    return userId ? `${CACHE_PREFIX}${userId}` : null;
}

export function getCachedData(userId) {
    if (typeof window === "undefined" || !userId) return null;
    try {
        const raw = localStorage.getItem(getCacheKey(userId));
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        // Return data even if stale — caller decides whether to refetch
        return { data, ts, isStale: Date.now() - ts > CACHE_TTL };
    } catch {
        return null;
    }
}

export function setCachedData(userId, data) {
    if (typeof window === "undefined" || !userId) return;
    try {
        localStorage.setItem(getCacheKey(userId), JSON.stringify({ data, ts: Date.now() }));
    } catch { }
}

export function clearCachedData(userId) {
    if (typeof window === "undefined") return;
    try {
        if (userId) {
            localStorage.removeItem(getCacheKey(userId));
        }
        // Also clean up legacy global cache key if it exists
        localStorage.removeItem("ai_together_cache");
    } catch { }
}

// Fetch with instant cache — returns cached data immediately, then fetches fresh
export async function fetchDashboard(userId) {
    const cached = getCachedData(userId);
    const url = userId ? `/api/dashboard?user_id=${userId}` : "/api/dashboard";

    // If we have cached data, start fetch in background and return cache first
    const fetchPromise = fetch(url)
        .then(r => r.json())
        .then(data => {
            setCachedData(userId, data);
            return data;
        })
        .catch(() => cached?.data || null);

    // Return cache immediately if available, plus the promise for fresh data
    return {
        cached: cached?.data || null,
        isStale: cached?.isStale ?? true,
        fresh: fetchPromise,
    };
}
