export const STATUS_CONFIG = {
    todo: { label: "Todo", color: "#6B7280", bg: "#374151" },
    doing: { label: "Đang làm", color: "#3B82F6", bg: "#1E3A5F" },
    review: { label: "Review", color: "#A855F7", bg: "#3B1E5F" },
    blocked: { label: "Blocked", color: "#EF4444", bg: "#5F1E1E" },
    done: { label: "Hoàn thành", color: "#10B981", bg: "#1E5F3A" },
};

export const PRIORITY_CONFIG = {
    critical: { label: "Critical", color: "#EF4444", icon: "🔴" },
    high: { label: "High", color: "#F59E0B", icon: "🟠" },
    medium: { label: "Medium", color: "#3B82F6", icon: "🔵" },
    low: { label: "Low", color: "#6B7280", icon: "⚪" },
};

export const ACT_TYPES = {
    comment: { icon: "MessageCircle", color: "#3B82F6", label: "bình luận" },
    status: { icon: "CheckCircle", color: "#10B981", label: "cập nhật" },
    task_created: { icon: "Plus", color: "#F59E0B", label: "tạo task" },
    ai_usage: { icon: "Bot", color: "#A855F7", label: "dùng AI" },
};

export function timeAgo(ts) {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return "vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return new Date(ts).toLocaleDateString("vi-VN");
}

export function calcTempo(userId, activities) {
    const userActs = activities.filter(a => a.user === userId);
    if (userActs.length === 0) return { score: 0, label: "Chưa hoạt động", color: "#6B7280", streak: 0, lastActive: null };

    const last = Math.max(...userActs.map(a => a.ts));
    const hoursSinceLast = (Date.now() - last) / 3600000;
    const last24h = userActs.filter(a => (Date.now() - a.ts) < 86400000).length;

    const daySet = new Set(userActs.map(a => new Date(a.ts).toDateString()));
    let streak = 0;
    let d = new Date();
    while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }

    let score = 0;
    if (hoursSinceLast < 1) score = 100;
    else if (hoursSinceLast < 4) score = 85;
    else if (hoursSinceLast < 12) score = 70;
    else if (hoursSinceLast < 24) score = 50;
    else if (hoursSinceLast < 48) score = 30;
    else score = 10;

    score = Math.min(100, score + last24h * 5);

    let label, color;
    if (score >= 80) { label = "On Fire"; color = "#EF4444"; }
    else if (score >= 60) { label = "Active"; color = "#F59E0B"; }
    else if (score >= 40) { label = "Normal"; color = "#3B82F6"; }
    else if (score >= 20) { label = "Slow"; color = "#9CA3AF"; }
    else { label = "Inactive"; color = "#6B7280"; }

    return { score, label, color, streak, lastActive: last, last24h };
}
