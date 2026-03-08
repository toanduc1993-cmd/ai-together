"use client";
export default function Btn({ children, onClick, color = "#3B82F6", variant = "filled", size = "md", style: sx = {} }) {
    const pad = size === "sm" ? "4px 10px" : "8px 16px";
    const fs = size === "sm" ? 12 : 13;
    return (
        <button onClick={onClick} style={{
            background: variant === "filled" ? color : "transparent",
            color: variant === "filled" ? "#fff" : color,
            border: variant === "outline" ? `1px solid ${color}` : "none",
            padding: pad, borderRadius: 8, fontSize: fs, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.2s", ...sx
        }}>{children}</button>
    );
}
