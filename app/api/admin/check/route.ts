import type { NextRequest } from "next/server";
import { isAdminRequest } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  // 改用簽章驗證，而非比對固定字串。前端僅據此切換 UI；
  // 真正的權限把關在各變更路由內（不可只信任這支端點）。
  return Response.json({ isAdmin: isAdminRequest(req) });
}
