export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  limitAmount: number;
  month: string;
  createdAt: string;
}

// Debt Management

export type DebtType = "borrowed" | "lent";

export type DebtStatus =
  | "pending"
  | "partial"
  | "paid"
  | "overdue";

export interface DebtPayment {
  id: string;
  debtId: string;
  userId: string;
  amount: number;
  paymentDate: string;
  note: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  userId: string;
  personName: string;
  type: DebtType;
  principalAmount: number;
  paidAmount: number;
  description: string;
  startDate: string;
  dueDate: string | null;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string;
  payments: DebtPayment[];
  remainingAmount: number;
  archivedAt: string | null;
}

export interface DebtOverview {
  totalBorrowed: number;
  totalLent: number;
  remainingBorrowed: number;
  remainingLent: number;
}