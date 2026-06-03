// 活動明細頁共用行內樣式
// 從 app/events/[id]/page.tsx 抽出。

import type { CSSProperties } from "react";

export const inputSt: CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 16,
  color: "var(--text-main)",
  outline: "none",
};

export const accentBtnSt: CSSProperties = {
  padding: "12px 16px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

export const ghostBtnSt: CSSProperties = {
  flex: 1,
  padding: "12px 0",
  background: "var(--bg-card)",
  color: "var(--text-main)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

export const rowCard: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "12px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

export const deleteIconBtn: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  padding: 4,
  borderRadius: 6,
  lineHeight: 1,
  flexShrink: 0,
};
