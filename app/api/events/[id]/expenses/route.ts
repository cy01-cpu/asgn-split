import { db } from "@/app/lib/db";
import { emitEventUpdate } from "@/app/lib/emitter";
import { loadMutableEvent } from "@/app/lib/guard";
import { toAmount, toNonNegInt, toId, cleanStr } from "@/app/lib/validate";
import type { NextRequest } from "next/server";

type ShareInput = { participantId: number; shareRatio: number; amount: number };

/**
 * 驗證並正規化一筆費用的輸入。
 * 重點防呆：
 *   - 標題非空、金額為正整數
 *   - 付款人 paidById 必須屬於本活動（原本完全沒驗，可跨活動指定）
 *   - 每位分攤者皆屬於本活動，且分攤金額為正整數
 *   - 分攤金額總和必須等於費用總額 → 保證結算時帳目零和、不會有殘額被吃掉
 */
function parseExpenseBody(
  body: { paidById?: unknown; title?: unknown; amount?: unknown; shares?: unknown },
  participantIds: Set<number>
): { ok: true; data: { paidById: number; title: string; amount: number; shares: ShareInput[] } } | { ok: false } {
  const paidById = toId(body.paidById);
  const title = cleanStr(body.title);
  const amount = toAmount(body.amount);
  if (!paidById || !title || !amount || !participantIds.has(paidById)) return { ok: false };
  if (!Array.isArray(body.shares) || body.shares.length === 0) return { ok: false };

  const shares: ShareInput[] = [];
  const seen = new Set<number>();
  let sum = 0;
  for (const raw of body.shares) {
    const pid = toId(raw?.participantId);
    const amt = toNonNegInt(raw?.amount); // 個別分攤可為 0（小額平均分攤的情形）
    const ratio = Number(raw?.shareRatio);
    if (pid === null || amt === null || !participantIds.has(pid) || !isFinite(ratio)) return { ok: false };
    if (seen.has(pid)) return { ok: false }; // 同一成員不可重複出現
    seen.add(pid);
    shares.push({ participantId: pid, amount: amt, shareRatio: ratio });
    sum += amt;
  }
  // 分攤總和必須剛好等於費用金額，否則拒絕（前端已會湊整，這裡是最後防線）。
  if (sum !== amount) return { ok: false };

  return { ok: true, data: { paidById, title, amount, shares } };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);

  // 守門：活動須存在、未結清（或具管理員身分），並取回成員清單供驗證。
  const guard = await loadMutableEvent(req, eventId);
  if ("error" in guard) return guard.error;

  try {
    const parsed = parseExpenseBody(await req.json(), guard.participantIds);
    if (!parsed.ok) return Response.json({ error: "invalid_input" }, { status: 400 });
    const { paidById, title, amount, shares } = parsed.data;

    const expense = await db.expense.create({
      data: {
        eventId,
        paidById,
        title,
        amount,
        shares: { create: shares },
      },
      include: { shares: true },
    });
    emitEventUpdate(eventId, "expense_added");
    return Response.json(expense, { status: 201 });
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);

  const guard = await loadMutableEvent(req, eventId);
  if ("error" in guard) return guard.error;

  try {
    const body = await req.json();
    const expenseId = toId(body.id);
    if (!expenseId) return Response.json({ error: "invalid_input" }, { status: 400 });

    // 以 (id + eventId) 限定，避免跨活動竄改別人的費用（IDOR）。
    const existing = await db.expense.findFirst({
      where: { id: expenseId, eventId },
      select: { id: true },
    });
    if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = parseExpenseBody(body, guard.participantIds);
    if (!parsed.ok) return Response.json({ error: "invalid_input" }, { status: 400 });
    const { paidById, title, amount, shares } = parsed.data;

    // 刪舊分攤 + 寫新資料包進同一交易，避免刪到一半失敗造成分攤遺失。
    const [, expense] = await db.$transaction([
      db.expenseShare.deleteMany({ where: { expenseId } }),
      db.expense.update({
        where: { id: expenseId },
        data: { paidById, title, amount, shares: { create: shares } },
        include: { shares: true },
      }),
    ]);
    emitEventUpdate(eventId, "expense_updated");
    return Response.json(expense);
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);

  const guard = await loadMutableEvent(req, eventId);
  if ("error" in guard) return guard.error;

  try {
    const expenseId = toId((await req.json()).id);
    if (!expenseId) return Response.json({ error: "invalid_input" }, { status: 400 });

    // 同樣以 (id + eventId) 限定範圍。ExpenseShare 對 Expense 設了 onDelete: Cascade，
    // 因此刪除 expense 會自動連帶清掉其分攤，無需手動 deleteMany。
    const result = await db.expense.deleteMany({ where: { id: expenseId, eventId } });
    if (result.count === 0) return Response.json({ error: "not_found" }, { status: 404 });

    emitEventUpdate(eventId, "expense_deleted");
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
