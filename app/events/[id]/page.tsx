"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";
import { buildEqualShares, buildCustomShares } from "@/lib/shares";
import { evalAmountExpr } from "@/lib/amount";
import type { Participant, Expense, Repayment, Tab, SplitMode } from "./types";
import { useEventData } from "./useEventData";
import { fmtDateRange, fmtNT } from "./format";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { ExpenseModal } from "./components/ExpenseModal";
import { RepaymentModal } from "./components/RepaymentModal";
import { SettleModal } from "./components/SettleModal";
import { MembersTab } from "./components/MembersTab";
import { ExpensesTab } from "./components/ExpensesTab";
import { SettlementTab } from "./components/SettlementTab";
import { EMOJI_LIST } from "./constants";

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams();
  const eventId = Number(params.id);

  const [tab, setTab] = useState<Tab>("members");

  const {
    event,
    loading,
    settlement,
    settlementLoading,
    repayments,
    isAdmin,
    sseStatus,
    fetchEvent,
    fetchSettlement,
    fetchRepayments,
  } = useEventData(eventId, tab);

  // Members state
  const [newName, setNewName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [dupNameError, setDupNameError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState(EMOJI_LIST[0]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);
  const [deletingExpId, setDeletingExpId] = useState<number | null>(null);
  const [expandedExpIds, setExpandedExpIds] = useState<Set<number>>(new Set());

  // Expense modal state
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExpId, setEditingExpId] = useState<number | null>(null);
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPaidById, setExpPaidById] = useState<number | "">("");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [equalSelected, setEqualSelected] = useState<Set<number>>(new Set());
  const [customRatios, setCustomRatios] = useState<Record<number, string>>({});
  const [savingExp, setSavingExp] = useState(false);

  // Settlement UI state
  const [copied, setCopied] = useState(false);

  // Repayment state
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [editingRepayId, setEditingRepayId] = useState<number | null>(null);
  const [repayFromId, setRepayFromId] = useState<number | "">("");
  const [repayToId, setRepayToId] = useState<number | "">("");
  const [repayAmount, setRepayAmount] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [repayPayMethod, setRepayPayMethod] = useState("");
  const [savingRepay, setSavingRepay] = useState(false);
  const [deletingRepayId, setDeletingRepayId] = useState<number | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ type: "member" | "expense" | "repayment"; id: number; label: string } | null>(null);

  // Error state
  const [opError, setOpError] = useState("");

  // Settle modal state
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAction, setSettleAction] = useState<"settle" | "unsettle">("settle");
  const [savingSettle, setSavingSettle] = useState(false);

  // ── Esc 關閉 Modal ────────────────────────────────────────────────────────────
  // 按下 Esc 關閉最上層開啟的 Modal（刪除確認疊在其他 Modal 之上，故優先處理）。
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (deleteTarget) setDeleteTarget(null);
      else if (showSettleModal) setShowSettleModal(false);
      else if (showExpModal) setShowExpModal(false);
      else if (showRepayModal) setShowRepayModal(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget, showSettleModal, showExpModal, showRepayModal]);

  // ── Members ───────────────────────────────────────────────────────────────────

  async function addMember() {
    if (!newName.trim()) return;
    const trimmed = newName.trim();
    const isDup = event?.participants.some((p) => p.name.trim() === trimmed) ?? false;
    if (isDup) {
      setDupNameError(`「${trimmed}」已存在，請使用其他名稱`);
      return;
    }
    setDupNameError("");
    setAddingMember(true);
    await fetch(`/api/events/${eventId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, emoji: selectedEmoji }),
    });
    setNewName("");
    setSelectedEmoji("");
    setAddingMember(false);
    fetchEvent();
  }

  async function updateMember() {
    if (!editName.trim() || editingId === null) return;
    setSavingEdit(true);
    await fetch(`/api/events/${eventId}/participants`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, name: editName.trim(), emoji: editEmoji }),
    });
    setSavingEdit(false);
    setEditingId(null);
    fetchEvent();
  }

  function startEdit(p: Participant) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditEmoji(p.emoji);
  }

  async function deleteMember(pid: number) {
    const p = event?.participants.find((x) => x.id === pid);
    setDeleteTarget({ type: "member", id: pid, label: p?.name ?? "此成員" });
  }

  async function doDeleteMember(pid: number) {
    setDeletingMemberId(pid);
    const res = await fetch(`/api/events/${eventId}/participants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pid }),
    });
    setDeletingMemberId(null);
    if (!res.ok) {
      setOpError("❌ 無法刪除：此成員有相關費用記錄，請先刪除費用後再試。");
      return;
    }
    fetchEvent();
  }

  // ── Expenses ─────────────────────────────────────────────────────────────────

  function openExpModal() {
    if (!event) return;
    const ids = event.participants.map((p) => p.id);
    setEditingExpId(null);
    setEqualSelected(new Set(ids));
    const n = ids.length;
    if (n > 0) {
      const base = Math.floor(100 / n);
      const rem = 100 - base * n;
      setCustomRatios(
        Object.fromEntries(ids.map((id, i) => [id, String(i === 0 ? base + rem : base)]))
      );
    } else {
      setCustomRatios({});
    }
    setExpTitle("");
    setExpAmount("");
    setExpPaidById(ids[0] ?? "");
    setSplitMode("equal");
    setShowExpModal(true);
  }

  function openExpEditModal(exp: Expense) {
    if (!event) return;
    const allIds = event.participants.map((p) => p.id);
    setEditingExpId(exp.id);
    setExpTitle(exp.title);
    setExpAmount(String(exp.amount));
    setExpPaidById(exp.paidById);

    const shareIds = exp.shares.map((s) => s.participantId);
    const isEqual =
      exp.shares.length > 0 &&
      exp.shares.every((s) => Math.abs(s.shareRatio - exp.shares[0].shareRatio) < 0.01);

    if (isEqual) {
      setSplitMode("equal");
      setEqualSelected(new Set(shareIds));
      const n = allIds.length;
      if (n > 0) {
        const base = Math.floor(100 / n);
        const rem = 100 - base * n;
        setCustomRatios(Object.fromEntries(allIds.map((id, i) => [id, String(i === 0 ? base + rem : base)])));
      }
    } else {
      setSplitMode("custom");
      setEqualSelected(new Set(shareIds));
      const ratioMap: Record<number, string> = {};
      for (const id of allIds) {
        const share = exp.shares.find((s) => s.participantId === id);
        ratioMap[id] = share ? String(Math.round(share.shareRatio * 100)) : "0";
      }
      setCustomRatios(ratioMap);
    }
    setShowExpModal(true);
  }

  async function saveExpense() {
    if (!expTitle.trim() || !expAmount || expPaidById === "") return;
    const total = evalAmountExpr(expAmount) ?? Number(expAmount);
    if (!event) return;

    // lib/shares.ts 回傳 { memberId, amount }；後端額外要求 shareRatio，
    // 故在此補回（平均 = 1/人數；自訂 = 比例/有效比例總和）並改名 participantId。
    let shares: { participantId: number; shareRatio: number; amount: number }[];
    if (splitMode === "equal") {
      const ids = [...equalSelected];
      shares = buildEqualShares(total, ids).map((s) => ({
        participantId: s.memberId,
        shareRatio: 1 / ids.length,
        amount: s.amount,
      }));
    } else {
      const ratios = event.participants.map((p) => ({
        memberId: p.id,
        ratio: Number(customRatios[p.id] ?? 0),
      }));
      const totalRatio = ratios.reduce((sum, r) => sum + (r.ratio > 0 ? r.ratio : 0), 0);
      shares = buildCustomShares(total, ratios).map((s) => ({
        participantId: s.memberId,
        shareRatio: totalRatio > 0 ? ratios.find((r) => r.memberId === s.memberId)!.ratio / totalRatio : 0,
        amount: s.amount,
      }));
    }

    if (shares.length === 0) {
      setOpError("❌ 請選擇至少一位分攤成員");
      return;
    }

    setSavingExp(true);
    let res: Response;
    if (editingExpId !== null) {
      res = await fetch(`/api/events/${eventId}/expenses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingExpId, paidById: expPaidById, title: expTitle.trim(), amount: total, shares }),
      });
    } else {
      res = await fetch(`/api/events/${eventId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidById: expPaidById, title: expTitle.trim(), amount: total, shares }),
      });
    }
    setSavingExp(false);
    if (!res.ok) {
      setOpError("❌ 儲存費用失敗，請再試一次。");
      return;
    }
    setShowExpModal(false);
    setEditingExpId(null);
    fetchEvent();
    if (tab === "settlement") fetchSettlement();
  }

  function deleteExpense(expId: number) {
    const exp = event?.expenses.find((x) => x.id === expId);
    setDeleteTarget({ type: "expense", id: expId, label: exp?.title ?? "此費用" });
  }

  async function doDeleteExpense(expId: number) {
    setDeletingExpId(expId);
    await fetch(`/api/events/${eventId}/expenses`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: expId }),
    });
    setDeletingExpId(null);
    fetchEvent();
  }

  function toggleExpand(expId: number) {
    setExpandedExpIds((prev) => {
      const next = new Set(prev);
      if (next.has(expId)) next.delete(expId);
      else next.add(expId);
      return next;
    });
  }

  // ── Settle ───────────────────────────────────────────────────────────────────

  async function confirmSettle() {
    if (!event) return;
    setSavingSettle(true);
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSettled: settleAction === "settle" }),
    });
    setSavingSettle(false);
    setShowSettleModal(false);
    fetchEvent();
  }

  // ── Repayments ────────────────────────────────────────────────────────────────

  function openRepayModal(r?: Repayment) {
    if (!event) return;
    if (r) {
      setEditingRepayId(r.id);
      setRepayFromId(r.fromId);
      setRepayToId(r.toId);
      setRepayAmount(String(r.amount));
      setRepayNote(r.note ?? "");
      const knownMethods = ["💚 Line Pay", "🏦 銀行轉帳", "💵 現金"];
      setRepayPayMethod(knownMethods.includes(r.note ?? "") ? r.note! : "");
    } else {
      setEditingRepayId(null);
      setRepayFromId(event.participants[0]?.id ?? "");
      setRepayToId(event.participants[1]?.id ?? "");
      setRepayAmount("");
      setRepayNote("");
      setRepayPayMethod("");
    }
    setShowRepayModal(true);
  }

  async function addRepayment() {
    if (repayFromId === "" || repayToId === "" || !repayAmount || repayFromId === repayToId) return;
    setSavingRepay(true);
    let res: Response;
    if (editingRepayId !== null) {
      res = await fetch(`/api/events/${eventId}/repayments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingRepayId, fromId: repayFromId, toId: repayToId, amount: Number(repayAmount), note: repayNote }),
      });
    } else {
      res = await fetch(`/api/events/${eventId}/repayments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: repayFromId, toId: repayToId, amount: Number(repayAmount), note: repayNote }),
      });
    }
    setSavingRepay(false);
    if (!res.ok) {
      setOpError("❌ 儲存還款紀錄失敗，請再試一次。");
      return;
    }
    setShowRepayModal(false);
    fetchSettlement();
    fetchRepayments();
  }

  function deleteRepayment(rid: number) {
    const r = repayments.find((x) => x.id === rid);
    setDeleteTarget({ type: "repayment", id: rid, label: r ? `${r.fromParticipant.name} → ${r.toParticipant.name}` : "此還款紀錄" });
  }

  async function doDeleteRepayment(rid: number) {
    setDeletingRepayId(rid);
    await fetch(`/api/events/${eventId}/repayments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rid }),
    });
    setDeletingRepayId(null);
    fetchSettlement();
    fetchRepayments();
  }

  // ── Settlement ────────────────────────────────────────────────────────────────

  async function copySettlement() {
    if (!settlement || !event) return;
    const total = event.expenses.reduce((s, e) => s + e.amount, 0);
    const avg = event.participants.length > 0 ? Math.round(total / event.participants.length) : 0;

    const lines: string[] = [];
    lines.push(`【${event.name}】結算報告`);
    lines.push(`📅 ${fmtDateRange(event.startDate, event.endDate)}`);
    lines.push(`👥 ${event.participants.length}人　💰 總花費 NT$${total.toLocaleString()}　👤 人均 NT$${avg.toLocaleString()}`);
    lines.push("");
    lines.push("💸 轉帳清單");
    if (settlement.settlements.length === 0) {
      lines.push("✅ 已結清，無需轉帳！");
    } else {
      settlement.settlements.forEach((s) => {
        lines.push(`${s.from.name} → ${s.to.name}：NT$${s.amount.toLocaleString()}`);
      });
    }
    lines.push("");
    lines.push("📋 費用明細");
    event.expenses.forEach((exp) => {
      lines.push(`- ${exp.title}：NT$${exp.amount.toLocaleString()}（${exp.paidBy.name}付）`);
    });
    lines.push("");
    lines.push(`✅ 以上由「結伴釐算」自動計算產生`);

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Computed ──────────────────────────────────────────────────────────────────

  const customRatioSum = event
    ? event.participants.reduce((s, p) => s + Number(customRatios[p.id] ?? 0), 0)
    : 0;

  const equalPerPerson =
    equalSelected.size > 0 && expAmount
      ? Math.floor((evalAmountExpr(expAmount) ?? Number(expAmount)) / equalSelected.size)
      : 0;

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-sub)" }}>載入中...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-sub)" }}>找不到此活動</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-main)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 80 }}>

        {/* ── Header ── */}
        <div style={{
          padding: "18px 16px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid var(--separator)",
          background: "var(--bg-main)",
        }}>
          <Link href="/events" style={{ color: "var(--text-sub)", textDecoration: "none", fontSize: 24, lineHeight: 1 }}>
            ←
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {event.name}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-sub)", margin: "2px 0 0" }}>
              📅 {fmtDateRange(event.startDate, event.endDate)} · {event.participants.length} 位成員
            </p>
            {(() => {
              const total = event.expenses.reduce((s, e) => s + e.amount, 0);
              const avg = event.participants.length > 0 ? Math.round(total / event.participants.length) : 0;
              return (
                <p style={{ fontSize: 12, color: "var(--text-sub)", margin: "2px 0 0", opacity: 0.85 }}>
                  💰 總花費 {fmtNT(total)}　👤 人均 {fmtNT(avg)}　📋 {event.expenses.length} 筆費用
                </p>
              );
            })()}
          </div>
          <ThemeSwitcher />
          <div
            title={sseStatus === "connected" ? "即時同步中" : "重新連線中"}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              background: sseStatus === "connected" ? "var(--morandi-green)" : "var(--separator)",
              transition: "background 0.4s",
            }}
          />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", background: "var(--bg-card)", borderBottom: "1px solid var(--separator)" }}>
          {(["members", "expenses", "settlement"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "13px 0",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 600,
                background: tab === t ? "var(--bg-main)" : "var(--bg-card)",
                color: tab === t ? "var(--accent)" : "var(--text-sub)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              {t === "members" ? "👥 成員" : t === "expenses" ? "💳 費用" : "🧾 結算"}
            </button>
          ))}
        </div>

        {/* ── Readonly Banner ── */}
        {event.isSettled && !isAdmin && (
          <div style={{
            background: "rgba(122,158,135,0.12)",
            color: "var(--morandi-green)",
            fontSize: 14,
            fontWeight: 600,
            padding: "10px 16px",
            textAlign: "center",
            borderBottom: "1px solid rgba(122,158,135,0.3)",
          }}>
            🔒 此活動已圓滿平帳，僅供檢視
          </div>
        )}

        {/* ── Tab Content ── */}
        <div style={{ padding: 16 }}>

          {/* ────────────── Members Tab ────────────── */}
          {tab === "members" && (
            <MembersTab
              event={event}
              isAdmin={isAdmin}
              selectedEmoji={selectedEmoji}
              setSelectedEmoji={setSelectedEmoji}
              newName={newName}
              setNewName={setNewName}
              dupNameError={dupNameError}
              setDupNameError={setDupNameError}
              addingMember={addingMember}
              addMember={addMember}
              editingId={editingId}
              setEditingId={setEditingId}
              editEmoji={editEmoji}
              setEditEmoji={setEditEmoji}
              editName={editName}
              setEditName={setEditName}
              savingEdit={savingEdit}
              updateMember={updateMember}
              startEdit={startEdit}
              deleteMember={deleteMember}
              deletingMemberId={deletingMemberId}
            />
          )}

          {/* ────────────── Expenses Tab ────────────── */}
          {tab === "expenses" && (
            <ExpensesTab
              event={event}
              isAdmin={isAdmin}
              expandedExpIds={expandedExpIds}
              deletingExpId={deletingExpId}
              openExpModal={openExpModal}
              openExpEditModal={openExpEditModal}
              deleteExpense={deleteExpense}
              toggleExpand={toggleExpand}
            />
          )}

          {/* ────────────── Settlement Tab ────────────── */}
          {tab === "settlement" && (
            <SettlementTab
              event={event}
              isAdmin={isAdmin}
              settlementLoading={settlementLoading}
              settlement={settlement}
              repayments={repayments}
              deletingRepayId={deletingRepayId}
              copied={copied}
              openRepayModal={openRepayModal}
              deleteRepayment={deleteRepayment}
              copySettlement={copySettlement}
              fetchSettlement={fetchSettlement}
              setSettleAction={setSettleAction}
              setShowSettleModal={setShowSettleModal}
            />
          )}
        </div>
      </div>

      {/* ────────────── Error Banner ────────────── */}
      {opError && (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--morandi-red)",
            color: "white",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            zIndex: 100,
            maxWidth: 360,
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            cursor: "pointer",
          }}
          onClick={() => setOpError("")}
        >
          {opError}
        </div>
      )}

      {/* ────────────── Delete Confirm Modal ────────────── */}
      {deleteTarget && (
        <DeleteConfirmModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(t) => {
            setDeleteTarget(null);
            if (t.type === "member") doDeleteMember(t.id);
            else if (t.type === "expense") doDeleteExpense(t.id);
            else doDeleteRepayment(t.id);
          }}
        />
      )}

      {/* ────────────── Expense Modal ────────────── */}
      {showExpModal && (
        <ExpenseModal
          participants={event.participants}
          isEditing={editingExpId !== null}
          title={expTitle}
          setTitle={setExpTitle}
          amount={expAmount}
          setAmount={setExpAmount}
          paidById={expPaidById}
          setPaidById={setExpPaidById}
          splitMode={splitMode}
          setSplitMode={setSplitMode}
          equalSelected={equalSelected}
          setEqualSelected={setEqualSelected}
          customRatios={customRatios}
          setCustomRatios={setCustomRatios}
          equalPerPerson={equalPerPerson}
          customRatioSum={customRatioSum}
          saving={savingExp}
          onClose={() => setShowExpModal(false)}
          onSave={saveExpense}
        />
      )}

      {/* ────────────── Repayment Modal ────────────── */}
      {showRepayModal && (
        <RepaymentModal
          participants={event.participants}
          isEditing={editingRepayId !== null}
          fromId={repayFromId}
          setFromId={setRepayFromId}
          toId={repayToId}
          setToId={setRepayToId}
          amount={repayAmount}
          setAmount={setRepayAmount}
          payMethod={repayPayMethod}
          setPayMethod={setRepayPayMethod}
          note={repayNote}
          setNote={setRepayNote}
          saving={savingRepay}
          onClose={() => setShowRepayModal(false)}
          onSave={addRepayment}
        />
      )}

      {/* ────────────── Settle Modal ────────────── */}
      {showSettleModal && (
        <SettleModal
          action={settleAction}
          saving={savingSettle}
          onClose={() => setShowSettleModal(false)}
          onConfirm={confirmSettle}
        />
      )}
    </div>
  );
}
