import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "密碼錯誤" }, { status: 401 });
  }
  const res = Response.json({ success: true });
  res.headers.set(
    "Set-Cookie",
    "isAdmin=true; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax"
  );
  return res;
}
