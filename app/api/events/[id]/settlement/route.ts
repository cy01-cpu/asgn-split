import { db } from "@/app/lib/db";
import { calcSettlement } from "@/lib/settlement";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);

  const [expenses, participants, repayments] = await Promise.all([
    db.expense.findMany({ where: { eventId }, include: { shares: true } }),
    db.participant.findMany({ where: { eventId } }),
    db.repayment.findMany({ where: { eventId } }),
  ]);

  // 每人淨餘額（正 = 被欠錢，負 = 欠人錢）
  const balanceMap = new Map<number, number>(
    participants.map((p: { id: number }) => [p.id, 0] as [number, number])
  );

  for (const expense of expenses) {
    balanceMap.set(
      expense.paidById,
      (balanceMap.get(expense.paidById) ?? 0) + expense.amount
    );
    for (const share of expense.shares) {
      balanceMap.set(
        share.participantId,
        (balanceMap.get(share.participantId) ?? 0) - share.amount
      );
    }
  }

  // 還款調整：還款者欠款減少（+），收款者被欠減少（-）
  for (const r of repayments) {
    balanceMap.set(r.fromId, (balanceMap.get(r.fromId) ?? 0) + r.amount);
    balanceMap.set(r.toId, (balanceMap.get(r.toId) ?? 0) - r.amount);
  }

  const balances = participants.map((p: { id: number; name: string; emoji: string }) => ({
    participantId: p.id,
    name: p.name,
    emoji: p.emoji,
    balance: balanceMap.get(p.id) ?? 0,
  }));

  // 貪心最小轉帳邏輯抽到 lib/settlement.ts（純函式、可單測）。
  const balanceRecord: Record<number, number> = {};
  for (const [pid, bal] of balanceMap) balanceRecord[pid] = bal;
  const transfers = calcSettlement(
    participants as { id: number; name: string; emoji: string }[],
    balanceRecord
  );

  // calcSettlement 以名稱表示 from/to；補回 participantId/emoji 維持既有 API 形狀。
  // 同活動內成員名稱唯一（新增成員時已去重），故以名稱對應安全。
  const byName = new Map(balances.map((b) => [b.name, b]));
  const settlements = transfers.map((t) => {
    const from = byName.get(t.from)!;
    const to = byName.get(t.to)!;
    return {
      from: { participantId: from.participantId, name: from.name, emoji: from.emoji },
      to: { participantId: to.participantId, name: to.name, emoji: to.emoji },
      amount: t.amount,
    };
  });

  return Response.json({ settlements, balances });
}
