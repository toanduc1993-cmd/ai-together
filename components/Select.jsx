"use client";
export default function Select({ label, value, onChange, options, placeholder }) {
    return (
        <div style={{ marginBottom: 12 }}>
            {label && <label style={{ color: "#64748B", fontSize: 12, display: "block", marginBottom: 4, fontWeight: 500 }}>{label}</label>}
            <select value={value} onChange={e => onChange(e.target.value)}
                style={{ width: "100%", background: "#F8FAFC", color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", transition: "border-color 0.2s" }}>
                <option value="">{placeholder || "Chọn..."}</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}
