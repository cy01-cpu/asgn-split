// 費用分頁：新增費用按鈕 + 費用清單（含展開明細）
// 從 app/events/[id]/page.tsx 抽出。

import { Button } from "@/components/ui/button";
import type { EventDetail, Expense } from "../types";
import { fmtNT } from "../format";
import { EmptyState } from "./presentational";
import { rowCard, accentBtnSt, deleteIconBtn } from "../styles";

export function ExpensesTab({
  event,
  isAdmin,
  expandedExpIds,
  deletingExpId,
  openExpModal,
  openExpEditModal,
  deleteExpense,
  toggleExpand,
}: {
  event: EventDetail;
  isAdmin: boolean;
  expandedExpIds: Set<number>;
  deletingExpId: number | null;
  openExpModal: () => void;
  openExpEditModal: (exp: Expense) => void;
  deleteExpense: (expId: number) => void;
  toggleExpand: (expId: number) => void;
}) {
  return (
    <div>
      {!(event.isSettled && !isAdmin) && (
        <>
          <Button
            onClick={openExpModal}
            disabled={event.participants.length === 0}
            style={{
              ...accentBtnSt,
              width: "100%",
              marginBottom: 16,
              padding: "14px 0",
            }}
          >
            ＋ 新增費用
          </Button>
          {event.participants.length === 0 && (
            <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-sub)", marginBottom: 12 }}>
              請先至「成員」頁籤新增參與者
            </p>
          )}
        </>
      )}

      {event.expenses.length === 0 ? (
        <EmptyState icon="🧾" text="還沒有費用記錄" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {event.expenses.map((exp) => {
            const isExpanded = expandedExpIds.has(exp.id);
            return (
              <div
                key={exp.id}
                style={{ ...rowCard, flexDirection: "column", alignItems: "stretch", cursor: "pointer" }}
                onClick={() => toggleExpand(exp.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{exp.title}</span>
                      <span style={{ fontSize: 11, color: "var(--text-sub)", marginLeft: 2, transition: "transform 0.2s", display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                      {fmtNT(exp.amount)}
                    </div>
                  </div>
                  {!(event.isSettled && !isAdmin) && (
                    <div style={{ display: "flex", gap: 2 }}>
                      <Button
                        onClick={(e) => { e.stopPropagation(); openExpEditModal(exp); }}
                        disabled={deletingExpId === exp.id}
                        style={deleteIconBtn}
                        title="編輯費用"
                      >
                        ✏️
                      </Button>
                      <Button
                        onClick={(e) => { e.stopPropagation(); deleteExpense(exp.id); }}
                        disabled={deletingExpId === exp.id}
                        style={{ ...deleteIconBtn, minWidth: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="刪除費用"
                      >
                        {deletingExpId === exp.id ? <span className="spinner-sm" /> : "🗑️"}
                      </Button>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 13, color: "var(--text-sub)", marginTop: 10 }}>
                  <span>💳 {exp.paidBy.name} 付款</span>
                  <span>👥 {exp.shares.length} 人分攤</span>
                </div>
                {/* 展開明細 */}
                <div style={{
                  overflow: "hidden",
                  maxHeight: isExpanded ? "400px" : "0",
                  opacity: isExpanded ? 1 : 0,
                  transition: "max-height 0.25s ease, opacity 0.2s",
                }}>
                  <div style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    background: "var(--bg-main)",
                    borderRadius: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px 16px",
                  }}>
                    {exp.shares.map((s) => {
                      const p = event.participants.find((pt) => pt.id === s.participantId);
                      return (
                        <span key={s.participantId} style={{ fontSize: 13, color: "var(--text-sub)" }}>
                          {p?.emoji}{p?.name} {fmtNT(s.amount)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
