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
  const { name, startDate, endDate } = await req.json();
  const event = await db.event.update({
    where: { id: Number(id) },
    data: {
      name: name.trim(),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
    },
  });
  return Response.json(event);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.event.delete({ where: { id: Number(id) } });
  return new Response(null, { status: 204 });
}
