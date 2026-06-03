// 活動明細頁的資料層 hook
// ------------------------------------------------------------------
// 從 app/events/[id]/page.tsx 抽出：集中活動／結算／還款資料的抓取、
// 管理員判定、以及 SSE 即時更新（含指數退避重連）。UI state（分頁、
// 各 Modal、表單欄位）仍留在元件，僅將 `tab` 傳入以決定何時抓結算資料。
//
// 對外只露出唯讀值與三個 refetch 函式；所有 setter 皆封裝在內部。

import { useState, useEffect, useRef, useCallback } from "react";
import type { EventDetail, SettlementData, Repayment, Tab } from "./types";

export function useEventData(eventId: number, tab: Tab) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sseStatus, setSseStatus] = useState<"connected" | "reconnecting">("reconnecting");

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
  const onSseUpdateRef = useRef(() => { fetchEvent(); });
  useEffect(() => {
    onSseUpdateRef.current = () => {
      fetchEvent();
      if (tab === "settlement") {
        fetchSettlement();
        fetchRepayments();
      }
    };
  }, [fetchEvent, fetchSettlement, fetchRepayments, tab]);

  useEffect(() => {
    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    // 指數退避：3s → 6s → 12s …，最長 30s。連線成功後歸零，下次斷線重新從 3s 起算。
    const BASE_DELAY = 3000;
    const MAX_DELAY = 30000;
    let reconnectDelay = BASE_DELAY;

    function connect() {
      if (cancelled) return;
      es = new EventSource(`/api/events/${eventId}/stream`);

      es.onopen = () => {
        if (cancelled) return;
        setSseStatus("connected");
        reconnectDelay = BASE_DELAY;
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
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
      };
    }

    connect();

    return () => {
      cancelled = true;
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, [eventId]);

  return {
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
  };
}
