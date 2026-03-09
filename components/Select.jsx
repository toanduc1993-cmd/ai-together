"use client";
export default function Select({ label, value, onChange, options = [], placeholder }) {
    return (
        <div style={{ marginBottom: 12 }}>
            {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{label}</label>}
            <select value={value} onChange={e => onChange(e.target.value)}
                style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #D1D5DB",
                    fontSize: 13, color: value ? "#0F172A" : "#9CA3AF", background: "#FFFFFF",
                    outline: "none", transition: "border-color 0.2s", boxSizing: "border-box", cursor: "pointer",
                }}
                onFocus={e => e.target.style.borderColor = "#8B5CF6"}
                onBlur={e => e.target.style.borderColor = "#D1D5DB"}>
                <option value="">{placeholder || "Chọn..."}</option>
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}
