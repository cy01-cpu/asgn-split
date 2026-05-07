import { db } from "@/app/lib/db";
import type { NextRequest } from "next/server";

export async function GET() {
  const events = await db.event.findMany({
    include: { participants: true, expenses: true },
    orderBy: { startDate: "desc" },
  });
  return Response.json(events);
}

export async function POST(req: NextRequest) {
  const { name, startDate, endDate } = await req.json();
  const event = await db.event.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
    },
  });
  return Response.json(event, { status: 201 });
}
