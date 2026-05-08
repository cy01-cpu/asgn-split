"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type Participant = { id: number; name: string; emoji: string };

type ExpenseShare = {
  id: number;
  participantId: number;
  shareRatio: number;
  amount: number;
};

type Expense = {
  id: number;
  title: string;
  amount: number;
  paidBy: Participant;
  paidById: number;
  shares: ExpenseShare[];
};

type EventDetail = {
  id: number;
  name: string;
  startDate: string;
  endDate: string | null;
  isSettled: boolean;
  participants: Participant[];
  expenses: Expense[];
};

type Balance = {
  participantId: number;
  name: string;
  emoji: string;
  balance: number;
};

type Transfer = {
  from: { participantId: number; name: string; emoji: string };
  to: { participantId: number; name: string; emoji: string };
  amount: number;
};

type SettlementData = { settlements: Transfer[]; balances: Balance[] };

type Repayment = {
  id: number;
  fromId: number;
  toId: number;
  amount: number;
  note: string | null;
  createdAt: string;
  fromParticipant: Participant;
  toParticipant: Participant;
};

type Tab = "members" | "expenses" | "settlement";
type SplitMode = "equal" | "custom";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${y}/${m}/${d}`;
}

function fmtDateRange(startIso: string, endIso: string | null) {
  const [sy, sm, sd] = startIso.slice(0, 10).split("-");
  const start = `${sy}/${sm}/${sd}`;
  if (!endIso) return start;
  const [, em, ed] = endIso.slice(0, 10).split("-");
  const days = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86400000) + 1;
  return `${start} ~ ${em}/${ed}（${days}天）`;
}

function fmtNT(n: number) {
  return `NT$${Math.abs(n).toLocaleString()}`;
}

function buildEqualShares(
  ids: number[],
  total: number
): { participantId: number; shareRatio: number; amount: number }[] {
  const n = ids.length;
  if (n === 0) return [];
  const base = Math.floor(total / n);
  let distributed = 0;
  return ids.map((id, i) => {
    const amt = i === n - 1 ? total - distributed : base;
    distributed += amt;
    return { participantId: id, shareRatio: 1 / n, amount: amt };
  });
}

function evalAmountExpr(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (!/^[\d\s+\-*/().]+$/.test(trimmed)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${trimmed})`)();
    if (typeof result !== "number" || !isFinite(result) || result <= 0) return null;
    return Math.round(result);
  } catch {
    return null;
  }
}

