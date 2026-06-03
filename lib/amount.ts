/**
 * 金額算式解析（純函式）
 * ------------------------------------------------------------------
 * 從 `app/events/[id]/page.tsx` 抽出，讓使用者在金額欄位可輸入簡易
 * 四則運算（例：`120+80`、`(300-50)/2`），即時換算成整數金額。
 *
 * 安全性：先用白名單正則限制只允許數字與 `+ - * / ( ) .` 與空白，
 * 再交給 `Function` 求值，避免任意 JS 注入。任何不合法、非正數、
 * 非有限數或解析失敗皆回傳 `null`（呼叫端通常 fallback 到 Number()）。
 */
export function evalAmountExpr(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (!/^[\d\s+\-*/().]+$/.test(trimmed)) return null;
  try {
    const result = new Function(`"use strict"; return (${trimmed})`)();
    if (typeof result !== "number" || !isFinite(result) || result <= 0) return null;
    return Math.round(result);
  } catch {
    return null;
  }
}
