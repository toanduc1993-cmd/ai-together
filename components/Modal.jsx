"use client";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children, width = 520 }) {
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
            <div style={{ background: "#FFFFFF", borderRadius: 16, width, maxWidth: "92vw", maxHeight: "85vh", overflow: "auto", border: "1px solid #E2E8F0", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, background: "#FFFFFF", zIndex: 1 }}>
                    <h3 style={{ color: "#0F172A", margin: 0, fontSize: 16 }}>{title}</h3>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: 4 }}><X size={18} /></button>
                </div>
                <div style={{ padding: 20 }}>{children}</div>
            </div>
        </div>
    );
}
