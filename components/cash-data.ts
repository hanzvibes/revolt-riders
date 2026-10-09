import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isCashStaffRole } from "./cash-model";

export type CashSummary = {
  total_balance: number;
  income_this_month: number;
  expense_this_month: number;
  last_updated: string | null;
};

export type CashAccount = {
  role: string;
  status: "pending" | "active" | "inactive";
  member_external_id: string;
};

export type CashDue = {
  id: string;
  member_external_id: string;
  period_label: string;
  amount_paid: number | string;
  recorded_at: string | null;
};

export type CashTransaction = {
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

type TransactionRow = Omit<
  CashTransaction,
  "source" | "amount"
> & {
  amount: number | string;
};

export type CashSnapshot = {
  summary: CashSummary | null;
  transactions: CashTransaction[];
  dues: CashDue[];
};

export async function fetchCashSnapshot(
  account: CashAccount,
): Promise<CashSnapshot> {
  const supabase = getSupabaseBrowserClient();

  if (isCashStaffRole(account.role)) {
    const [summaryResult, imported, production, dueResult] =
      await Promise.all([
        supabase.rpc("get_member_cash_summary"),
        supabase
          .from("cash_transactions")
          .select(
            "id,transaction_type,transaction_date,description,amount,created_at",
          )
          .order("transaction_date", { ascending: false })
          .limit(250),
        supabase
          .from("club_cash_transactions")
          .select(
            "id,transaction_type,transaction_date,category,description,amount,created_at,voided_at,void_reason",
          )
          .order("transaction_date", { ascending: false })
          .limit(250),
        supabase
          .from("member_dues")
          .select(
            "id,member_external_id,period_label,amount_paid,recorded_at",
          )
          .order("recorded_at", { ascending: false })
          .limit(250),
      ]);

    if (summaryResult.error) throw summaryResult.error;
    if (imported.error) throw imported.error;
    if (production.error) throw production.error;
    if (dueResult.error) throw dueResult.error;

    const importedRows = (
      (imported.data ?? []) as Omit<
        TransactionRow,
        "category" | "voided_at" | "void_reason"
      >[]
    ).map((row) => ({
      ...row,
      category: "Data awal",
      amount: Number(row.amount),
      voided_at: null,
      void_reason: null,
      source: "import" as const,
    }));

    const productionRows = (
      (production.data ?? []) as TransactionRow[]
    ).map((row) => ({
      ...row,
      amount: Number(row.amount),
      source: "production" as const,
    }));

    return {
      summary:
        (summaryResult.data?.[0] ?? null) as CashSummary | null,
      transactions: [...importedRows, ...productionRows],
      dues: (dueResult.data ?? []) as CashDue[],
    };
  }

  const [summaryResult, dueResult] = await Promise.all([
    supabase.rpc("get_member_cash_summary"),
    supabase
      .from("member_dues")
      .select(
        "id,member_external_id,period_label,amount_paid,recorded_at",
      )
      .eq("member_external_id", account.member_external_id)
      .order("recorded_at", { ascending: false })
      .limit(24),
  ]);

  if (summaryResult.error) throw summaryResult.error;
  if (dueResult.error) throw dueResult.error;

  return {
    summary:
      (summaryResult.data?.[0] ?? null) as CashSummary | null,
    transactions: [],
    dues: (dueResult.data ?? []) as CashDue[],
  };
}
