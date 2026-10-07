import type {
  CashDue,
  CashTransaction,
} from "./cash-data";

export type CashFilterType = "all" | "income" | "expense";

export const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export const isCashStaffRole = (role?: string) =>
  ["treasurer", "admin", "superadmin"].includes(role || "");

export const cashMonthKey = (transaction: CashTransaction) =>
  (
    transaction.transaction_date ||
    transaction.created_at
  ).slice(0, 7);

export const cashMonthLabel = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(value + "-01T00:00:00"));

export function deriveCashWorkspace({
  transactions,
  dues,
  period,
  filterType,
  query,
}: {
  transactions: CashTransaction[];
  dues: CashDue[];
  period: string;
  filterType: CashFilterType;
  query: string;
}) {
  const sortedTransactions = transactions
    .slice()
    .sort((a, b) =>
      (
        (b.transaction_date || "") + b.created_at
      ).localeCompare(
        (a.transaction_date || "") + a.created_at,
      ),
    );

  const periods = Array.from(
    new Set(sortedTransactions.map(cashMonthKey)),
  ).filter(Boolean);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleTransactions = sortedTransactions
    .filter((transaction) => {
      const matchesPeriod =
        period === "all" ||
        cashMonthKey(transaction) === period;
      const matchesType =
        filterType === "all" ||
        transaction.transaction_type === filterType;
      const haystack = (
        transaction.description +
        " " +
        (transaction.category || "")
      ).toLowerCase();

      return (
        matchesPeriod &&
        matchesType &&
        haystack.includes(normalizedQuery)
      );
    })
    .slice(0, 50);

  const flow = visibleTransactions
    .filter((transaction) => !transaction.voided_at)
    .reduce(
      (total, transaction) => {
        if (transaction.transaction_type === "income") {
          total.income += transaction.amount;
        } else {
          total.expense += transaction.amount;
        }
        return total;
      },
      { income: 0, expense: 0 },
    );

  const categoryTotals = new Map<string, number>();
  visibleTransactions
    .filter(
      (transaction) =>
        !transaction.voided_at &&
        transaction.transaction_type !== "income",
    )
    .forEach((transaction) => {
      const label = transaction.category || "Lainnya";
      categoryTotals.set(
        label,
        (categoryTotals.get(label) || 0) +
          transaction.amount,
      );
    });

  const categories = Array.from(
    categoryTotals,
    ([label, value]) => ({ label, value }),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    periods,
    visibleTransactions,
    flow,
    categories,
    maxCategory: categories[0]?.value || 1,
    duesTotal: dues.reduce(
      (total, due) => total + Number(due.amount_paid),
      0,
    ),
  };
}
