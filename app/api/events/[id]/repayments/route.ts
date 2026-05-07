import { db } from "@/app/lib/db";
import { emitEventUpdate } from "@/app/lib/emitter";
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { fromId, toId, amount, note } = await req.json();
  const repayment = await db.repayment.create({
    data: {
      eventId: Number(id),
      fromId: Number(fromId),
      toId: Number(toId),
      amount: Number(amount),
      note: note?.trim() || null,
    },
    include: { fromParticipant: true, toParticipant: true },
  });
  emitEventUpdate(Number(id), "repayment_added");
  return Response.json(repayment, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { id: repaymentId, fromId, toId, amount, note } = await req.json();
  const repayment = await db.repayment.update({
    where: { id: Number(repaymentId) },
    data: {
      fromId: Number(fromId),
      toId: Number(toId),
      amount: Number(amount),
      note: note?.trim() || null,
    },
    include: { fromParticipant: true, toParticipant: true },
  });
  emitEventUpdate(Number(id), "repayment_updated");
  return Response.json(repayment);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { id: repaymentId } = await req.json();
  await db.repayment.delete({ where: { id: Number(repaymentId) } });
  emitEventUpdate(Number(id), "repayment_deleted");
  return new Response(null, { status: 204 });
}
