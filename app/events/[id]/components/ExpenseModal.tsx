// 新增／編輯費用 Modal（平均分攤 + 自訂比例）
// 從 app/events/[id]/page.tsx 抽出。
//
// 分攤金額預覽（equalPerPerson / customRatioSum）由 page 算好後傳入，
// 與 page 的送出驗證共用同一份計算，避免兩邊不一致。

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { evalAmountExpr } from "@/lib/amount";
import type { Participant, SplitMode } from "../types";
import { fmtNT } from "../format";
import { Field } from "./presentational";
import { inputSt, ghostBtnSt, accentBtnSt } from "../styles";

export function ExpenseModal({
  participants,
  isEditing,
  title,
  setTitle,
  amount,
  setAmount,
  paidById,
  setPaidById,
  splitMode,
  setSplitMode,
  equalSelected,
  setEqualSelected,
  customRatios,
  setCustomRatios,
  equalPerPerson,
  customRatioSum,
  saving,
  onClose,
  onSave,
}: {
  participants: Participant[];
  isEditing: boolean;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  amount: string;
  setAmount: Dispatch<SetStateAction<string>>;
  paidById: number | "";
  setPaidById: Dispatch<SetStateAction<number | "">>;
  splitMode: SplitMode;
  setSplitMode: Dispatch<SetStateAction<SplitMode>>;
  equalSelected: Set<number>;
  setEqualSelected: Dispatch<SetStateAction<Set<number>>>;
  customRatios: Record<number, string>;
  setCustomRatios: Dispatch<SetStateAction<Record<number, string>>>;
  equalPerPerson: number;
  customRatioSum: number;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(92,82,72,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
    >
      <div
        style={{
          background: "var(--bg-main)",
          border: "1px solid var(--border)",
          borderRadius: "20px 20px 0 0",
          padding: "24px 16px 32px",
          width: "100%",
          maxWidth: 640,
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
            {isEditing ? "編輯費用" : "新增費用"}
          </h2>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="rounded-full p-1.5 text-[#8c7e72] hover:text-[#5c5248] hover:bg-[#e8e0d5] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <Field label="費用標題">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="例：晚餐、計程車"
            style={inputSt}
            autoFocus
          />
        </Field>

        {/* Amount */}
        <Field label="金額（元）">
          <Input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={(e) => {
              e.stopPropagation();
              const result = evalAmountExpr(e.target.value);
              if (result !== null) setAmount(String(result));
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="金額（可輸入算式如 120+80）"
            style={inputSt}
          />
        </Field>

        {/* Paid by */}
        <Field label="誰付的">
          <Select
            value={String(paidById)}
            onValueChange={(v) => setPaidById(Number(v))}
          >
            <SelectTrigger
              style={inputSt}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {participants.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Split mode */}
        <Field label="分攤方式">
          <div style={{ display: "flex", gap: 8 }}>
            {(["equal", "custom"] as SplitMode[]).map((mode) => (
              <button
                key={mode}
                onClick={(e) => { e.stopPropagation(); setSplitMode(mode); }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 600,
                  background: splitMode === mode ? "var(--accent)" : "var(--bg-card)",
                  color: splitMode === mode ? "white" : "var(--text-main)",
                  transition: "all 0.15s",
                }}
              >
                {mode === "equal" ? "平均分攤" : "自訂比例"}
              </button>
            ))}
          </div>
        </Field>

        {/* Equal split */}
        {splitMode === "equal" && (
          <Field label="選擇分攤成員">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {participants.map((p) => {
                const checked = equalSelected.has(p.id);
                return (
                  <label
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      background: checked ? "var(--bg-main)" : "var(--bg-card)",
                      border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      transition: "all 0.12s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(equalSelected);
                        if (e.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        setEqualSelected(next);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ accentColor: "var(--accent)", width: 16, height: 16 }}
                    />
                    <span style={{ flex: 1, fontSize: 15 }}>{p.name}</span>
                    {checked && equalPerPerson > 0 && (
                      <span style={{ fontSize: 13, color: "var(--text-sub)" }}>
                        {fmtNT(equalPerPerson)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </Field>
        )}

        {/* Custom ratio */}
        {splitMode === "custom" && (
          <Field
            label={
              <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>自訂比例</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: customRatioSum === 100 ? "var(--morandi-green)" : "var(--morandi-red)",
                  }}>
                    合計 {customRatioSum}%
                    {customRatioSum !== 100 && " ≠ 100%"}
                  </span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, height: 6, background: "#e8e0d5", borderRadius: 3, overflow: "hidden", display: "block" }}>
                    <span style={{
                      display: "block",
                      height: "100%",
                      width: `${Math.min(customRatioSum, 100)}%`,
                      background: customRatioSum < 100 ? "#9b8ea0" : customRatioSum === 100 ? "#7a9e87" : "#b87c7c",
                      borderRadius: 3,
                      transition: "width 0.2s, background 0.2s",
                    }} />
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: customRatioSum < 100 ? "#9b8ea0" : customRatioSum === 100 ? "#7a9e87" : "#b87c7c",
                    minWidth: 34,
                    textAlign: "right",
                  }}>
                    {customRatioSum}%
                  </span>
                </span>
              </span>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {participants.map((p) => {
                const ratio = Number(customRatios[p.id] ?? 0);
                const parsedAmt = evalAmountExpr(amount) ?? Number(amount);
                const amt = amount && customRatioSum > 0
                  ? Math.floor((ratio / customRatioSum) * parsedAmt)
                  : 0;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 15 }}>{p.name}</span>
                    <Input
                      type="number"
                      value={customRatios[p.id] ?? "0"}
                      onChange={(e) =>
                        setCustomRatios((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      min={0}
                      max={100}
                      style={{
                        width: 58,
                        padding: "5px 8px",
                        background: "var(--bg-main)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        fontSize: 13,
                        color: "var(--text-main)",
                        textAlign: "right",
                      }}
                    />
                    <span style={{ fontSize: 13, color: "var(--text-sub)", width: 14 }}>%</span>
                    {amt > 0 && (
                      <span style={{ fontSize: 12, color: "var(--text-sub)", width: 64, textAlign: "right" }}>
                        {fmtNT(amt)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Field>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Button onClick={onClose} style={ghostBtnSt}>取消</Button>
          <Button
            onClick={onSave}
            disabled={
              saving ||
              !title.trim() ||
              !amount ||
              paidById === "" ||
              (splitMode === "custom" && customRatioSum !== 100)
            }
            style={{ ...accentBtnSt, flex: 1 }}
          >
            {saving ? <><span className="spinner" />處理中...</> : isEditing ? "儲存變更" : "新增費用"}
          </Button>
        </div>
      </div>
    </div>
  );
}
