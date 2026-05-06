import { db } from "@/app/lib/db";
import type { NextRequest } from "next/server";

export async function GET() {
  const events = await db.event.findMany({
    include: { participants: true, expenses: true },
    orderBy: { date: "desc" },
  });
  return Response.json(events);
}

export async function POST(req: NextRequest) {
  const { name, date } = await req.json();
  const event = await db.event.create({
    data: { name, date: new Date(date) },
  });
  return Response.json(event, { status: 201 });
}
