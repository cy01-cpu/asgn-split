import { db } from "@/app/lib/db";
import { isAdminRequest } from "@/app/lib/auth";
import type { NextRequest } from "next/server";

/**
 * 載入活動並套用通用守門規則，給 expenses / participants / repayments 共用。
 *
 * 一次查詢同時取回：
 *   - 活動是否存在（不存在 → 404）
 *   - isSettled：已結清的活動僅管理員可再變更（否則 → 403）
 *   - participants 的 id 清單：供後續驗證「成員確實屬於本活動」（修 IDOR）
 *
 * 回傳 { error } 時，呼叫端應直接 `return result.error`；
 * 回傳 { event } 時代表通過守門，可繼續處理。
 */
export async function loadMutableEvent(req: NextRequest, eventId: number) {
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return { error: Response.json({ error: "invalid_id" }, { status: 400 }) as Response };
  }

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, isSettled: true, participants: { select: { id: true } } },
  });

  if (!event) {
    return { error: Response.json({ error: "not_found" }, { status: 404 }) as Response };
  }
  if (event.isSettled && !isAdminRequest(req)) {
    return { error: Response.json({ error: "event_settled" }, { status: 403 }) as Response };
  }

  const participantIds = new Set(event.participants.map((p) => p.id));
  return { event, participantIds };
}
