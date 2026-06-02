import crypto from "crypto";
import type { NextRequest } from "next/server";

/**
 * 管理員 Session（簽章式 cookie）
 * ------------------------------------------------------------------
 * 原本的做法是直接寫入 `isAdmin=true` 這個固定字串，任何人用
 *   curl --cookie "isAdmin=true" ...
 * 就能偽造管理員身分，等於完全沒有保護。
 *
 * 這裡改用 HMAC-SHA256 對「含到期時間的 payload」簽章：
 *   token = base64url(payload) + "." + base64url(HMAC(payload, secret))
 * 沒有 secret 就算不出合法簽章，因此無法偽造；驗證時用定時比較
 * （timingSafeEqual）避免時序側信道。完全使用 Node 內建 crypto，
 * 不新增任何相依套件。
 */

const COOKIE_NAME = "isAdmin";
// Session 有效期 7 天，與原本 cookie 的 Max-Age 一致。
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

type AdminPayload = { role: "admin"; exp: number };

// 簽章金鑰來源：優先用獨立的 SESSION_SECRET，否則退回 ADMIN_PASSWORD。
// 用 ADMIN_PASSWORD 當金鑰的副作用是「改密碼即讓所有舊 session 失效」，
// 對這種小型工具反而是合理的安全預設。
function getSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(payloadB64: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

/** 產生一枚已簽章、含到期時間的管理員 token，供登入成功後寫入 cookie。 */
export function createAdminToken(): string {
  const secret = getSecret();
  const payload: AdminPayload = {
    role: "admin",
    exp: Date.now() + ADMIN_COOKIE_MAX_AGE * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

/** 驗證請求是否來自合法管理員（簽章正確且未過期）。 */
export function isAdminRequest(req: NextRequest): boolean {
  const secret = getSecret();
  // 後端未設定密碼時一律視為未授權，避免「空字串金鑰」被當成有效設定。
  if (!secret) return false;

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;

  // 先驗章：長度不同會讓 timingSafeEqual 直接丟例外，故先比長度。
  const expected = sign(payloadB64, secret);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  // 章對了再解 payload，確認角色與是否過期。
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as AdminPayload;
    return payload.role === "admin" && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * 路由守門：非管理員時回傳 401 Response，否則回傳 null。
 * 用法：`const denied = requireAdmin(req); if (denied) return denied;`
 */
export function requireAdmin(req: NextRequest): Response | null {
  if (!isAdminRequest(req)) {
    return Response.json({ error: "需要管理員權限" }, { status: 401 });
  }
  return null;
}

/** 統一 cookie 屬性：HttpOnly 防 XSS 竊取、production 加 Secure、SameSite=Lax 防 CSRF。 */
export function adminCookieOptions(maxAge: number) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
