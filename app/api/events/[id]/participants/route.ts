import { db } from "@/app/lib/db";
import { emitEventUpdate } from "@/app/lib/emitter";
import type { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, emoji } = await req.json();
  const participant = await db.participant.create({
    data: { eventId: Number(id), name, emoji },
  });
  emitEventUpdate(Number(id), "participant_added");
  return Response.json(participant, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { id: participantId, name, emoji } = await req.json();
  const participant = await db.participant.update({
    where: { id: Number(participantId) },
    data: { name, emoji },
  });
  emitEventUpdate(Number(id), "participant_updated");
  return Response.json(participant);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { id: participantId } = await req.json();

  const share = await db.expenseShare.findFirst({
    where: { participantId: Number(participantId) },
  });
  if (share) {
    return Response.json({ error: "請先刪除該成員的相關費用" }, { status: 409 });
  }

  await db.participant.delete({ where: { id: Number(participantId) } });
  emitEventUpdate(Number(id), "participant_deleted");
  return new Response(null, { status: 204 });
}
