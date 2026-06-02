import { db } from "@/app/lib/db";
import { emitEventUpdate } from "@/app/lib/emitter";
import { loadMutableEvent } from "@/app/lib/guard";
import { toId, cleanStr } from "@/app/lib/validate";
import type { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);

  const guard = await loadMutableEvent(req, eventId);
  if ("error" in guard) return guard.error;

  try {
    const body = await req.json();
    const name = cleanStr(body.name, 60);
    if (!name) return Response.json({ error: "invalid_input" }, { status: 400 });
    const emoji = cleanStr(body.emoji, 8) || "🙂";

    const participant = await db.participant.create({ data: { eventId, name, emoji } });
    emitEventUpdate(eventId, "participant_added");
    return Response.json(participant, { status: 201 });
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
    const participantId = toId(body.id);
    const name = cleanStr(body.name, 60);
    if (!participantId || !name) return Response.json({ error: "invalid_input" }, { status: 400 });
    const emoji = cleanStr(body.emoji, 8) || "🙂";

    // 限定該成員確實屬於本活動，避免跨活動竄改（IDOR）。
    if (!guard.participantIds.has(participantId)) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const participant = await db.participant.update({
      where: { id: participantId },
      data: { name, emoji },
    });
    emitEventUpdate(eventId, "participant_updated");
    return Response.json(participant);
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
    const participantId = toId((await req.json()).id);
    if (!participantId || !guard.participantIds.has(participantId)) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    // 成員若仍被任何「分攤 / 付款費用 / 還款」參照，刪除會觸發外鍵限制。
    // 先主動檢查並回 409，給前端清楚訊息，而不是讓 DB 丟出 500。
    const [shareCount, paidCount, repayCount] = await Promise.all([
      db.expenseShare.count({ where: { participantId } }),
      db.expense.count({ where: { paidById: participantId } }),
      db.repayment.count({ where: { OR: [{ fromId: participantId }, { toId: participantId }] } }),
    ]);
    if (shareCount + paidCount + repayCount > 0) {
      return Response.json({ error: "請先刪除該成員的相關費用與還款紀錄" }, { status: 409 });
    }

    await db.participant.delete({ where: { id: participantId } });
    emitEventUpdate(eventId, "participant_deleted");
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
