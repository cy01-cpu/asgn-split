import { db } from "@/app/lib/db";
import { emitEventUpdate } from "@/app/lib/emitter";
import type { NextRequest } from "next/server";

type ShareInput = { participantId: number; shareRatio: number; amount: number };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { paidById, title, amount, shares } = await req.json();

  const eventParticipants = await db.participant.findMany({
    where: { eventId: Number(id) },
    select: { id: true },
  });
  const validIds = new Set(eventParticipants.map((p) => p.id));
  const hasInvalid = (shares as ShareInput[]).some(
    (s) => !validIds.has(Number(s.participantId))
  );
  if (hasInvalid) {
    return Response.json({ error: "invalid_participant" }, { status: 400 });
  }

  const expense = await db.expense.create({
    data: {
      eventId: Number(id),
      paidById: Number(paidById),
      title,
      amount: Number(amount),
      shares: {
        create: (shares as ShareInput[]).map((s) => ({
          participantId: Number(s.participantId),
          shareRatio: s.shareRatio,
          amount: Number(s.amount),
        })),
      },
    },
    include: { shares: true },
  });
  emitEventUpdate(Number(id), "expense_added");
  return Response.json(expense, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { id: expenseId, paidById, title, amount, shares } = await req.json();

  const existing = await db.expense.findUnique({ where: { id: Number(expenseId) } });
  if (!existing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  await db.expenseShare.deleteMany({ where: { expenseId: Number(expenseId) } });
  const expense = await db.expense.update({
    where: { id: Number(expenseId) },
    data: {
      paidById: Number(paidById),
      title,
      amount: Number(amount),
      shares: {
        create: (shares as ShareInput[]).map((s) => ({
          participantId: Number(s.participantId),
          shareRatio: s.shareRatio,
          amount: Number(s.amount),
        })),
      },
    },
    include: { shares: true },
  });
  emitEventUpdate(Number(id), "expense_updated");
  return Response.json(expense);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { id: expenseId } = await req.json();

  const existing = await db.expense.findUnique({ where: { id: Number(expenseId) } });
  if (!existing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  await db.expenseShare.deleteMany({ where: { expenseId: Number(expenseId) } });
  await db.expense.delete({ where: { id: Number(expenseId) } });
  emitEventUpdate(Number(id), "expense_deleted");
  return new Response(null, { status: 204 });
}
