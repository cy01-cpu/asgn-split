import { NextResponse, type NextRequest } from "next/server";
import { createAdminToken, adminCookieOptions, ADMIN_COOKIE_MAX_AGE } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return Response.json({ error: "格式錯誤" }, { status: 400 });
  }

  // 後端沒設密碼時，拒絕所有登入（避免空字串密碼意外通過）。
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof password !== "string" || password !== expected) {
    return Response.json({ error: "密碼錯誤" }, { status: 401 });
  }

  // 改寫入「已簽章的 token」而非固定字串，cookie 屬性集中由 auth 管理。
  const res = NextResponse.json({ success: true });
  res.cookies.set({ ...adminCookieOptions(ADMIN_COOKIE_MAX_AGE), value: createAdminToken() });
  return res;
}
