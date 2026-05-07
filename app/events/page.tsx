"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type EventSummary = {
  id: number;
  name: string;
  date: string;
  participants: { id: number }[];
  expenses: { id: number }[];
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  async function load() {
    const res = await fetch("/api/events");
    setEvents(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function createEvent() {
    if (!name.trim() || !date) return;
    setSaving(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), date }),
    });
    setName("");
    setDate("");
    setShowModal(false);
    setSaving(false);
    load();
  }

  function deleteEvent(id: number, name: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget({ id, name });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDeleteTarget(null);
    await fetch(`/api/events/${deleteTarget.id}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  }

  function fmtDate(s: string) {
    const part = s.slice(0, 10);
    const [y, m, d] = part.split("-");
    return `${y}/${m}/${d}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-main)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
            🍽️ 帳單分攤計算
          </h1>
          <button onClick={() => setShowModal(true)} style={accentBtn}>
            ＋ 新增活動
          </button>
        </div>

        {/* Events */}
        {events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-sub)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌸</div>
            <p style={{ fontSize: 15 }}>還沒有活動，新增一個吧！</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {events.map((ev) => (
              <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: "none" }}>
                <div style={cardStyle}>
                  <button
                    onClick={(e) => deleteEvent(ev.id, ev.name, e)}
                    disabled={deletingId === ev.id}
                    style={{ ...ghostDeleteBtn, opacity: deletingId === ev.id ? 0.45 : 1, cursor: deletingId === ev.id ? "not-allowed" : "pointer" }}
                    title="刪除活動"
                  >
                    {deletingId === ev.id ? <span className="spinner-sm" /> : "🗑️"}
                  </button>
                  <div style={{ fontWeight: 600, fontSize: 16, color: "var(--text-main)", marginBottom: 4, paddingRight: 32 }}>
                    {ev.name}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 10 }}>
                    📅 {fmtDate(ev.date)}
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--text-sub)" }}>
                    <span>👥 {ev.participants.length} 位參與者</span>
                    <span>💳 {ev.expenses.length} 筆費用</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div style={overlay} onClick={() => setDeleteTarget(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)", margin: "0 0 12px" }}>
              確定刪除活動？
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-sub)", lineHeight: 1.6, margin: "0 0 24px" }}>
              「{deleteTarget.name}」及其所有費用、成員、還款紀錄將一併刪除，無法復原。
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)} style={ghostBtn}>
                取消
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: "var(--morandi-red)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)", margin: "0 0 20px" }}>
              新增活動
            </h2>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>活動名稱</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：墾丁三天兩夜"
                style={input}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={label}>活動日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={input}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowModal(false)} style={ghostBtn}>
                取消
              </button>
              <button
                onClick={createEvent}
                disabled={saving || !name.trim() || !date}
                style={{ ...accentBtn, flex: 1, opacity: saving || !name.trim() || !date ? 0.5 : 1 }}
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
  padding: "10px 12px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 14,
  color: "var(--text-main)",
  outline: "none",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "var(--text-sub)",
  marginBottom: 6,
  fontWeight: 500,
};

const accentBtn: React.CSSProperties = {
  padding: "9px 18px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
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
