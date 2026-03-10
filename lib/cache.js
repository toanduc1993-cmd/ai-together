// Stale-While-Revalidate data cache
// Shows cached data INSTANTLY, then refreshes in background

const CACHE_KEY = "ai_together_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedData() {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        // Return data even if stale — caller decides whether to refetch
        return { data, ts, isStale: Date.now() - ts > CACHE_TTL };
    } catch {
        return null;
    }
}

export function setCachedData(data) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch { }
}

// Fetch with instant cache — returns cached data immediately, then fetches fresh
export async function fetchDashboard(userId) {
    const cached = getCachedData();
    const url = userId ? `/api/dashboard?user_id=${userId}` : "/api/dashboard";

    // If we have cached data, start fetch in background and return cache first
    const fetchPromise = fetch(url)
        .then(r => r.json())
        .then(data => {
            setCachedData(data);
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
