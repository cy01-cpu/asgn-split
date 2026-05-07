import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("isAdmin");
  return Response.json({ isAdmin: cookie?.value === "true" });
}
