// 刪除確認 Modal（成員／費用／還款共用）
// 從 app/events/[id]/page.tsx 抽出。疊在其他 Modal 之上，故 zIndex 50。

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { DeleteTarget } from "../types";

export function DeleteConfirmModal({
  target,
  onClose,
  onConfirm,
}: {
  target: DeleteTarget;
  onClose: () => void;
  onConfirm: (target: DeleteTarget) => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(92,82,72,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "0 16px" }}
    >
      <div
        style={{ background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 20px", width: "100%", maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
            {target.type === "member" ? "刪除成員？" : target.type === "expense" ? "刪除費用？" : "刪除還款紀錄？"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#8c7e72] hover:text-[#5c5248] hover:bg-[#e8e0d5] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 15, color: "var(--text-sub)", lineHeight: 1.65, margin: "0 0 24px" }}>
          {target.type === "member"
            ? `確定要刪除「${target.label}」嗎？若有相關費用記錄將無法刪除。`
            : target.type === "expense"
            ? `確定要刪除費用「${target.label}」嗎？此操作無法復原。`
            : `確定要刪除「${target.label}」的還款紀錄嗎？`}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            onClick={onClose}
            style={{ flex: 1, padding: "12px 0", background: "var(--bg-card)", color: "var(--text-main)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 16, fontWeight: 600 }}
          >
            取消
          </Button>
          <Button
            onClick={() => onConfirm(target)}
            style={{ flex: 1, padding: "12px 0", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, background: "var(--morandi-red)", color: "white" }}
          >
            確定刪除
          </Button>
        </div>
      </div>
    </div>
  );
}
