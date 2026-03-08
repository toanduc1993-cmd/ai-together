"use client";
export default function Badge({ children, color, bg }) {
    return (
        <span style={{ background: bg || `${color}20`, color, padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>{children}</span>
    );
}
