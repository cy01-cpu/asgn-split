import { db } from "@/app/lib/db";
import { emitEventUpdate } from "@/app/lib/emitter";
import { loadMutableEvent } from "@/app/lib/guard";
import { toAmount, toId, cleanStr } from "@/app/lib/validate";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repayments = await db.repayment.findMany({
    where: { eventId: Number(id) },
    include: { fromParticipant: true, toParticipant: true },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(repayments);
}

// 驗證還款輸入：付款/收款人皆須屬於本活動、兩者不同、金額為正整數。
function parseRepayBody(
  body: { fromId?: unknown; toId?: unknown; amount?: unknown; note?: unknown },
  participantIds: Set<number>
) {
  const fromId = toId(body.fromId);
  const toId_ = toId(body.toId);
  const amount = toAmount(body.amount);
  if (!fromId || !toId_ || !amount) return null;
  if (fromId === toId_) return null;
  if (!participantIds.has(fromId) || !participantIds.has(toId_)) return null;
  return { fromId, toId: toId_, amount, note: cleanStr(body.note, 200) };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);

  const guard = await loadMutableEvent(req, eventId);
  if ("error" in guard) return guard.error;

  try {
    const data = parseRepayBody(await req.json(), guard.participantIds);
    if (!data) return Response.json({ error: "invalid_input" }, { status: 400 });

    const repayment = await db.repayment.create({
      data: { eventId, ...data },
      include: { fromParticipant: true, toParticipant: true },
    });
    emitEventUpdate(eventId, "repayment_added");
    return Response.json(repayment, { status: 201 });
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);

  const guard = await loadMutableEvent(req, eventId);
  if ("error" in guard) return guard.error;

  try {
    const body = await req.json();
    const repaymentId = toId(body.id);
    if (!repaymentId) return Response.json({ error: "invalid_input" }, { status: 400 });

    // 限定該還款紀錄屬於本活動，避免跨活動竄改（IDOR）。
    const existing = await db.repayment.findFirst({
      where: { id: repaymentId, eventId },
      select: { id: true },
    });
    if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

    const data = parseRepayBody(body, guard.participantIds);
    if (!data) return Response.json({ error: "invalid_input" }, { status: 400 });

    const repayment = await db.repayment.update({
      where: { id: repaymentId },
      data,
      include: { fromParticipant: true, toParticipant: true },
    });
    emitEventUpdate(eventId, "repayment_updated");
    return Response.json(repayment);
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);

  const guard = await loadMutableEvent(req, eventId);
  if ("error" in guard) return guard.error;

  try {
    const repaymentId = toId((await req.json()).id);
    if (!repaymentId) return Response.json({ error: "invalid_input" }, { status: 400 });

    // deleteMany + (id, eventId) 條件：限定範圍，且查無資料時 count 為 0 不會丟例外。
    const result = await db.repayment.deleteMany({ where: { id: repaymentId, eventId } });
    if (result.count === 0) return Response.json({ error: "not_found" }, { status: 404 });

    emitEventUpdate(eventId, "repayment_deleted");
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
