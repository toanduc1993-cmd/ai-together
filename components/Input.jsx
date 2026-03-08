"use client";
export default function Input({ label, value, onChange, placeholder, type = "text", multiline }) {
    const base = { width: "100%", background: "#F8FAFC", color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.2s" };
    return (
        <div style={{ marginBottom: 12 }}>
            {label && <label style={{ color: "#64748B", fontSize: 12, display: "block", marginBottom: 4, fontWeight: 500 }}>{label}</label>}
            {multiline ? (
                <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
                    style={{ ...base, resize: "vertical" }} />
            ) : (
                <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    style={base} />
            )}
        </div>
    );
}
