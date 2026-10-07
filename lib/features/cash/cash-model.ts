export type CashTransactionLike = {
  transaction_date: string | null;
  created_at: string;
  transaction_type: "income" | "expense";
  description: string;
  category: string | null;
  amount: number;
  voided_at: string | null;
};

export type CashFilterType = "all" | "income" | "expense";

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function isCashStaffRole(role?: string) {
  return ["treasurer", "admin", "superadmin"].includes(role || "");
}

export function getCashMonthKey(transaction: Pick<CashTransactionLike, "transaction_date" | "created_at">) {
  return (transaction.transaction_date || transaction.created_at).slice(0, 7);
}

export function getCashMonthLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(`${value}-01T00:00:00`),
  );
}

export function filterCashTransactions<T extends CashTransactionLike>(
  transactions: readonly T[],
  options: { period: string; type: CashFilterType; query: string; limit?: number },
): T[] {
  const normalizedQuery = options.query.trim().toLowerCase();
  return [...transactions]
    .sort((a, b) =>
      `${b.transaction_date || ""}${b.created_at}`.localeCompare(
        `${a.transaction_date || ""}${a.created_at}`,
      ),
    )
    .filter((transaction) => {
      const matchesPeriod =
        options.period === "all" || getCashMonthKey(transaction) === options.period;
      const matchesType =
        options.type === "all" || transaction.transaction_type === options.type;
      const haystack = `${transaction.description} ${transaction.category || ""}`.toLowerCase();
      return matchesPeriod && matchesType && haystack.includes(normalizedQuery);
    })
    .slice(0, options.limit ?? 50);
}

export function calculateCashFlow(transactions: readonly CashTransactionLike[]) {
  return transactions
    .filter((transaction) => !transaction.voided_at)
    .reduce(
      (total, transaction) => {
        if (transaction.transaction_type === "income") total.income += transaction.amount;
        else total.expense += transaction.amount;
        return total;
      },
      { income: 0, expense: 0 },
    );
}

export function calculateExpenseCategories(transactions: readonly CashTransactionLike[]) {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.voided_at || transaction.transaction_type === "income") continue;
    const label = transaction.category || "Lainnya";
    totals.set(label, (totals.get(label) || 0) + transaction.amount);
  }
  return Array.from(totals, ([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}
