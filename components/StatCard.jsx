"use client";
export default function StatCard({ icon: Icon, label, value, sub, color = "#3B82F6", highlight }) {
    return (
        <div className="metric-card" style={{
            borderColor: highlight ? `${color}30` : undefined,
            background: highlight ? `${color}08` : undefined,
        }}>
            <div className="metric-card-icon" style={{ background: `${color}15`, color }}>
                <Icon size={18} />
            </div>
            <div>
                <div className="metric-card-value" style={{ fontSize: 24 }}>{value}</div>
                <div className="metric-card-label">{label}</div>
                {sub && <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{sub}</div>}
            </div>
        </div>
    );
}