function buildCustomShares(
  entries: { id: number; ratio: number }[],
  total: number
): { participantId: number; shareRatio: number; amount: number }[] {
  const active = entries.filter((e) => e.ratio > 0);
  const totalRatio = active.reduce((s, e) => s + e.ratio, 0);
  if (totalRatio === 0) return [];
  let distributed = 0;
  return active.map((e, i) => {
    const amt =
      i === active.length - 1
        ? total - distributed
        : Math.floor((e.ratio / totalRatio) * total);
    distributed += amt;
    return {
      participantId: e.id,
      shareRatio: e.ratio / totalRatio,
      amount: amt,
    };
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMOJI_LIST = ["🌸", "🎈", "🐳", "🦔", "🐢", "👼", "🌹", "🌞", "🎵", "🌙", "🐶", "🍀"];

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams();
  const eventId = Number(params.id);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("members");

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

  // Settlement state
  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Repayment state
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [editingRepayId, setEditingRepayId] = useState<number | null>(null);
  const [repayFromId, setRepayFromId] = useState<number | "">("");
  const [repayToId, setRepayToId] = useState<number | "">("");
  const [repayAmount, setRepayAmount] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [repayPayMethod, setRepayPayMethod] = useState("");
  const [savingRepay, setSavingRepay] = useState(false);
  const [deletingRepayId, setDeletingRepayId] = useState<number | null>(null);

  // SSE state
  const [sseStatus, setSseStatus] = useState<"connected" | "reconnecting">("reconnecting");

  // Admin + settle state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAction, setSettleAction] = useState<"settle" | "unsettle">("settle");
  const [savingSettle, setSavingSettle] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}`);
    if (!res.ok) { setLoading(false); return; }
    setEvent(await res.json());
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
    fetch("/api/admin/check").then(r => r.json()).then(d => setIsAdmin(d.isAdmin));
  }, [fetchEvent]);

  const fetchSettlement = useCallback(async () => {
    setSettlementLoading(true);
    const res = await fetch(`/api/events/${eventId}/settlement`);
    setSettlement(await res.json());
    setSettlementLoading(false);
  }, [eventId]);

  const fetchRepayments = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/repayments`);
    if (res.ok) setRepayments(await res.json());
  }, [eventId]);

  useEffect(() => {
    if (tab === "settlement") {
      fetchSettlement();
      fetchRepayments();
    }
  }, [tab, fetchSettlement, fetchRepayments]);

  // ── SSE ────────────────────────────────────────────────────────────────────────

  // Ref keeps latest callbacks without changing SSE effect deps
  const onSseUpdateRef = useRef(() => {
    fetchEvent();
    fetchSettlement();
    fetchRepayments();
  });
  useEffect(() => {
    onSseUpdateRef.current = () => {
      fetchEvent();
      fetchSettlement();
      fetchRepayments();
    };
  }, [fetchEvent, fetchSettlement, fetchRepayments]);

  useEffect(() => {
    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      es = new EventSource(`/api/events/${eventId}/stream`);

      es.onopen = () => {
        if (!cancelled) setSseStatus("connected");
      };

      es.onmessage = (e) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(e.data) as { type: string };
          if (data.type !== "heartbeat" && data.type !== "connected") {
            onSseUpdateRef.current();
          }
        } catch {}
      };

      es.onerror = () => {
        if (cancelled) return;
        setSseStatus("reconnecting");
        es.close();
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      cancelled = true;
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, [eventId]);

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
    if (!confirm("確定要刪除這位成員嗎？\n若有相關費用記錄將無法刪除。")) return;
    setDeletingMemberId(pid);
    const res = await fetch(`/api/events/${eventId}/participants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pid }),
    });
    setDeletingMemberId(null);
    if (!res.ok) {
      alert("❌ 無法刪除：此成員有相關費用記錄，請先刪除費用後再試。");
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

    let shares;
    if (splitMode === "equal") {
      shares = buildEqualShares([...equalSelected], total);
    } else {
      shares = buildCustomShares(
        event.participants.map((p) => ({
          id: p.id,
          ratio: Number(customRatios[p.id] ?? 0),
        })),
        total
      );
    }

    if (shares.length === 0) {
      alert("請選擇至少一位分攤成員");
      return;
    }

    setSavingExp(true);
    if (editingExpId !== null) {
      await fetch(`/api/events/${eventId}/expenses`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingExpId, paidById: expPaidById, title: expTitle.trim(), amount: total, shares }),
      });
    } else {
      await fetch(`/api/events/${eventId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidById: expPaidById, title: expTitle.trim(), amount: total, shares }),
      });
    }
    setSavingExp(false);
    setShowExpModal(false);
    setEditingExpId(null);
    fetchEvent();
    if (tab === "settlement") fetchSettlement();
  }

  async function deleteExpense(expId: number) {
    if (!confirm("確定要刪除這筆費用嗎？")) return;
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
    if (editingRepayId !== null) {
      await fetch(`/api/events/${eventId}/repayments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingRepayId, fromId: repayFromId, toId: repayToId, amount: Number(repayAmount), note: repayNote }),
      });
    } else {
      await fetch(`/api/events/${eventId}/repayments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: repayFromId, toId: repayToId, amount: Number(repayAmount), note: repayNote }),
      });
    }
    setSavingRepay(false);
    setShowRepayModal(false);
    fetchSettlement();
    fetchRepayments();
  }

  async function deleteRepayment(rid: number) {
    if (!confirm("確定要刪除這筆還款紀錄嗎？")) return;
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
    setTimeout(() => setCopied(false), 2500);
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

        {/* ── Tab Content ── */}
        <div style={{ padding: 16 }}>

          {/* ────────────── Members Tab ────────────── */}
          {tab === "members" && (
            <div>
              {/* Add member panel */}
              <div style={{
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
                  <input
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setDupNameError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && addMember()}
                    placeholder="輸入成員名稱"
                    style={{ ...inputSt, flex: 1, borderColor: dupNameError ? "var(--morandi-red)" : undefined }}
                  />
                  <button
                    onClick={addMember}
                    disabled={addingMember || !newName.trim() || !selectedEmoji}
                    style={{ ...accentBtnSt, opacity: addingMember || !newName.trim() || !selectedEmoji ? 0.5 : 1 }}
                  >
                    {addingMember ? <><span className="spinner" />處理中...</> : "新增"}
                  </button>
                </div>
                {dupNameError && (
                  <p style={{ fontSize: 12, color: "var(--morandi-red)", margin: "6px 0 0" }}>
                    {dupNameError}
                  </p>
                )}
              </div>

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
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && updateMember()}
                          autoFocus
                          style={inputSt}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ ...ghostBtnSt, flex: 1 }}
                          >
                            取消
                          </button>
                          <button
                            onClick={updateMember}
                            disabled={savingEdit || !editName.trim()}
                            style={{ ...accentBtnSt, flex: 2, opacity: savingEdit || !editName.trim() ? 0.5 : 1 }}
                          >
                            {savingEdit ? <><span className="spinner" />儲存中...</> : "確認"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal card ── */
                      <div key={p.id} style={rowCard}>
                        <span style={{ fontWeight: 600, fontSize: 16 }}>{p.emoji} {p.name}</span>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button
                            onClick={() => startEdit(p)}
                            disabled={deletingMemberId === p.id}
                            style={{ ...deleteIconBtn, fontSize: 15, opacity: deletingMemberId === p.id ? 0.35 : 1 }}
                            title="編輯成員"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteMember(p.id)}
                            disabled={deletingMemberId === p.id}
                            style={{ ...deleteIconBtn, fontSize: 15, opacity: deletingMemberId === p.id ? 0.35 : 1, minWidth: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="刪除成員"
                          >
                            {deletingMemberId === p.id ? <span className="spinner-sm" /> : "🗑️"}
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* ────────────── Expenses Tab ────────────── */}
          {tab === "expenses" && (
            <div>
              <button
                onClick={openExpModal}
                disabled={event.participants.length === 0}
                style={{
                  ...accentBtnSt,
                  width: "100%",
                  marginBottom: 16,
                  padding: "14px 0",
                  opacity: event.participants.length === 0 ? 0.5 : 1,
                }}
              >
                ＋ 新增費用
              </button>
              {event.participants.length === 0 && (
                <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-sub)", marginBottom: 12 }}>
                  請先至「成員」頁籤新增參與者
                </p>
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
                          <div style={{ display: "flex", gap: 2 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); openExpEditModal(exp); }}
                              disabled={deletingExpId === exp.id}
                              style={{ ...deleteIconBtn, opacity: deletingExpId === exp.id ? 0.35 : 1 }}
                              title="編輯費用"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteExpense(exp.id); }}
                              disabled={deletingExpId === exp.id}
                              style={{ ...deleteIconBtn, opacity: deletingExpId === exp.id ? 0.35 : 1, minWidth: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
                              title="刪除費用"
                            >
                              {deletingExpId === exp.id ? <span className="spinner-sm" /> : "🗑️"}
                            </button>
                          </div>
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
          )}

          {/* ────────────── Settlement Tab ────────────── */}
          {tab === "settlement" && (
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
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <button
                            onClick={() => openRepayModal(r)}
                            disabled={deletingRepayId === r.id}
                            style={{ ...deleteIconBtn, opacity: deletingRepayId === r.id ? 0.35 : 1 }}
                            title="編輯還款紀錄"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteRepayment(r.id)}
                            disabled={deletingRepayId === r.id}
                            style={{ ...deleteIconBtn, minWidth: 28, display: "flex", alignItems: "center", justifyContent: "center", opacity: deletingRepayId === r.id ? 0.35 : 1 }}
                            title="刪除還款紀錄"
                          >
                            {deletingRepayId === r.id ? <span className="spinner-sm" /> : "🗑️"}
                          </button>
                        </div>
                      </div>
                    ))}
                    {repayments.length === 0 && (
                      <div style={{ textAlign: "center", padding: "12px 0", fontSize: 14, color: "var(--text-sub)" }}>
                        尚無還款紀錄
                      </div>
                    )}
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
                  </div>

                  {/* Copy + Refresh */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={copySettlement}
                      style={{
                        width: "100%",
                        padding: "12px 0",
                        borderRadius: 10,
                        border: "none",
                        background: copied ? "var(--morandi-green)" : "var(--accent)",
                        color: "white",
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                    >
                      {copied ? "✅ 已複製！" : "📋 複製結算結果"}
                    </button>
                    <button
                      onClick={fetchSettlement}
                      style={{
                        width: "100%",
                        padding: "10px 0",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                        color: "var(--text-sub)",
                        fontSize: 15,
                        cursor: "pointer",
                      }}
                    >
                      🔄 重新計算
                    </button>
                    {isAdmin && event && (
                      <button
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
                          cursor: "pointer",
                        }}
                      >
                        {event.isSettled ? "🔓 取消結清標記" : "🔒 標記為已結清"}
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ────────────── Expense Modal ────────────── */}
      {showExpModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(92,82,72,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowExpModal(false); }}
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
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: "0 0 20px" }}>
              {editingExpId !== null ? "編輯費用" : "新增費用"}
            </h2>

            {/* Title */}
            <Field label="費用標題">
              <input
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                placeholder="例：晚餐、計程車"
                style={inputSt}
                autoFocus
              />
            </Field>

            {/* Amount */}
            <Field label="金額（元）">
              <input
                type="text"
                inputMode="decimal"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                onBlur={(e) => {
                  e.stopPropagation();
                  const result = evalAmountExpr(e.target.value);
                  if (result !== null) setExpAmount(String(result));
                }}
                placeholder="金額（可輸入算式如 120+80）"
                style={inputSt}
              />
            </Field>

            {/* Paid by */}
            <Field label="誰付的">
              <select
                value={expPaidById}
                onChange={(e) => setExpPaidById(Number(e.target.value))}
                style={inputSt}
              >
                {event.participants.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>

            {/* Split mode */}
            <Field label="分攤方式">
              <div style={{ display: "flex", gap: 8 }}>
                {(["equal", "custom"] as SplitMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSplitMode(mode)}
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
                  {event.participants.map((p) => {
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
                }
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {event.participants.map((p) => {
                    const ratio = Number(customRatios[p.id] ?? 0);
                    const parsedAmt = evalAmountExpr(expAmount) ?? Number(expAmount);
                    const amt = expAmount && customRatioSum > 0
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
                        <input
                          type="number"
                          value={customRatios[p.id] ?? "0"}
                          onChange={(e) =>
                            setCustomRatios((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
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
              <button onClick={() => setShowExpModal(false)} style={ghostBtnSt}>取消</button>
              <button
                onClick={saveExpense}
                disabled={
                  savingExp ||
                  !expTitle.trim() ||
                  !expAmount ||
                  expPaidById === "" ||
                  (splitMode === "custom" && customRatioSum !== 100)
                }
                style={{
                  ...accentBtnSt,
                  flex: 1,
                  opacity:
                    savingExp ||
                    !expTitle.trim() ||
                    !expAmount ||
                    expPaidById === "" ||
                    (splitMode === "custom" && customRatioSum !== 100)
                      ? 0.5
                      : 1,
                }}
              >
                {savingExp ? <><span className="spinner" />處理中...</> : editingExpId !== null ? "儲存變更" : "新增費用"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ────────────── Repayment Modal ────────────── */}
      {showRepayModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(92,82,72,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
          onClick={() => setShowRepayModal(false)}
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
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: "0 0 20px" }}>
              {editingRepayId !== null ? "編輯還款紀錄" : "新增還款紀錄"}
            </h2>

            <Field label="誰還款">
              <select
                value={repayFromId}
                onChange={(e) => setRepayFromId(Number(e.target.value))}
                style={inputSt}
              >
                {event.participants.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>

            <Field label="還給誰">
              <select
                value={repayToId}
                onChange={(e) => setRepayToId(Number(e.target.value))}
                style={inputSt}
              >
                {event.participants.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === repayFromId}>{p.name}</option>
                ))}
              </select>
            </Field>

            <Field label="金額（元）">
              <input
                type="number"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder="0"
                min={1}
                style={inputSt}
                autoFocus
              />
            </Field>

            <Field label="付款方式">
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {(["💚 Line Pay", "🏦 銀行轉帳", "💵 現金"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => {
                      const next = repayPayMethod === method ? "" : method;
                      setRepayPayMethod(next);
                      setRepayNote(next);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 4px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: repayPayMethod === method ? "var(--morandi-purple, #b39dac)" : "var(--bg-card)",
                      color: repayPayMethod === method ? "white" : "var(--text-sub)",
                      transition: "all 0.15s",
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="備註（選填）">
              <input
                value={repayNote}
                onChange={(e) => {
                  setRepayNote(e.target.value);
                  const knownMethods = ["💚 Line Pay", "🏦 銀行轉帳", "💵 現金"];
                  if (!knownMethods.includes(e.target.value)) setRepayPayMethod("");
                }}
                placeholder="例：Line Pay 轉帳"
                style={inputSt}
              />
            </Field>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setShowRepayModal(false)} style={ghostBtnSt}>取消</button>
              <button
                onClick={addRepayment}
                disabled={savingRepay || repayFromId === "" || repayToId === "" || !repayAmount || repayFromId === repayToId}
                style={{
                  ...accentBtnSt,
                  flex: 1,
                  opacity: savingRepay || repayFromId === "" || repayToId === "" || !repayAmount || repayFromId === repayToId ? 0.5 : 1,
                }}
              >
                {savingRepay ? <><span className="spinner" />處理中...</> : editingRepayId !== null ? "儲存變更" : "新增紀錄"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────── Settle Modal ────────────── */}
      {showSettleModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(92,82,72,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "0 16px" }}
          onClick={() => setShowSettleModal(false)}
        >
          <div
            style={{ background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 20px", width: "100%", maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: "0 0 12px" }}>
              {settleAction === "settle" ? "確認標記結清？" : "確認解除結清？"}
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-sub)", lineHeight: 1.65, margin: "0 0 24px" }}>
              {settleAction === "settle"
                ? "標記後活動將移至「已結清」區塊，仍可隨時解除。"
                : "解除後活動將回到進行中，可繼續編輯費用與成員。"}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowSettleModal(false)}
                style={{ flex: 1, padding: "12px 0", background: "var(--bg-card)", color: "var(--text-main)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer" }}
              >
                取消
              </button>
              <button
                onClick={confirmSettle}
                disabled={savingSettle}
                style={{
                  flex: 1, padding: "12px 0", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer",
                  background: settleAction === "settle" ? "var(--morandi-green)" : "var(--accent)",
                  color: "white",
                  opacity: savingSettle ? 0.6 : 1,
                }}
              >
                {savingSettle ? "處理中..." : settleAction === "settle" ? "確認結清" : "確認解除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RollingDigit({ speed }: { speed: number }) {
  const [n, setN] = useState(() => Math.floor(Math.random() * 10));
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v + 1) % 10), speed);
    return () => clearInterval(t);
  }, [speed]);
  return (
    <span style={{ display: "inline-block", width: "0.58em", textAlign: "center" }}>
      {n}
    </span>
  );
}

function SettlementLoadingView() {
  return (
    <div style={{ textAlign: "center", padding: "52px 0 44px" }}>
      <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 18 }}>🧮</div>
      <div style={{
        fontFamily: "monospace",
        fontSize: 26,
        fontWeight: 700,
        color: "var(--accent)",
        letterSpacing: "0.08em",
        marginBottom: 14,
      }}>
        <RollingDigit speed={85} />
        <RollingDigit speed={120} />
        <RollingDigit speed={97} />
        <span style={{ opacity: 0.35, margin: "0 1px" }}>,</span>
        <RollingDigit speed={110} />
        <RollingDigit speed={74} />
        <RollingDigit speed={91} />
      </div>
      <p style={{ fontSize: 13, color: "var(--text-sub)", margin: 0, letterSpacing: "0.06em" }}>
        計算中
      </p>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-sub)" }}>
      <div style={{ fontSize: 44, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: 16 }}>{text}</p>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
      {text}
    </p>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 14, color: "var(--text-sub)", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 16,
  color: "var(--text-main)",
  outline: "none",
};

const accentBtnSt: React.CSSProperties = {
  padding: "12px 16px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtnSt: React.CSSProperties = {
  flex: 1,
  padding: "12px 0",
  background: "var(--bg-card)",
  color: "var(--text-main)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

const rowCard: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "12px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const deleteIconBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  padding: 4,
  borderRadius: 6,
  lineHeight: 1,
  flexShrink: 0,
};
