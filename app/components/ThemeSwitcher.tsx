"use client";

import { useState } from "react";
import { useTheme } from "../hooks/useTheme";

const THEME_OPTIONS = [
  { value: "morandi" as const, color: "#9b8ea0", label: "莫蘭迪" },
  { value: "pink" as const, color: "#e08098", label: "粉櫻" },
  { value: "blue" as const, color: "#5b8fa8", label: "海藍" },
  { value: "green" as const, color: "#7aaa82", label: "抹茶" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="切換主題"
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "6px 9px",
          cursor: "pointer",
          fontSize: 17,
          lineHeight: 1,
          color: "var(--text-sub)",
        }}
      >
        🎨
      </button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 49 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "8px 10px",
            display: "flex",
            gap: 8,
            zIndex: 50,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}>
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setTheme(opt.value); setOpen(false); }}
                title={opt.label}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: opt.color,
                  border: "2.5px solid white",
                  outline: theme === opt.value ? `2.5px solid ${opt.color}` : "2.5px solid transparent",
                  cursor: "pointer",
                  padding: 0,
                  transition: "outline-color 0.15s, transform 0.15s",
                  transform: theme === opt.value ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
