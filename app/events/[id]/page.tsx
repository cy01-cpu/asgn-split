"use client";

import { useEffect, useState, useCallback } from "react";
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
  date: string;
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

type Tab = "members" | "expenses" | "settlement";
type SplitMode = "equal" | "custom";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${y}/${m}/${d}`;
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams();
  const eventId = Number(params.id);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("members");

  // Members state
  const [newName, setNewName] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Expense modal state
  const [showExpModal, setShowExpModal] = useState(false);
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

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}`);
    if (!res.ok) { setLoading(false); return; }
    setEvent(await res.json());
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const fetchSettlement = useCallback(async () => {
    setSettlementLoading(true);
    const res = await fetch(`/api/events/${eventId}/settlement`);
    setSettlement(await res.json());
    setSettlementLoading(false);
  }, [eventId]);

  useEffect(() => {
    if (tab === "settlement") fetchSettlement();
  }, [tab, fetchSettlement]);

  // ── Members ───────────────────────────────────────────────────────────────────

  async function addMember() {
    if (!newName.trim()) return;
    setAddingMember(true);
    await fetch(`/api/events/${eventId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), emoji: "🙂" }),
    });
    setNewName("");
    setAddingMember(false);
    fetchEvent();
  }

  async function deleteMember(pid: number) {
    if (!confirm("確定要刪除這位成員嗎？")) return;
    const res = await fetch(`/api/events/${eventId}/participants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pid }),
    });
    if (!res.ok) {
      alert("無法刪除：請先刪除此成員相關的費用記錄");
      return;
    }
    fetchEvent();
  }

  // ── Expenses ─────────────────────────────────────────────────────────────────

  function openExpModal() {
    if (!event) return;
    const ids = event.participants.map((p) => p.id);
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

  async function saveExpense() {
    if (!expTitle.trim() || !expAmount || expPaidById === "") return;
    const total = Number(expAmount);
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
    await fetch(`/api/events/${eventId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paidById: expPaidById,
        title: expTitle.trim(),
        amount: total,
        shares,
      }),
    });
    setSavingExp(false);
    setShowExpModal(false);
    fetchEvent();
  }

  async function deleteExpense(expId: number) {
    if (!confirm("確定要刪除這筆費用嗎？")) return;
    await fetch(`/api/events/${eventId}/expenses`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: expId }),
    });
    fetchEvent();
  }

  // ── Settlement ────────────────────────────────────────────────────────────────

  async function copySettlement() {
    if (!settlement || !event) return;
    const lines = [`【${event.name}結算】`];
    if (settlement.settlements.length === 0) {
      lines.push("✅ 已結清，無需轉帳！");
    } else {
      settlement.settlements.forEach((s) => {
        lines.push(
          `💸 ${s.from.emoji}${s.from.name} 付給 ${s.to.emoji}${s.to.name}：${fmtNT(s.amount)}`
        );
      });
      lines.push("✅ 結算完成！");
    }
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
      ? Math.floor(Number(expAmount) / equalSelected.size)
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
          <Link href="/events" style={{ color: "var(--text-sub)", textDecoration: "none", fontSize: 22, lineHeight: 1 }}>
            ←
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {event.name}
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-sub)", margin: "2px 0 0" }}>
              📅 {fmtDate(event.date)} · {event.participants.length} 位成員
            </p>
          </div>
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
                fontSize: 13,
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
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMember()}
                  placeholder="輸入成員名稱"
                  style={{ ...inputSt, flex: 1 }}
                />
                <button
                  onClick={addMember}
                  disabled={addingMember || !newName.trim()}
                  style={{ ...accentBtnSt, opacity: addingMember || !newName.trim() ? 0.5 : 1 }}
                >
                  新增
                </button>
              </div>

              {event.participants.length === 0 ? (
                <EmptyState icon="👤" text="還沒有成員，先新增幾位吧！" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {event.participants.map((p) => (
                    <div key={p.id} style={rowCard}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 26 }}>{p.emoji}</span>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
                      </div>
                      <button
                        onClick={() => deleteMember(p.id)}
                        style={deleteIconBtn}
                        title="刪除成員"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
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
                  padding: "12px 0",
                  opacity: event.participants.length === 0 ? 0.5 : 1,
                }}
              >
                ＋ 新增費用
              </button>
              {event.participants.length === 0 && (
                <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-sub)", marginBottom: 12 }}>
                  請先至「成員」頁籤新增參與者
                </p>
              )}

              {event.expenses.length === 0 ? (
                <EmptyState icon="🧾" text="還沒有費用記錄" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {event.expenses.map((exp) => (
                    <div key={exp.id} style={{ ...rowCard, flexDirection: "column", alignItems: "stretch" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{exp.title}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
                            {fmtNT(exp.amount)}
                          </div>
                        </div>
                        <button onClick={() => deleteExpense(exp.id)} style={deleteIconBtn} title="刪除費用">
                          🗑️
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--text-sub)", marginTop: 10 }}>
                        <span>💳 {exp.paidBy.emoji}{exp.paidBy.name} 付款</span>
                        <span>👥 {exp.shares.length} 人分攤</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ────────────── Settlement Tab ────────────── */}
          {tab === "settlement" && (
            <div>
              {settlementLoading ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-sub)" }}>
                  計算中...
                </div>
              ) : settlement ? (
                <>
                  {/* Balances */}
                  <SectionLabel text="每人餘額" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                    {settlement.balances.map((b) => (
                      <div key={b.participantId} style={rowCard}>
                        <span style={{ fontSize: 15 }}>{b.emoji} {b.name}</span>
                        <div style={{ textAlign: "right" }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: 15,
                            color: b.balance > 0
                              ? "var(--morandi-green)"
                              : b.balance < 0
                              ? "var(--morandi-red)"
                              : "var(--text-sub)",
                          }}>
                            {b.balance > 0 ? "+" : ""}{fmtNT(b.balance)}
                          </span>
                          {b.balance !== 0 && (
                            <div style={{ fontSize: 11, color: b.balance > 0 ? "var(--morandi-green)" : "var(--morandi-red)", marginTop: 1 }}>
                              {b.balance > 0 ? "被欠" : "欠人"}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Transfers */}
                  <SectionLabel text="轉帳清單" />
                  {settlement.settlements.length === 0 ? (
                    <div style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "20px 16px",
                      textAlign: "center",
                      color: "var(--morandi-green)",
                      fontWeight: 600,
                      fontSize: 15,
                      marginBottom: 16,
                    }}>
                      ✅ 已結清，無需轉帳！
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      {settlement.settlements.map((s, i) => (
                        <div key={i} style={{ ...rowCard, gap: 8 }}>
                          <span style={{ fontSize: 14, flex: 1 }}>
                            💸 <strong>{s.from.emoji}{s.from.name}</strong>
                            <span style={{ color: "var(--text-sub)" }}> 付給 </span>
                            <strong>{s.to.emoji}{s.to.name}</strong>
                          </span>
                          <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 15, whiteSpace: "nowrap" }}>
                            {fmtNT(s.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

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
                        fontSize: 14,
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
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      🔄 重新計算
                    </button>
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
          onClick={() => setShowExpModal(false)}
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
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)", margin: "0 0 20px" }}>新增費用</h2>

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
                type="number"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="0"
                min={1}
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
                  <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
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
                      padding: "9px 0",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      fontSize: 13,
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
                        <span style={{ flex: 1, fontSize: 14 }}>{p.emoji} {p.name}</span>
                        {checked && equalPerPerson > 0 && (
                          <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
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
                    const amt = expAmount && customRatioSum > 0
                      ? Math.floor((ratio / customRatioSum) * Number(expAmount))
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
                        <span style={{ flex: 1, fontSize: 14 }}>{p.emoji} {p.name}</span>
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
                {savingExp ? "儲存中..." : "新增費用"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-sub)" }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: 14 }}>{text}</p>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 12, color: "var(--text-sub)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
      {text}
    </p>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, color: "var(--text-sub)", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 14,
  color: "var(--text-main)",
  outline: "none",
};

const accentBtnSt: React.CSSProperties = {
  padding: "10px 18px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtnSt: React.CSSProperties = {
  flex: 1,
  padding: "10px 0",
  background: "var(--bg-card)",
  color: "var(--text-main)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 14,
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
