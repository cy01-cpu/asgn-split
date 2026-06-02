import { NextResponse } from "next/server";
import { adminCookieOptions } from "@/app/lib/auth";

export async function POST() {
  // Max-Age 0 立即失效；屬性需與寫入時一致，瀏覽器才會正確覆蓋／清除。
  const res = NextResponse.json({ success: true });
  res.cookies.set({ ...adminCookieOptions(0), value: "" });
  return res;
}
