// 成員分頁：新增成員面板 + 成員清單（含 inline 編輯）
// 從 app/events/[id]/page.tsx 抽出。

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EventDetail, Participant } from "../types";
import { EMOJI_LIST } from "../constants";
import { EmptyState } from "./presentational";
import { inputSt, accentBtnSt, ghostBtnSt, rowCard, deleteIconBtn } from "../styles";

export function MembersTab({
  event,
  isAdmin,
  selectedEmoji,
  setSelectedEmoji,
  newName,
  setNewName,
  dupNameError,
  setDupNameError,
  addingMember,
  addMember,
  editingId,
  setEditingId,
  editEmoji,
  setEditEmoji,
  editName,
  setEditName,
  savingEdit,
  updateMember,
  startEdit,
  deleteMember,
  deletingMemberId,
}: {
  event: EventDetail;
  isAdmin: boolean;
  selectedEmoji: string;
  setSelectedEmoji: Dispatch<SetStateAction<string>>;
  newName: string;
  setNewName: Dispatch<SetStateAction<string>>;
  dupNameError: string;
  setDupNameError: Dispatch<SetStateAction<string>>;
  addingMember: boolean;
  addMember: () => void;
  editingId: number | null;
  setEditingId: Dispatch<SetStateAction<number | null>>;
  editEmoji: string;
  setEditEmoji: Dispatch<SetStateAction<string>>;
  editName: string;
  setEditName: Dispatch<SetStateAction<string>>;
  savingEdit: boolean;
  updateMember: () => void;
  startEdit: (p: Participant) => void;
  deleteMember: (pid: number) => void;
  deletingMemberId: number | null;
}) {
  return (
    <div>
      {/* Add member panel */}
      {!(event.isSettled && !isAdmin) && <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "14px 14px 12px",
        marginBottom: 20,
      }}>
        <p style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 600, margin: "0 0 10px" }}>選擇頭像</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 12 }}>
          {EMOJI_LIST.map((e) => (
            <button
              key={e}
              onClick={() => setSelectedEmoji(e)}
              style={{
                width: "100%", height: 44,
                fontSize: 22,
                borderRadius: 8,
                border: selectedEmoji === e ? "2px solid var(--accent)" : "2px solid transparent",
                background: selectedEmoji === e ? "var(--bg-main)" : "transparent",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.12s",
                boxShadow: selectedEmoji === e ? "0 0 0 1px var(--accent)" : "none",
              }}
            >
              {e}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Input
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setDupNameError(""); }}
            onKeyDown={(e) => e.key === "Enter" && addMember()}
            placeholder="輸入成員名稱"
            style={{ ...inputSt, flex: 1, borderColor: dupNameError ? "var(--morandi-red)" : undefined }}
          />
          <Button
            onClick={addMember}
            disabled={addingMember || !newName.trim() || !selectedEmoji}
            style={accentBtnSt}
          >
            {addingMember ? <><span className="spinner" />處理中...</> : "新增"}
          </Button>
        </div>
        {dupNameError && (
          <p style={{ fontSize: 12, color: "var(--morandi-red)", margin: "6px 0 0" }}>
            {dupNameError}
          </p>
        )}
      </div>}

      {event.participants.length === 0 ? (
        <EmptyState icon="👤" text="還沒有成員，先新增幾位吧！" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {event.participants.map((p) =>
            editingId === p.id ? (
              /* ── Inline edit mode ── */
              <div key={p.id} style={{ ...rowCard, flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                <p style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 600, margin: 0 }}>更換頭像</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                  {EMOJI_LIST.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEditEmoji(e)}
                      style={{
                        width: "100%", height: 44,
                        fontSize: 22,
                        borderRadius: 8,
                        border: editEmoji === e ? "2px solid var(--accent)" : "2px solid transparent",
                        background: editEmoji === e ? "var(--bg-main)" : "transparent",
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.12s",
                        boxShadow: editEmoji === e ? "0 0 0 1px var(--accent)" : "none",
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && updateMember()}
                  autoFocus
                  style={inputSt}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    onClick={() => setEditingId(null)}
                    style={{ ...ghostBtnSt, flex: 1 }}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={updateMember}
                    disabled={savingEdit || !editName.trim()}
                    style={{ ...accentBtnSt, flex: 2 }}
                  >
                    {savingEdit ? <><span className="spinner" />儲存中...</> : "確認"}
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Normal card ── */
              <div key={p.id} style={rowCard}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{p.emoji} {p.name}</span>
                {!(event.isSettled && !isAdmin) && (
                  <div style={{ display: "flex", gap: 2 }}>
                    <Button
                      onClick={() => startEdit(p)}
                      disabled={deletingMemberId === p.id}
                      style={{ ...deleteIconBtn, fontSize: 15 }}
                      title="編輯成員"
                    >
                      ✏️
                    </Button>
                    <Button
                      onClick={() => deleteMember(p.id)}
                      disabled={deletingMemberId === p.id}
                      style={{ ...deleteIconBtn, fontSize: 15, minWidth: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="刪除成員"
                    >
                      {deletingMemberId === p.id ? <span className="spinner-sm" /> : "🗑️"}
                    </Button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
