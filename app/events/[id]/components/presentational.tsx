// 純展示型小元件
// 從 app/events/[id]/page.tsx 抽出。被 client 入口 page.tsx import，
// 自動納入 client bundle，故無需各自標註 "use client"。

import { useState, useEffect } from "react";
import type { ReactNode } from "react";

function RollingDigit({ speed }: { speed: number }) {
  const [n, setN] = useState(() => Math.floor(Math.random() * 10));
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v + 1) % 10), speed);
    return () => clearInterval(t);
  }, [speed]);
  return (
    <span style={{ display: "inline-block", width: "0.58em", textAlign: "center" }}>
      {n}
    </span>
  );
}

export function SettlementLoadingView() {
  return (
    <div style={{ textAlign: "center", padding: "52px 0 44px" }}>
      <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 18 }}>🧮</div>
      <div style={{
        fontFamily: "monospace",
        fontSize: 26,
        fontWeight: 700,
        color: "var(--accent)",
        letterSpacing: "0.08em",
        marginBottom: 14,
      }}>
        <RollingDigit speed={85} />
        <RollingDigit speed={120} />
        <RollingDigit speed={97} />
        <span style={{ opacity: 0.35, margin: "0 1px" }}>,</span>
        <RollingDigit speed={110} />
        <RollingDigit speed={74} />
        <RollingDigit speed={91} />
      </div>
      <p style={{ fontSize: 13, color: "var(--text-sub)", margin: 0, letterSpacing: "0.06em" }}>
        計算中
      </p>
    </div>
  );
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-sub)" }}>
      <div style={{ fontSize: 44, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: 16 }}>{text}</p>
    </div>
  );
}

export function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
      {text}
    </p>
  );
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 14, color: "var(--text-sub)", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
