"use client";
export default function Modal({ title, onClose, children, width = 480 }) {
    return (
        <div onClick={onClose} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16,
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: "#FFFFFF", borderRadius: 16, padding: 24, width: "100%", maxWidth: width,
                maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{title}</h3>
                    <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontWeight: 700, color: "#64748B", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}
