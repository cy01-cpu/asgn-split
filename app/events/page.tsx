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
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-main)", margin: 0, whiteSpace: "nowrap" }}>
              👛 結伴釐算
            </h1>
            <p className="hidden-xs" style={{ fontSize: 11, color: "var(--text-sub)", margin: "3px 0 0", fontWeight: 400 }}>
              聚會宴饗，同遊起行；隨心分攤，優雅結清。
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, paddingTop: 2 }}>
            {isAdmin ? (
              <>
                <span style={{ fontSize: 14, color: "var(--accent)", fontWeight: 600, whiteSpace: "nowrap" }}>👑 管理員</span>
                <button onClick={logout} style={ghostSmBtn}>登出</button>
                <button onClick={() => setShowModal(true)} style={accentBtn}>＋ 新增活動</button>
              </>
            ) : (
              <button onClick={() => setShowLoginModal(true)} style={ghostSmBtn}>🔑 管理員登入</button>
            )}
          </div>
        </div>

        {/* ── Events ── */}
        {events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-sub)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌸</div>
            <p style={{ fontSize: 16 }}>還沒有活動，新增一個吧！</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                          style={{ ...ghostDeleteBtn, position: "static", opacity: deletingId === ev.id ? 0.45 : 1, cursor: deletingId === ev.id ? "not-allowed" : "pointer", minWidth: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="刪除活動"
                        >
                          {deletingId === ev.id ? <span className="spinner-sm" /> : "🗑️"}
                        </button>
                      </div>
                    )}
                    <div style={{ fontWeight: 600, fontSize: 18, color: "var(--text-main)", marginBottom: 6, paddingRight: isAdmin ? 68 : 0 }}>
                      {ev.name}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 8 }}>
                      📅 啟程　{fmtDateRange(ev.startDate, ev.endDate)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 13, color: "var(--text-sub)" }}>
                      <span>👥 同行者　{ev.participants.length} 位</span>
                      <span>🧾 帳目　{ev.expenses.length} 筆</span>
                      {total > 0 && <span>💰 共計　NT${total.toLocaleString()}</span>}
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
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: "0 0 20px" }}>
              🔑 管理員登入
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
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: "0 0 20px" }}>編輯活動</h2>
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
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: "0 0 12px" }}>確定刪除活動？</h2>
            <p style={{ fontSize: 15, color: "var(--text-sub)", lineHeight: 1.6, margin: "0 0 24px" }}>
              「{deleteTarget.name}」及其所有費用、成員、還款紀錄將一併刪除，無法復原。
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)} style={ghostBtn}>取消</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: "12px 0", background: "var(--morandi-red)", color: "white", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
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
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: "0 0 20px" }}>新增活動</h2>
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
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 20px",
  position: "relative",
  cursor: "pointer",
  transition: "border-color 0.15s",
};

const ghostDeleteBtn: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
  padding: 4,
  borderRadius: 6,
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
  borderRadius: 16,
  padding: "24px 20px",
  width: "100%",
  maxWidth: 420,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 16,
  color: "var(--text-main)",
  outline: "none",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  color: "var(--text-sub)",
  marginBottom: 6,
  fontWeight: 500,
};

const accentBtn: React.CSSProperties = {
  padding: "12px 16px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
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

const ghostSmBtn: React.CSSProperties = {
  padding: "9px 14px",
  background: "var(--bg-card)",
  color: "var(--text-sub)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 500,
  cursor: "pointer",
};
