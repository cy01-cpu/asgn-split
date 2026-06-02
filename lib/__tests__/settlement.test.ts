import { describe, it, expect } from "vitest";
import { calcSettlement, type SettlementParticipant } from "../settlement";

const A: SettlementParticipant = { id: 1, name: "Amy", emoji: "🌸" };
const B: SettlementParticipant = { id: 2, name: "Ben", emoji: "🎈" };
const C: SettlementParticipant = { id: 3, name: "Cara", emoji: "🐳" };
const D: SettlementParticipant = { id: 4, name: "Dan", emoji: "🦔" };

/** 套用轉帳清單後，回傳每人最終餘額（應全為 0 才算結清）。 */
function applyTransfers(
  balances: Record<number, number>,
  participants: SettlementParticipant[],
  transfers: { from: string; to: string; amount: number }[]
): Record<number, number> {
  const byName = new Map(participants.map((p) => [p.name, p.id]));
  const result: Record<number, number> = { ...balances };
  for (const t of transfers) {
    const fromId = byName.get(t.from)!;
    const toId = byName.get(t.to)!;
    result[fromId] += t.amount; // 債務人付錢後欠款減少（餘額往 0 靠）
    result[toId] -= t.amount; // 債主收錢後被欠減少
  }
  return result;
}

describe("calcSettlement", () => {
  it("3 人平均分帳，套用轉帳後餘額正確歸零", () => {
    // Amy 付 300，3 人均分（各 100）→ Amy +200、Ben -100、Cara -100
    const participants = [A, B, C];
    const balances = { 1: 200, 2: -100, 3: -100 };

    const transfers = calcSettlement(participants, balances);

    expect(transfers).toEqual([
      { from: "Ben", to: "Amy", amount: 100 },
      { from: "Cara", to: "Amy", amount: 100 },
    ]);

    // 套用後每人歸零
    const after = applyTransfers(balances, participants, transfers);
    expect(after).toEqual({ 1: 0, 2: 0, 3: 0 });
  });

  it("多個債主、多個負債，轉帳清單正確且零和", () => {
    // Amy +50、Ben +30、Cara -40、Dan -40
    const participants = [A, B, C, D];
    const balances = { 1: 50, 2: 30, 3: -40, 4: -40 };

    const transfers = calcSettlement(participants, balances);

    // 貪心：先撮合最大債主 Amy(50) 與最大債務人 Cara(40)…
    expect(transfers).toEqual([
      { from: "Cara", to: "Amy", amount: 40 },
      { from: "Dan", to: "Amy", amount: 10 },
      { from: "Dan", to: "Ben", amount: 30 },
    ]);

    // 收款總額 = 付款總額
    const received = transfers.reduce((s, t) => s + t.amount, 0);
    expect(received).toBe(80);
    expect(applyTransfers(balances, participants, transfers)).toEqual({
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    });
  });

  it("單人情境（餘額為 0）無需轉帳", () => {
    expect(calcSettlement([A], { 1: 0 })).toEqual([]);
  });

  it("全員餘額為 0 時回傳空清單", () => {
    expect(calcSettlement([A, B, C], { 1: 0, 2: 0, 3: 0 })).toEqual([]);
  });

  it("已部分還款後，餘額更新並反映在轉帳金額", () => {
    // 初始：Ben 欠 Amy 100（Amy +100、Ben -100）
    const participants = [A, B];
    const initial = { 1: 100, 2: -100 };

    // Ben 先還款 60（還款者欠款 +60、收款者被欠 -60）
    const repaid = 60;
    const afterRepay: Record<number, number> = {
      1: initial[1] - repaid,
      2: initial[2] + repaid,
    };
    expect(afterRepay).toEqual({ 1: 40, 2: -40 });

    // 結算只需再轉剩餘的 40
    const transfers = calcSettlement(participants, afterRepay);
    expect(transfers).toEqual([{ from: "Ben", to: "Amy", amount: 40 }]);
  });
});
