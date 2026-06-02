/**
 * 費用分攤計算（純函式）
 * ------------------------------------------------------------------
 * 從 `app/events/[id]/page.tsx` 抽出的分帳核心，與 React 狀態解耦後
 * 可單獨進行單元測試。
 *
 * 兩個函式皆保證「各人分攤金額總和 === 費用總額」（餘數一律補在最後
 * 一人身上），這是後端 `parseExpenseBody` 的硬性檢查，也避免結算時
 * 出現吃掉的殘額。
 */

export type Share = { memberId: number; amount: number };

/**
 * 平均分攤：總額除以人數，餘數補在最後一人。
 * 小額時部分成員可能分到 0（例：1 元分 3 人 → 0/0/1）。
 */
export function buildEqualShares(amount: number, memberIds: number[]): Share[] {
  const n = memberIds.length;
  if (n === 0) return [];
  const base = Math.floor(amount / n);
  let distributed = 0;
  return memberIds.map((id, i) => {
    const amt = i === n - 1 ? amount - distributed : base;
    distributed += amt;
    return { memberId: id, amount: amt };
  });
}

/**
 * 自訂比例分攤：依各人比例占總比例的份額分配金額，餘數補在最後一人。
 * 比例為 0（或負）的成員會被排除，不出現在結果中。
 */
export function buildCustomShares(
  amount: number,
  ratios: { memberId: number; ratio: number }[]
): Share[] {
  const active = ratios.filter((r) => r.ratio > 0);
  const totalRatio = active.reduce((s, r) => s + r.ratio, 0);
  if (totalRatio === 0) return [];
  let distributed = 0;
  return active.map((r, i) => {
    const amt =
      i === active.length - 1
        ? amount - distributed
        : Math.floor((r.ratio / totalRatio) * amount);
    distributed += amt;
    return { memberId: r.memberId, amount: amt };
  });
}
