import { db } from "@/app/lib/db";
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
  return Response.json(participant, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  const { id: participantId } = await req.json();
  await db.participant.delete({ where: { id: Number(participantId) } });
  return new Response(null, { status: 204 });
}
