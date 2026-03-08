"use client";
export default function StatCard({ icon: Icon, label, value, sub, color = "#3B82F6", highlight }) {
    return (
        <div style={{ background: highlight ? `${color}08` : "#FFFFFF", borderRadius: 12, padding: "16px 20px", border: `1px solid ${highlight ? `${color}30` : "#E2E8F0"}`, transition: "all 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Icon size={16} color={color} />
                <span style={{ color: "#64748B", fontSize: 13 }}>{label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
            {sub && <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>{sub}</div>}
        </div>
    );
}
