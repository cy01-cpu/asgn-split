// 活動明細頁共用型別
// 從 app/events/[id]/page.tsx 抽出，供 page 與各分頁/Modal 子元件共用。

export type Participant = { id: number; name: string; emoji: string };

export type ExpenseShare = {
  id: number;
  participantId: number;
  shareRatio: number;
  amount: number;
};

export type Expense = {
  id: number;
  title: string;
  amount: number;
  paidBy: Participant;
  paidById: number;
  shares: ExpenseShare[];
};

export type EventDetail = {
  id: number;
  name: string;
  startDate: string;
  endDate: string | null;
  isSettled: boolean;
  participants: Participant[];
  expenses: Expense[];
};

export type Balance = {
  participantId: number;
  name: string;
  emoji: string;
  balance: number;
};

export type Transfer = {
  from: { participantId: number; name: string; emoji: string };
  to: { participantId: number; name: string; emoji: string };
  amount: number;
};

export type SettlementData = { settlements: Transfer[]; balances: Balance[] };

export type Repayment = {
  id: number;
  fromId: number;
  toId: number;
  amount: number;
  note: string | null;
  createdAt: string;
  fromParticipant: Participant;
  toParticipant: Participant;
};

export type Tab = "members" | "expenses" | "settlement";
export type SplitMode = "equal" | "custom";
