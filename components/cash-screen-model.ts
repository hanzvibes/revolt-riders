export type Summary = {
  total_balance: number;
  income_this_month: number;
  expense_this_month: number;
  last_updated: string | null;
};
export type Account = {
  role: string;
  status: "pending" | "active" | "inactive";
  member_external_id: string;
};
export type Due = {
  id: string;
  member_external_id: string;
  period_label: string;
  amount_paid: number | string;
  recorded_at: string | null;
};
export type Transaction = {
  id: string;
  transaction_type: "income" | "expense" | "advance";
  transaction_date: string | null;
  description: string;
  category: string | null;
  amount: number;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
  source: "import" | "production";
};
export type TransactionRow = Omit<Transaction, "source" | "amount"> & {
  amount: number | string;
};
export type FilterType = "all" | "income" | "expense";
export type CashSnapshot = {
  summary: Summary | null;
  transactions: Transaction[];
  dues: Due[];
};

export const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export const isStaffRole = (role?: string) =>
  ["treasurer", "admin", "superadmin"].includes(role || "");
export const monthKey = (transaction: Transaction) =>
  (transaction.transaction_date || transaction.created_at).slice(0, 7);
export const monthLabel = (value: string) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(`${value}-01T00:00:00`),
  );
