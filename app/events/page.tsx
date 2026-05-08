"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type EventSummary = {
  id: number;
  name: string;
  startDate: string;
  endDate: string | null;
  participants: { id: number }[];
  expenses: { id: number; amount: number }[];
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function PurseIcon({ size = 24, color = "#C9A84C" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M6 9V7.5a6 6 0 0112 0V9" />
      <rect x="3" y="9" width="18" height="13" rx="2" />
      <circle cx="12" cy="15.5" r="1.5" />
    </svg>
  );
}

function KeyIcon({ size = 16, color = "#C9A84C" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M11.5 11.5L21 2" />
      <path d="M18 5l2 2" />
      <path d="M15 8l1 1" />
    </svg>
  );
}

function CalendarIcon({ size = 14, color = "#8c7e72" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function UsersIcon({ size = 14, color = "#8c7e72" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function ReceiptIcon({ size = 14, color = "#8c7e72" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M9 5H7a2 2 0 00-2 2v13a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function CoinIcon({ size = 14, color = "#8c7e72" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9a3 3 0 00-5 2c0 2.5 5 3 5 5.5a3 3 0 01-5.5.5" />
      <path d="M12 7v1M12 17v1" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<EventSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Login modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSaving, setLoginSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/events");
    setEvents(await res.json());
  }

  async function checkAdmin() {
    const res = await fetch("/api/admin/check");
    const data = await res.json();
    setIsAdmin(data.isAdmin);
  }

  useEffect(() => {
    load();
    checkAdmin();
  }, []);

  async function createEvent() {
    if (!name.trim() || !startDate) return;
    if (endDate && endDate < startDate) return;
    setSaving(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), startDate, endDate: endDate || null }),
    });
    setName(""); setStartDate(""); setEndDate("");
    setShowModal(false); setSaving(false);
    load();
  }

  function deleteEvent(id: number, evName: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setDeleteTarget({ id, name: evName });
  }

  function openEdit(ev: EventSummary, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setEditTarget(ev);
    setEditName(ev.name);
    setEditStartDate(ev.startDate.slice(0, 10));
    setEditEndDate(ev.endDate ? ev.endDate.slice(0, 10) : "");
  }

  async function saveEdit() {
    if (!editTarget || !editName.trim() || !editStartDate) return;
    if (editEndDate && editEndDate < editStartDate) return;
    setEditSaving(true);
    await fetch(`/api/events/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), startDate: editStartDate, endDate: editEndDate || null }),
    });
    setEditSaving(false); setEditTarget(null);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id); setDeleteTarget(null);
    await fetch(`/api/events/${deleteTarget.id}`, { method: "DELETE" });
    setDeletingId(null); load();
  }

  async function login() {
    if (!loginPassword) return;
    setLoginSaving(true); setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPassword }),
    });
    setLoginSaving(false);
    if (res.ok) {
      setIsAdmin(true); setShowLoginModal(false); setLoginPassword("");
    } else {
      setLoginError("密碼錯誤，請再試一次");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
  }

  function fmtDateRange(startIso: string, endIso: string | null) {
    const [sy, sm, sd] = startIso.slice(0, 10).split("-");
    const start = `${sy}/${sm}/${sd}`;
    if (!endIso) return start;
    const [, em, ed] = endIso.slice(0, 10).split("-");
    const days = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86400000) + 1;
    return `${start} ~ ${em}/${ed}（${days}天）`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-main)" }}>
      <div style={{ maxWidth: 512, margin: "0 auto", padding: "22px 16px 80px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 10 }}>
          <h1 style={{ fontSize: 19, fontWeight: 300, letterSpacing: "0.06em", color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <PurseIcon size={20} color="#C9A84C" />
            結伴釐算
          </h1>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {isAdmin ? (
              <>
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, letterSpacing: "0.04em" }}>管理員</span>
                <button onClick={logout} style={ghostSmBtn}>登出</button>
                <button onClick={() => setShowModal(true)} style={accentBtn}>＋ 新增活動</button>
              </>
            ) : (
              <button onClick={() => setShowLoginModal(true)} style={ghostSmBtn}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <KeyIcon size={13} color="#C9A84C" />
                  登入管理
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ── Info card ── */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid #d4c9bc",
          borderRadius: 6,
          padding: "12px 16px",
          marginBottom: !isAdmin ? 6 : 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
            <PurseIcon size={16} color="#C9A84C" />
            <span style={{ fontSize: 13, fontWeight: 300, letterSpacing: "0.07em", color: "var(--text-main)" }}>結伴釐算</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-sub)", margin: 0, lineHeight: 1.75 }}>
            聚會宴饗，同遊起行；隨心分攤，優雅結清。
          </p>
        </div>
        {!isAdmin && (
          <p style={{ fontSize: 11, color: "var(--text-sub)", margin: "0 0 24px 2px", opacity: 0.55, letterSpacing: "0.02em" }}>
            如需建立活動，請以管理員身份登入
          </p>
        )}

        {/* ── Events ── */}
        {events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "52px 0", color: "var(--text-sub)" }}>
            <PurseIcon size={32} color="#c8bdb3" />
            <p style={{ fontSize: 13, marginTop: 14, letterSpacing: "0.04em", opacity: 0.7 }}>尚無活動紀錄</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {events.map((ev) => {
              const total = ev.expenses.reduce((s, e) => s + e.amount, 0);
              return (
                <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: "none" }}>
                  <div style={cardStyle}>
                    {isAdmin && (
                      <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 2 }}>
                        <button
                          onClick={(e) => openEdit(ev, e)}
                          disabled={deletingId === ev.id}
                          style={{ ...ghostDeleteBtn, position: "static", opacity: deletingId === ev.id ? 0.35 : 1 }}
                          title="編輯活動"
                        >✏️</button>
                        <button
                          onClick={(e) => deleteEvent(ev.id, ev.name, e)}
                          disabled={deletingId === ev.id}
                          style={{ ...ghostDeleteBtn, position: "static", opacity: deletingId === ev.id ? 0.45 : 1, cursor: deletingId === ev.id ? "not-allowed" : "pointer", minWidth: 26, display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="刪除活動"
                        >
                          {deletingId === ev.id ? <span className="spinner-sm" /> : "🗑️"}
                        </button>
                      </div>
                    )}
                    <div style={{ fontWeight: 500, fontSize: 14, color: "var(--text-main)", marginBottom: 10, paddingRight: isAdmin ? 60 : 0, letterSpacing: "0.02em" }}>
                      {ev.name}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-sub)" }}>
                        <CalendarIcon size={13} />
                        <span>啟程　{fmtDateRange(ev.startDate, ev.endDate)}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-sub)" }}>
                          <UsersIcon size={13} />
                          <span>同行者　{ev.participants.length} 位</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-sub)" }}>
                          <ReceiptIcon size={13} />
                          <span>帳目　{ev.expenses.length} 筆</span>
                        </div>
                      </div>
                      {total > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-sub)" }}>
                          <CoinIcon size={13} />
                          <span>共計　NT${total.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Login Modal ── */}
      {showLoginModal && (
        <div style={overlay} onClick={() => { setShowLoginModal(false); setLoginError(""); setLoginPassword(""); }}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 400, letterSpacing: "0.04em", color: "var(--text-main)", margin: "0 0 20px" }}>
              登入管理
            </h2>
            <div style={{ marginBottom: 20 }}>
              <label style={label}>密碼</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(""); }}
                onKeyDown={(e) => e.key === "Enter" && login()}
                placeholder="輸入管理員密碼"
                style={{ ...input, borderColor: loginError ? "var(--morandi-red)" : undefined }}
                autoFocus
              />
              {loginError && (
                <p style={{ fontSize: 12, color: "var(--morandi-red)", margin: "6px 0 0" }}>{loginError}</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowLoginModal(false); setLoginError(""); setLoginPassword(""); }} style={ghostBtn}>取消</button>
              <button
                onClick={login}
                disabled={loginSaving || !loginPassword}
                style={{ ...accentBtn, flex: 1, opacity: loginSaving || !loginPassword ? 0.5 : 1 }}
              >
                {loginSaving ? <><span className="spinner" />驗證中...</> : "登入"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <div style={overlay} onClick={() => setEditTarget(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 400, letterSpacing: "0.04em", color: "var(--text-main)", margin: "0 0 20px" }}>編輯活動</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>活動名稱</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} style={input} autoFocus />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>啟程日</label>
              <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} style={input} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={label}>賦歸日 <span style={{ fontWeight: 400, opacity: 0.7 }}>（選填）</span></label>
              <input
                type="date" value={editEndDate} min={editStartDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                style={{ ...input, borderColor: editEndDate && editEndDate < editStartDate ? "var(--morandi-red)" : undefined }}
              />
              {editEndDate && editEndDate < editStartDate && (
                <p style={{ fontSize: 12, color: "var(--morandi-red)", margin: "4px 0 0" }}>迄止日不能早於起始日</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditTarget(null)} style={ghostBtn}>取消</button>
              <button
                onClick={saveEdit}
                disabled={editSaving || !editName.trim() || !editStartDate || !!(editEndDate && editEndDate < editStartDate)}
                style={{ ...accentBtn, flex: 1, opacity: editSaving || !editName.trim() || !editStartDate || !!(editEndDate && editEndDate < editStartDate) ? 0.5 : 1 }}
              >
                {editSaving ? <><span className="spinner" />儲存中...</> : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div style={overlay} onClick={() => setDeleteTarget(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 400, letterSpacing: "0.04em", color: "var(--text-main)", margin: "0 0 12px" }}>確定刪除活動？</h2>
            <p style={{ fontSize: 14, color: "var(--text-sub)", lineHeight: 1.7, margin: "0 0 24px" }}>
              「{deleteTarget.name}」及其所有費用、成員、還款紀錄將一併刪除，無法復原。
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)} style={ghostBtn}>取消</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: "11px 0", background: "var(--morandi-red)", color: "white", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 400, letterSpacing: "0.04em", color: "var(--text-main)", margin: "0 0 20px" }}>新增活動</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>活動名稱</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：墾丁三天兩夜" style={input} autoFocus />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>啟程日</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={input} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={label}>賦歸日 <span style={{ fontWeight: 400, opacity: 0.7 }}>（選填）</span></label>
              <input
                type="date" value={endDate} min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ ...input, borderColor: endDate && endDate < startDate ? "var(--morandi-red)" : undefined }}
              />
              {endDate && endDate < startDate && (
                <p style={{ fontSize: 12, color: "var(--morandi-red)", margin: "4px 0 0" }}>迄止日不能早於起始日</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={ghostBtn}>取消</button>
              <button
                onClick={createEvent}
                disabled={saving || !name.trim() || !startDate || !!(endDate && endDate < startDate)}
                style={{ ...accentBtn, flex: 1, opacity: saving || !name.trim() || !startDate || !!(endDate && endDate < startDate) ? 0.5 : 1 }}
              >
                {saving ? <><span className="spinner" />建立中...</> : "建立活動"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid #d4c9bc",
  borderRadius: 6,
  padding: "14px 16px",
  position: "relative",
  cursor: "pointer",
  transition: "border-color 0.15s",
};

const ghostDeleteBtn: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 15,
  lineHeight: 1,
  padding: 3,
  borderRadius: 4,
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(92,82,72,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: "0 16px",
};

const modalCard: React.CSSProperties = {
  background: "var(--bg-main)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "22px 20px",
  width: "100%",
  maxWidth: 400,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 14,
  color: "var(--text-main)",
  outline: "none",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--text-sub)",
  marginBottom: 5,
  fontWeight: 400,
  letterSpacing: "0.03em",
};

const accentBtn: React.CSSProperties = {
  padding: "9px 14px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 4,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  flex: 1,
  padding: "11px 0",
  background: "var(--bg-card)",
  color: "var(--text-main)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  fontSize: 14,
  fontWeight: 400,
  cursor: "pointer",
};

const ghostSmBtn: React.CSSProperties = {
  padding: "7px 12px",
  background: "var(--bg-card)",
  color: "var(--text-sub)",
  border: "1px solid #9b8ea0",
  borderRadius: 4,
  fontSize: 13,
  fontWeight: 400,
  cursor: "pointer",
};
