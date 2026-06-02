/**
 * 結算貪心演算法（純函式）
 * ------------------------------------------------------------------
 * 從 `app/api/events/[id]/settlement/route.ts` 抽出的核心邏輯，與 DB
 * 解耦後可單獨進行單元測試。route 仍負責查 DB、計算每人淨餘額
 * （含還款調整），再把結果交給本函式撮合最小轉帳。
 *
 * 輸入的 `balances` 為每人淨餘額：
 *   - 正值 = 被欠錢（債主，待收）
 *   - 負值 = 欠人錢（債務人，未償）
 * 正確的餘額必定零和（Σ balance === 0），本函式據此貪心配對。
 */

export type SettlementParticipant = { id: number; name: string; emoji: string };

/** 一筆轉帳：from（付款者）→ to（收款者）。皆以成員名稱表示。 */
export type SettlementTransfer = { from: string; to: string; amount: number };

/**
 * 貪心最小轉帳：每次撮合「最大債主」與「最大債務人」，
 * 轉帳金額取兩者絕對值的較小者，直到所有人歸零。
 * 產生的轉帳筆數最多為 max(債主數, 債務人數)。
 */
export function calcSettlement(
  participants: SettlementParticipant[],
  balances: Record<number, number>
): SettlementTransfer[] {
  type Entry = { name: string; amount: number };
  const creditors: Entry[] = [];
  const debtors: Entry[] = [];

  for (const p of participants) {
    const bal = balances[p.id] ?? 0;
    if (bal > 0) creditors.push({ name: p.name, amount: bal });
    else if (bal < 0) debtors.push({ name: p.name, amount: -bal });
  }

  // 由大到小排序，讓單筆轉帳盡量大、總筆數盡量少。
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const transfer = Math.min(c.amount, d.amount);
    if (transfer > 0) {
      transfers.push({ from: d.name, to: c.name, amount: transfer });
    }
    c.amount -= transfer;
    d.amount -= transfer;
    if (c.amount === 0) ci++;
    if (d.amount === 0) di++;
  }

  return transfers;
}
