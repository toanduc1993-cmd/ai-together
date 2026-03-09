export default function Select({ label, children, ...props }) {
    return (
        <div style={{ marginBottom: 14 }}>
            {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, letterSpacing: 0.1 }}>{label}</label>}
            <select {...props} style={{
                width: "100%", padding: "10px 14px", borderRadius: "var(--radius-sm)",
                border: "1.5px solid var(--border-primary)", background: "var(--bg-primary)",
                color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer",
                transition: "all 0.2s", appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238C95A8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                ...props.style,
            }}>
                {children}
            </select>
        </div>
    );
}
