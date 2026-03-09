"use client";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children, width = 480 }) {
    return (
        <div className="fade-in" onClick={onClose} style={{
            position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg-overlay)", backdropFilter: "blur(4px)",
        }}>
            <div className="scale-in" onClick={e => e.stopPropagation()} style={{
                width, maxWidth: "92vw", maxHeight: "85vh", overflow: "auto",
                background: "var(--bg-elevated)", borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-xl)",
                padding: "24px 28px",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border-primary)" }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
                    <button onClick={onClose} style={{
                        background: "var(--bg-tertiary)", border: "none", borderRadius: 8, width: 32, height: 32,
                        cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center",
                    }}><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}
