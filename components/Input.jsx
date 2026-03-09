export default function Input({ label, ...props }) {
    return (
        <div style={{ marginBottom: 14 }}>
            {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, letterSpacing: 0.1 }}>{label}</label>}
            <input {...props} className="input-field" style={{ ...props.style }} />
        </div>
    );
}
