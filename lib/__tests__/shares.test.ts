import { describe, it, expect } from "vitest";
import { buildEqualShares, buildCustomShares } from "../shares";

const sum = (shares: { amount: number }[]) => shares.reduce((s, x) => s + x.amount, 0);

describe("buildEqualShares", () => {
  it("1 元分 3 人：餘數補在最後一人（0 / 0 / 1）", () => {
    const shares = buildEqualShares(1, [10, 20, 30]);
    expect(shares).toEqual([
      { memberId: 10, amount: 0 },
      { memberId: 20, amount: 0 },
      { memberId: 30, amount: 1 },
    ]);
    expect(sum(shares)).toBe(1);
  });

  it("3 元分 5 人：部分成員分到 0，總和仍等於總額", () => {
    const shares = buildEqualShares(3, [1, 2, 3, 4, 5]);
    expect(shares.map((s) => s.amount)).toEqual([0, 0, 0, 0, 3]);
    expect(sum(shares)).toBe(3);
    // 仍涵蓋全部 5 位成員（平均分攤不排除任何人）
    expect(shares).toHaveLength(5);
  });

  it("可整除時平均分配（300 分 3 人 → 100 / 100 / 100）", () => {
    const shares = buildEqualShares(300, [1, 2, 3]);
    expect(shares.map((s) => s.amount)).toEqual([100, 100, 100]);
    expect(sum(shares)).toBe(300);
  });

  it("金額 0 元：每人皆為 0", () => {
    const shares = buildEqualShares(0, [1, 2, 3]);
    expect(shares.map((s) => s.amount)).toEqual([0, 0, 0]);
    expect(sum(shares)).toBe(0);
  });

  it("無成員時回傳空陣列", () => {
    expect(buildEqualShares(100, [])).toEqual([]);
  });
});

describe("buildCustomShares", () => {
  it("60 / 40 比例：1000 元換算為 600 / 400", () => {
    const shares = buildCustomShares(1000, [
      { memberId: 1, ratio: 60 },
      { memberId: 2, ratio: 40 },
    ]);
    expect(shares).toEqual([
      { memberId: 1, amount: 600 },
      { memberId: 2, amount: 400 },
    ]);
    expect(sum(shares)).toBe(1000);
  });

  it("33 / 33 / 34（合計 100）：餘數補在最後一人，總和等於總額", () => {
    const shares = buildCustomShares(1000, [
      { memberId: 1, ratio: 33 },
      { memberId: 2, ratio: 33 },
      { memberId: 3, ratio: 34 },
    ]);
    expect(shares.map((s) => s.amount)).toEqual([330, 330, 340]);
    expect(sum(shares)).toBe(1000);
  });

  it("比例為 0 的成員會被排除", () => {
    const shares = buildCustomShares(1000, [
      { memberId: 1, ratio: 50 },
      { memberId: 2, ratio: 0 },
      { memberId: 3, ratio: 50 },
    ]);
    expect(shares).toEqual([
      { memberId: 1, amount: 500 },
      { memberId: 3, amount: 500 },
    ]);
    expect(sum(shares)).toBe(1000);
  });

  it("金額 0 元：有效比例成員皆為 0", () => {
    const shares = buildCustomShares(0, [
      { memberId: 1, ratio: 50 },
      { memberId: 2, ratio: 50 },
    ]);
    expect(shares.map((s) => s.amount)).toEqual([0, 0]);
    expect(sum(shares)).toBe(0);
  });

  it("總比例為 0 時回傳空陣列", () => {
    expect(buildCustomShares(1000, [{ memberId: 1, ratio: 0 }])).toEqual([]);
  });
});
