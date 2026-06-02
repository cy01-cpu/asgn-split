import { db } from "@/app/lib/db";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { cleanStr, toDate } from "@/app/lib/validate";

export async function GET() {
  const events = await db.event.findMany({
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isSettled: true,
      participants: { select: { id: true } },
      expenses: { select: { id: true, amount: true } },
    },
    orderBy: { startDate: "desc" },
  });
  return Response.json(events);
}

export async function POST(req: NextRequest) {
  // 依 .env 規格，建立活動屬管理員權限 — 過去完全未把關，任何人皆可建立。
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const name = cleanStr(body.name);
    const startDate = toDate(body.startDate);
    // endDate 為選填：沒給就是 null；有給就必須是合法日期，否則視為輸入錯誤。
    let endDate: Date | null = null;
    if (body.endDate != null) {
      endDate = toDate(body.endDate);
      if (!endDate) return Response.json({ error: "invalid_input" }, { status: 400 });
    }

    if (!name || !startDate) {
      return Response.json({ error: "invalid_input" }, { status: 400 });
    }
    if (endDate && endDate < startDate) {
      return Response.json({ error: "end_before_start" }, { status: 400 });
    }

    const event = await db.event.create({ data: { name, startDate, endDate } });
    return Response.json(event, { status: 201 });
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
