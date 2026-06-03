// 顯示格式化 helper（純函式）
// 從 app/events/[id]/page.tsx 抽出。

export function fmtDateRange(startIso: string, endIso: string | null) {
  const [sy, sm, sd] = startIso.slice(0, 10).split("-");
  const start = `${sy}/${sm}/${sd}`;
  if (!endIso) return start;
  const [, em, ed] = endIso.slice(0, 10).split("-");
  const days = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86400000) + 1;
  return `${start} ~ ${em}/${ed}（${days}天）`;
}

export function fmtNT(n: number) {
  return `NT$${Math.abs(n).toLocaleString()}`;
}
