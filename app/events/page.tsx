"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EventSummary = {
  id: number;
  name: string;
  startDate: string;
  endDate: string | null;
  participants: { id: number }[];
  expenses: { id: number; amount: number }[];
  isSettled: boolean;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredEvents = events.filter((ev) =>
    ev.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, paddingTop: 2 }}>
            <ThemeSwitcher />
            {isAdmin ? (
              <>
                <span style={{ fontSize: 14, color: "var(--accent)", fontWeight: 600, whiteSpace: "nowrap" }}>
                  👑<span className="hidden-xs"> 管理員</span>
                </span>
                <Button onClick={logout} style={ghostSmBtn}>登出</Button>
                <Button onClick={() => setShowModal(true)} style={accentBtn}>＋ 新增</Button>
              </>
            ) : (
              <Button onClick={() => setShowLoginModal(true)} style={ghostSmBtn}>🔑 管理員登入</Button>
            )}
          </div>
        </div>

        {/* ── Search ── */}
        <div style={{ marginBottom: 16, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 16, zIndex: 1 }}>🔍</span>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋活動名稱..."
            style={{ ...inputSt, paddingLeft: 40 }}
          />
        </div>

        {/* ── Events ── */}
        {filteredEvents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-sub)" }}>
            {searchQuery ? (
              <p style={{ fontSize: 16 }}>找不到符合的活動</p>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🌸</div>
                <p style={{ fontSize: 16 }}>還沒有活動，新增一個吧！</p>
              </>
            )}
          </div>
        ) : (() => {
          const active = filteredEvents.filter((ev) => !ev.isSettled);
          const settled = filteredEvents.filter((ev) => ev.isSettled);

          function renderCard(ev: EventSummary) {
            const total = ev.expenses.reduce((s, e) => s + e.amount, 0);
            return (
              <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: "none" }}>
                <Card style={{ ...cardStyle, opacity: ev.isSettled ? 0.7 : 1 }}>
                  <CardContent className="p-0" style={{ padding: "16px 20px" }}>
                    {isAdmin && (
                      <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 2 }}>
                        <Button
                          onClick={(e) => openEdit(ev, e)}
                          disabled={deletingId === ev.id}
                          style={{ ...ghostDeleteBtn, opacity: deletingId === ev.id ? 0.35 : 1 }}
                          title="編輯活動"
                        >✏️</Button>
                        <Button
                          onClick={(e) => deleteEvent(ev.id, ev.name, e)}
                          disabled={deletingId === ev.id}
                          style={{ ...ghostDeleteBtn, opacity: deletingId === ev.id ? 0.45 : 1, cursor: deletingId === ev.id ? "not-allowed" : "pointer", minWidth: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="刪除活動"
                        >
                          {deletingId === ev.id ? <span className="spinner-sm" /> : "🗑️"}
                        </Button>
                      </div>
                    )}
                    <div style={{ fontWeight: 600, fontSize: 18, color: "var(--text-main)", marginBottom: 6, paddingRight: isAdmin ? 68 : 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {ev.name}
                      {ev.isSettled && (
                        <Badge style={{ fontSize: 12, fontWeight: 600, color: "var(--morandi-green)", background: "rgba(122,158,135,0.15)", border: "1px solid rgba(122,158,135,0.4)", borderRadius: 20, padding: "2px 9px" }}>
                          ✅ 已結清
                        </Badge>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 8 }}>
                      📅 啟程　{fmtDateRange(ev.startDate, ev.endDate)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 13, color: "var(--text-sub)" }}>
                      <span>👥 同行者　{ev.participants.length} 位</span>
                      <span>🧾 帳目　{ev.expenses.length} 筆</span>
                      {total > 0 && <span>💰 共計　NT${total.toLocaleString()}</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          }

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {active.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-sub)", marginBottom: 10, letterSpacing: "0.04em" }}>
                    進行中
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {active.map(renderCard)}
                  </div>
                </div>
              )}
              {settled.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--morandi-green)", marginBottom: 10, letterSpacing: "0.04em" }}>
                    已結清
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {settled.map(renderCard)}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Login Modal ── */}
      <Dialog
        open={showLoginModal}
        onOpenChange={(open) => { if (!open) { setShowLoginModal(false); setLoginError(""); setLoginPassword(""); } }}
      >
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          style={{ background: "var(--bg-main)", border: "1px solid var(--border)", maxWidth: 420, borderRadius: 16, padding: "24px 20px" }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>🔑 管理員登入</DialogTitle>
          </DialogHeader>
          <div style={{ marginBottom: 20 }}>
            <label style={labelSt}>密碼</label>
            <Input
              type="password"
              value={loginPassword}
              onChange={(e) => { setLoginPassword(e.target.value); setLoginError(""); }}
              onKeyDown={(e) => e.key === "Enter" && login()}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="輸入管理員密碼"
              style={{ ...inputSt, borderColor: loginError ? "var(--morandi-red)" : undefined }}
              autoFocus
            />
            {loginError && (
              <p style={{ fontSize: 12, color: "var(--morandi-red)", margin: "6px 0 0" }}>{loginError}</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => { setShowLoginModal(false); setLoginError(""); setLoginPassword(""); }} style={ghostBtn}>取消</Button>
            <Button
              onClick={login}
              disabled={loginSaving || !loginPassword}
              style={{ ...accentBtn, flex: 1, opacity: loginSaving || !loginPassword ? 0.5 : 1 }}
            >
              {loginSaving ? <><span className="spinner" />驗證中...</> : "登入"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          style={{ background: "var(--bg-main)", border: "1px solid var(--border)", maxWidth: 420, borderRadius: 16, padding: "24px 20px" }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>編輯活動</DialogTitle>
          </DialogHeader>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>活動名稱</label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={inputSt} autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>啟程日</label>
            <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={inputSt} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelSt}>賦歸日 <span style={{ fontWeight: 400, opacity: 0.7 }}>（選填）</span></label>
            <Input
              type="date" value={editEndDate} min={editStartDate}
              onChange={(e) => setEditEndDate(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ ...inputSt, borderColor: editEndDate && editEndDate < editStartDate ? "var(--morandi-red)" : undefined }}
            />
            {editEndDate && editEndDate < editStartDate && (
              <p style={{ fontSize: 12, color: "var(--morandi-red)", margin: "4px 0 0" }}>迄止日不能早於起始日</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => setEditTarget(null)} style={ghostBtn}>取消</Button>
            <Button
              onClick={saveEdit}
              disabled={editSaving || !editName.trim() || !editStartDate || !!(editEndDate && editEndDate < editStartDate)}
              style={{ ...accentBtn, flex: 1, opacity: editSaving || !editName.trim() || !editStartDate || !!(editEndDate && editEndDate < editStartDate) ? 0.5 : 1 }}
            >
              {editSaving ? <><span className="spinner" />儲存中...</> : "儲存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Modal ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          style={{ background: "var(--bg-main)", border: "1px solid var(--border)", maxWidth: 420, borderRadius: 16, padding: "24px 20px" }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>確定刪除活動？</DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: 15, color: "var(--text-sub)", lineHeight: 1.6, margin: "0 0 24px" }}>
            「{deleteTarget?.name}」及其所有費用、成員、還款紀錄將一併刪除，無法復原。
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => setDeleteTarget(null)} style={ghostBtn}>取消</Button>
            <Button onClick={confirmDelete} style={{ flex: 1, padding: "12px 0", background: "var(--morandi-red)", color: "white", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer", height: "auto" }}>
              確定刪除
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Modal ── */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) setShowModal(false); }}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          style={{ background: "var(--bg-main)", border: "1px solid var(--border)", maxWidth: 420, borderRadius: 16, padding: "24px 20px" }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>新增活動</DialogTitle>
          </DialogHeader>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>活動名稱</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} placeholder="例：墾丁三天兩夜" style={inputSt} autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>啟程日</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={inputSt} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelSt}>賦歸日 <span style={{ fontWeight: 400, opacity: 0.7 }}>（選填）</span></label>
            <Input
              type="date" value={endDate} min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ ...inputSt, borderColor: endDate && endDate < startDate ? "var(--morandi-red)" : undefined }}
            />
            {endDate && endDate < startDate && (
              <p style={{ fontSize: 12, color: "var(--morandi-red)", margin: "4px 0 0" }}>迄止日不能早於起始日</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => setShowModal(false)} style={ghostBtn}>取消</Button>
            <Button
              onClick={createEvent}
              disabled={saving || !name.trim() || !startDate || !!(endDate && endDate < startDate)}
              style={{ ...accentBtn, flex: 1, opacity: saving || !name.trim() || !startDate || !!(endDate && endDate < startDate) ? 0.5 : 1 }}
            >
              {saving ? <><span className="spinner" />建立中...</> : "建立活動"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 0,
  position: "relative",
  cursor: "pointer",
  transition: "border-color 0.15s",
  boxShadow: "none",
};

const ghostDeleteBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
  padding: 4,
  borderRadius: 6,
  height: "auto",
};

const inputSt: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 16,
  color: "var(--text-main)",
  outline: "none",
  height: "auto",
};

const labelSt: React.CSSProperties = {
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
  height: "auto",
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
  height: "auto",
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
  height: "auto",
};
