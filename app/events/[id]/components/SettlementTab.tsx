// 結算分頁：每人餘額 + 轉帳清單 + 還款紀錄 + 複製/重算/結清
// 從 app/events/[id]/page.tsx 抽出。

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import type { EventDetail, SettlementData, Repayment } from "../types";
import { fmtNT } from "../format";
import { SettlementLoadingView, SectionLabel } from "./presentational";
import { rowCard, deleteIconBtn } from "../styles";

export function SettlementTab({
  event,
  isAdmin,
  settlementLoading,
  settlement,
  repayments,
  deletingRepayId,
  copied,
  openRepayModal,
  deleteRepayment,
  copySettlement,
  fetchSettlement,
  setSettleAction,
  setShowSettleModal,
}: {
  event: EventDetail;
  isAdmin: boolean;
  settlementLoading: boolean;
  settlement: SettlementData | null;
  repayments: Repayment[];
  deletingRepayId: number | null;
  copied: boolean;
  openRepayModal: (r?: Repayment) => void;
  deleteRepayment: (rid: number) => void;
  copySettlement: () => void;
  fetchSettlement: () => void;
  setSettleAction: Dispatch<SetStateAction<"settle" | "unsettle">>;
  setShowSettleModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div>
      {settlementLoading ? (
        <SettlementLoadingView />
      ) : settlement ? (
        <>
          {/* Balances */}
          <SectionLabel text="每人餘額" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {settlement.balances.map((b) => (
              <div key={b.participantId} style={rowCard}>
                <span style={{ fontSize: 16 }}>{b.name}</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: 18,
                    color: b.balance > 0
                      ? "var(--morandi-green)"
                      : b.balance < 0
                      ? "var(--morandi-red)"
                      : "var(--text-sub)",
                  }}>
                    {b.balance > 0 ? "+" : ""}{fmtNT(b.balance)}
                  </span>
                  {b.balance !== 0 && (
                    <div style={{ fontSize: 12, color: b.balance > 0 ? "var(--morandi-green)" : "var(--morandi-red)", marginTop: 1 }}>
                      {b.balance > 0 ? "待收" : "未償"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Transfers */}
          <SectionLabel text="轉帳清單" />
          {settlement.settlements.length === 0 ? (
            <div style={{ marginBottom: 16 }}>
              <style>{`
                @keyframes confettiFall {
                  0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
                  100% { transform: translateY(300px) rotate(720deg); opacity: 0; }
                }
              `}</style>
              <div style={{ position: "relative", overflow: "hidden", height: 80, marginBottom: 4 }}>
                {[
                  { color: "#9b8ea0", size: 10, left: "10%", delay: "0s"   },
                  { color: "#7a9e87", size: 8,  left: "22%", delay: "0.3s" },
                  { color: "#b87c7c", size: 12, left: "37%", delay: "0.1s" },
                  { color: "#d4c9bc", size: 7,  left: "52%", delay: "0.5s" },
                  { color: "#9b8ea0", size: 9,  left: "65%", delay: "0.2s" },
                  { color: "#7a9e87", size: 11, left: "78%", delay: "0.4s" },
                  { color: "#b87c7c", size: 8,  left: "90%", delay: "0.6s" },
                ].map((c, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    left: c.left,
                    top: 0,
                    width: c.size,
                    height: c.size,
                    borderRadius: 2,
                    background: c.color,
                    animation: `confettiFall 1.8s ${c.delay} ease-in forwards`,
                  }} />
                ))}
              </div>
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "16px",
                textAlign: "center",
                color: "var(--morandi-green)",
                fontWeight: 700,
                fontSize: 22,
              }}>
                🎉 結算完成！
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {settlement.settlements.map((s, i) => (
                <div key={i} style={{ ...rowCard, gap: 8 }}>
                  <span style={{ fontSize: 15, flex: 1, minWidth: 0 }}>
                    💸 <strong>{s.from.name}</strong>
                    <span style={{ color: "var(--text-sub)" }}> 付給 </span>
                    <strong>{s.to.name}</strong>
                  </span>
                  <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 18, whiteSpace: "nowrap" }}>
                    {fmtNT(s.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Repayment records */}
          <SectionLabel text="還款紀錄" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {repayments.map((r) => (
              <div key={r.id} style={rowCard}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15 }}>
                    <strong>{r.fromParticipant.name}</strong>
                    <span style={{ color: "var(--text-sub)" }}> 還給 </span>
                    <strong>{r.toParticipant.name}</strong>
                  </span>
                  <div style={{ display: "flex", gap: 10, marginTop: 3, alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--morandi-green)" }}>{fmtNT(r.amount)}</span>
                    {r.note && <span style={{ fontSize: 13, color: "var(--text-sub)" }}>{r.note}</span>}
                  </div>
                </div>
                {!(event.isSettled && !isAdmin) && (
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <Button
                      onClick={() => openRepayModal(r)}
                      disabled={deletingRepayId === r.id}
                      style={deleteIconBtn}
                      title="編輯還款紀錄"
                    >
                      ✏️
                    </Button>
                    <Button
                      onClick={() => deleteRepayment(r.id)}
                      disabled={deletingRepayId === r.id}
                      style={{ ...deleteIconBtn, minWidth: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="刪除還款紀錄"
                    >
                      {deletingRepayId === r.id ? <span className="spinner-sm" /> : "🗑️"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {repayments.length === 0 && (
              <div style={{ textAlign: "center", padding: "12px 0", fontSize: 14, color: "var(--text-sub)" }}>
                尚無還款紀錄
              </div>
            )}
            {!(event.isSettled && !isAdmin) && (
              <button
                onClick={() => openRepayModal()}
                disabled={!event || event.participants.length < 2}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "1px dashed var(--border)",
                  background: "transparent",
                  color: "var(--text-sub)",
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                ＋ 新增還款紀錄
              </button>
            )}
          </div>

          {/* Copy + Refresh */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Button
              onClick={copySettlement}
              disabled={copied}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                background: copied ? "var(--morandi-green)" : "var(--accent)",
                color: "white",
                fontSize: 16,
                fontWeight: 600,
                transition: "background 0.2s",
              }}
            >
              {copied ? "✅ 已複製！" : "📋 複製結算結果"}
            </Button>
            <Button
              onClick={fetchSettlement}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-sub)",
                fontSize: 15,
              }}
            >
              🔄 重新計算
            </Button>
            {isAdmin && event && (
              <Button
                onClick={() => {
                  setSettleAction(event.isSettled ? "unsettle" : "settle");
                  setShowSettleModal(true);
                }}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background: event.isSettled ? "var(--bg-card)" : "var(--accent)",
                  color: event.isSettled ? "var(--text-sub)" : "white",
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                {event.isSettled ? "🔓 重啟釐算" : "🔒 帳目兩訖"}
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
