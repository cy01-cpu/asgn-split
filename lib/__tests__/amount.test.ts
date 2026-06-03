import { describe, it, expect } from "vitest";
import { evalAmountExpr } from "../amount";

describe("evalAmountExpr", () => {
  it("純數字直接回傳", () => {
    expect(evalAmountExpr("120")).toBe(120);
  });

  it("加法：120+80 → 200", () => {
    expect(evalAmountExpr("120+80")).toBe(200);
  });

  it("混合運算遵守先乘除後加減：2+3*4 → 14", () => {
    expect(evalAmountExpr("2+3*4")).toBe(14);
  });

  it("括號改變運算順序：(300-50)/2 → 125", () => {
    expect(evalAmountExpr("(300-50)/2")).toBe(125);
  });

  it("非整數結果四捨五入：10/3 → 3", () => {
    expect(evalAmountExpr("10/3")).toBe(3);
  });

  it("四捨五入進位：7/2 → 4", () => {
    expect(evalAmountExpr("7/2")).toBe(4);
  });

  it("忽略前後空白", () => {
    expect(evalAmountExpr("  50 + 50  ")).toBe(100);
  });

  it("空字串回傳 null", () => {
    expect(evalAmountExpr("")).toBeNull();
    expect(evalAmountExpr("   ")).toBeNull();
  });

  it("結果為 0 回傳 null（金額需為正）", () => {
    expect(evalAmountExpr("0")).toBeNull();
    expect(evalAmountExpr("50-50")).toBeNull();
  });

  it("負數結果回傳 null", () => {
    expect(evalAmountExpr("50-100")).toBeNull();
  });

  it("除以 0（Infinity）回傳 null", () => {
    expect(evalAmountExpr("10/0")).toBeNull();
  });

  it("白名單防護：含英文字母一律拒絕", () => {
    expect(evalAmountExpr("alert(1)")).toBeNull();
    expect(evalAmountExpr("1e3")).toBeNull();
  });

  it("白名單防護：拒絕非允許符號", () => {
    expect(evalAmountExpr("100;200")).toBeNull();
    expect(evalAmountExpr("0x10")).toBeNull();
    expect(evalAmountExpr("100%3")).toBeNull();
  });

  it("語法錯誤（解析失敗）回傳 null", () => {
    expect(evalAmountExpr("(1+")).toBeNull();
    expect(evalAmountExpr("1++")).toBeNull();
  });
});
