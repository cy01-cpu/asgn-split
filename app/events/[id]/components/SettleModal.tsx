// 結清／重啟釐算確認 Modal（限管理員觸發）
// 從 app/events/[id]/page.tsx 抽出。

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function SettleModal({
  action,
  saving,
  onClose,
  onConfirm,
}: {
  action: "settle" | "unsettle";
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
            {action === "settle" ? "確認帳目兩訖？" : "確認重啟釐算？"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#8c7e72] hover:text-[#5c5248] hover:bg-[#e8e0d5] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 15, color: "var(--text-sub)", lineHeight: 1.65, margin: "0 0 24px" }}>
          {action === "settle"
            ? "標記後活動將移至「已結清」區塊，仍可隨時解除。"
            : "解除後活動將回到進行中，可繼續編輯費用與成員。"}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            onClick={onClose}
            style={{ flex: 1, padding: "12px 0", background: "var(--bg-card)", color: "var(--text-main)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 16, fontWeight: 600 }}
          >
            取消
          </Button>
          <Button
            onClick={onConfirm}
            disabled={saving}
            style={{
              flex: 1, padding: "12px 0", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600,
              background: action === "settle" ? "var(--morandi-green)" : "var(--morandi-purple)",
              color: "white",
            }}
          >
            {saving ? "處理中..." : action === "settle" ? "帳目兩訖" : "重啟釐算"}
          </Button>
        </div>
      </div>
    </div>
  );
}
