// 新增／編輯還款紀錄 Modal
// 從 app/events/[id]/page.tsx 抽出。

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
import type { Participant } from "../types";
import { Field } from "./presentational";
import { inputSt, ghostBtnSt, accentBtnSt } from "../styles";

const KNOWN_METHODS = ["💚 Line Pay", "🏦 銀行轉帳", "💵 現金"];

export function RepaymentModal({
  participants,
  isEditing,
  fromId,
  setFromId,
  toId,
  setToId,
  amount,
  setAmount,
  payMethod,
  setPayMethod,
  note,
  setNote,
  saving,
  onClose,
  onSave,
}: {
  participants: Participant[];
  isEditing: boolean;
  fromId: number | "";
  setFromId: Dispatch<SetStateAction<number | "">>;
  toId: number | "";
  setToId: Dispatch<SetStateAction<number | "">>;
  amount: string;
  setAmount: Dispatch<SetStateAction<string>>;
  payMethod: string;
  setPayMethod: Dispatch<SetStateAction<string>>;
  note: string;
  setNote: Dispatch<SetStateAction<string>>;
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
          maxHeight: "85dvh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
            {isEditing ? "編輯還款紀錄" : "新增還款紀錄"}
          </h2>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="rounded-full p-1.5 text-[#8c7e72] hover:text-[#5c5248] hover:bg-[#e8e0d5] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <Field label="誰還款">
          <Select
            value={String(fromId)}
            onValueChange={(v) => setFromId(Number(v))}
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

        <Field label="還給誰">
          <Select
            value={String(toId)}
            onValueChange={(v) => setToId(Number(v))}
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
                <SelectItem key={p.id} value={String(p.id)} disabled={p.id === fromId}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="金額（元）">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="0"
            min={1}
            style={inputSt}
            autoFocus
          />
        </Field>

        <Field label="付款方式">
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {KNOWN_METHODS.map((method) => (
              <button
                key={method}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = payMethod === method ? "" : method;
                  setPayMethod(next);
                  setNote(next);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: payMethod === method ? "var(--morandi-purple, #b39dac)" : "var(--bg-card)",
                  color: payMethod === method ? "white" : "var(--text-sub)",
                  transition: "all 0.15s",
                }}
              >
                {method}
              </button>
            ))}
          </div>
        </Field>

        <Field label="備註（選填）">
          <Input
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (!KNOWN_METHODS.includes(e.target.value)) setPayMethod("");
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="例：Line Pay 轉帳"
            style={inputSt}
          />
        </Field>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Button onClick={onClose} style={ghostBtnSt}>取消</Button>
          <Button
            onClick={onSave}
            disabled={saving || fromId === "" || toId === "" || !amount || fromId === toId}
            style={{ ...accentBtnSt, flex: 1 }}
          >
            {saving ? <><span className="spinner" />處理中...</> : isEditing ? "儲存變更" : "新增紀錄"}
          </Button>
        </div>
      </div>
    </div>
  );
}
