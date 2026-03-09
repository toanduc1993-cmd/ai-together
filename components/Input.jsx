"use client";
export default function Input({ label, value, onChange, placeholder, type = "text", disabled = false }) {
    return (
        <div style={{ marginBottom: 12 }}>
            {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{label}</label>}
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
                style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #D1D5DB",
                    fontSize: 13, color: "#0F172A", background: disabled ? "#F9FAFB" : "#FFFFFF",
                    outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "#8B5CF6"}
                onBlur={e => e.target.style.borderColor = "#D1D5DB"}
            />
        </div>
    );
}
