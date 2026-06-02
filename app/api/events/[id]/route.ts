import { db } from "@/app/lib/db";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/app/lib/auth";
import { cleanStr, toDate, toId } from "@/app/lib/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id: Number(id) },
    include: {
      participants: true,
      expenses: {
        include: {
          paidBy: true,
          shares: true,
        },
      },
    },
  });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(event);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 編輯活動資料與「帳目兩訖」切換皆屬管理員權限（原本任何人可改 isSettled）。
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const eventId = toId(id);
  if (!eventId) return Response.json({ error: "invalid_id" }, { status: 400 });

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = cleanStr(body.name);
      const startDate = toDate(body.startDate);
      if (!name || !startDate) {
        return Response.json({ error: "invalid_input" }, { status: 400 });
      }
      let endDate: Date | null = null;
      if (body.endDate != null) {
        endDate = toDate(body.endDate);
        if (!endDate) return Response.json({ error: "invalid_input" }, { status: 400 });
      }
      if (endDate && endDate < startDate) {
        return Response.json({ error: "end_before_start" }, { status: 400 });
      }
      data.name = name;
      data.startDate = startDate;
      data.endDate = endDate;
    }

    if (body.isSettled !== undefined) {
      data.isSettled = Boolean(body.isSettled);
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "nothing_to_update" }, { status: 400 });
    }

    const event = await db.event.update({ where: { id: eventId }, data });
    return Response.json(event);
  } catch {
    // 包含 Prisma P2025（查無此活動）等情況，一律回 404/500 而非洩漏堆疊。
    return Response.json({ error: "update_failed" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 刪除整個活動屬管理員權限（原本任何人可刪除任意活動）。
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const eventId = Number(id);

    // 用單一交易包住連鎖刪除，避免中途失敗留下半刪除的孤兒資料。
    await db.$transaction([
      db.expenseShare.deleteMany({ where: { expense: { eventId } } }),
      db.expense.deleteMany({ where: { eventId } }),
      db.repayment.deleteMany({ where: { eventId } }),
      db.participant.deleteMany({ where: { eventId } }),
      db.event.delete({ where: { id: eventId } }),
    ]);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Delete event error:", error);
    return Response.json({ error: "delete_failed" }, { status: 500 });
  }
}
