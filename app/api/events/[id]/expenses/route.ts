import { db } from "@/app/lib/db";
import type { NextRequest } from "next/server";

type ShareInput = { participantId: number; shareRatio: number; amount: number };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { paidById, title, amount, shares } = await req.json();
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
  return Response.json(expense, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  const { id: expenseId, paidById, title, amount, shares } = await req.json();
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
  return Response.json(expense);
}

export async function DELETE(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  const { id: expenseId } = await req.json();
  await db.expenseShare.deleteMany({ where: { expenseId: Number(expenseId) } });
  await db.expense.delete({ where: { id: Number(expenseId) } });
  return new Response(null, { status: 204 });
}
