import { db } from "@/app/lib/db";
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
    participants.map((p) => [p.id, 0])
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

  const balances = participants.map((p) => ({
    participantId: p.id,
    name: p.name,
    emoji: p.emoji,
    balance: balanceMap.get(p.id) ?? 0,
  }));

  // 貪心最少轉帳
  type Entry = { participantId: number; name: string; emoji: string; amount: number };
  const creditors: Entry[] = [];
  const debtors: Entry[] = [];

  for (const b of balances) {
    if (b.balance > 0) creditors.push({ ...b, amount: b.balance });
    else if (b.balance < 0) debtors.push({ ...b, amount: -b.balance });
  }

  const settlements: {
    from: { participantId: number; name: string; emoji: string };
    to: { participantId: number; name: string; emoji: string };
    amount: number;
  }[] = [];

  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const transfer = Math.min(creditor.amount, debtor.amount);

    settlements.push({
      from: { participantId: debtor.participantId, name: debtor.name, emoji: debtor.emoji },
      to: { participantId: creditor.participantId, name: creditor.name, emoji: creditor.emoji },
      amount: transfer,
    });

    creditor.amount -= transfer;
    debtor.amount -= transfer;
    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }

  return Response.json({ settlements, balances });
}
