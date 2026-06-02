/**
 * 後端輸入驗證小工具
 * ------------------------------------------------------------------
 * 原本各 API 直接 `Number(amount)`、`new Date(startDate)`，遇到
 * undefined / 字串 / 負數 / NaN 會把髒資料寫進 DB 或丟出未處理的 500。
 * 這裡集中提供「轉換失敗就回傳 null」的純函式，讓路由能明確擋下並回 400。
 */

/** 金額：必須為正整數（單位為元，schema 是 Int）。用於費用總額、還款金額。 */
export function toAmount(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * 非負整數：用於「個別分攤金額」。
 * 平均分攤小額時（例：NT$3 分給 5 人）部分成員分到 0 是合理的，
 * 因此分攤金額允許 0，僅費用總額要求 > 0。
 */
export function toNonNegInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** 主鍵 id：必須為正整數。 */
export function toId(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** 文字欄位：去除前後空白後不可為空，且限制長度上限。 */
export function cleanStr(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : null;
}

/** 解析日期字串，非法日期回傳 null（避免寫入 Invalid Date）。 */
export function toDate(v: unknown): Date | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
