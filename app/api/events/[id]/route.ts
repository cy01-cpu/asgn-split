import { db } from "@/app/lib/db";
import type { NextRequest } from "next/server";

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
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    data.name = body.name.trim();
    data.startDate = new Date(body.startDate);
    data.endDate = body.endDate ? new Date(body.endDate) : null;
  }
  if (body.isSettled !== undefined) {
    data.isSettled = body.isSettled;
  }
  const event = await db.event.update({
    where: { id: Number(id) },
    data,
  });
  return Response.json(event);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = Number(id);

    const expenses = await db.expense.findMany({
      where: { eventId },
      select: { id: true },
    });
    const expenseIds = expenses.map((e) => e.id);

    await db.expenseShare.deleteMany({ where: { expenseId: { in: expenseIds } } });
    await db.expense.deleteMany({ where: { eventId } });
    await db.repayment.deleteMany({ where: { eventId } });
    await db.participant.deleteMany({ where: { eventId } });
    await db.event.delete({ where: { id: eventId } });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Delete event error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
