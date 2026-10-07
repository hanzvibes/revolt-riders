"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Summary, Account, Due, Transaction, TransactionRow, FilterType, CashSnapshot, isStaffRole, monthKey } from "./cash-screen-model";

export function useCashScreen() {

  const { promptAction } = useActionDialog();
  const { user, account: accessAccount, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache, invalidateCache } = useDataCache();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [message, setMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [type, setType] = useState<"income" | "expense">("income");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [period, setPeriod] = useState("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [query, setQuery] = useState("");

  const staff = isStaffRole(account?.role);
  const sortedTransactions = useMemo(
    () =>
      transactions
        .slice()
        .sort((a, b) =>
          `${b.transaction_date || ""}${b.created_at}`.localeCompare(
            `${a.transaction_date || ""}${a.created_at}`,
          ),
        ),
    [transactions],
  );
  const periods = useMemo(
    () => Array.from(new Set(sortedTransactions.map(monthKey))).filter(Boolean),
    [sortedTransactions],
  );
  const visibleTransactions = useMemo(
    () =>
      sortedTransactions
        .filter((transaction) => {
          const matchesPeriod =
            period === "all" || monthKey(transaction) === period;
          const matchesType =
            filterType === "all" || transaction.transaction_type === filterType;
          const haystack =
            `${transaction.description} ${transaction.category || ""}`.toLowerCase();
          return (
            matchesPeriod &&
            matchesType &&
            haystack.includes(query.trim().toLowerCase())
          );
        })
        .slice(0, 50),
    [filterType, period, query, sortedTransactions],
  );
  const flow = useMemo(
    () =>
      visibleTransactions
        .filter((transaction) => !transaction.voided_at)
        .reduce(
          (total, transaction) => {
            if (transaction.transaction_type === "income")
              total.income += transaction.amount;
            else total.expense += transaction.amount;
            return total;
          },
          { income: 0, expense: 0 },
        ),
    [visibleTransactions],
  );
  const categories = useMemo(() => {
    const totals = new Map<string, number>();
    visibleTransactions
      .filter(
        (transaction) =>
          !transaction.voided_at && transaction.transaction_type !== "income",
      )
      .forEach((transaction) => {
        const label = transaction.category || "Lainnya";
        totals.set(label, (totals.get(label) || 0) + transaction.amount);
      });
    return Array.from(totals, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [visibleTransactions]);
  const maxCategory = categories[0]?.value || 1;
  const duesTotal = useMemo(
    () => dues.reduce((total, due) => total + Number(due.amount_paid), 0),
    [dues],
  );

  const load = useCallback(async (forceRefresh = false) => {
    if (accessLoading) return;

    if (!forceRefresh) setLoadingData(true);

    if (!user) {
      setAccount(null);
      setSummary(null);
      setTransactions([]);
      setDues([]);
      setMessage("Masuk ke akun untuk melihat ringkasan Kas Revolt.");
      setLoadingData(false);
      return;
    }

    const nextAccount = accessAccount as Account | null;
    setAccount(nextAccount);

    if (!nextAccount || nextAccount.status !== "active") {
      setSummary(null);
      setTransactions([]);
      setDues([]);
      setMessage("Akun member harus aktif untuk melihat Kas Revolt.");
      setLoadingData(false);
      return;
    }

    setError("");
    try {
      const cacheKey = `cash:${nextAccount.member_external_id}:${nextAccount.role}`;
      const snapshot = await fetchWithCache<CashSnapshot>(
        cacheKey,
        async () => {
          const supabase = getSupabaseBrowserClient();

          if (isStaffRole(nextAccount.role)) {
            const [summaryResult, imported, production, dueResult] = await Promise.all([
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
                .select("id,member_external_id,period_label,amount_paid,recorded_at")
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
            const productionRows = ((production.data ?? []) as TransactionRow[]).map(
              (row) => ({
                ...row,
                amount: Number(row.amount),
                source: "production" as const,
              }),
            );

            return {
              summary: (summaryResult.data?.[0] ?? null) as Summary | null,
              transactions: [...importedRows, ...productionRows],
              dues: (dueResult.data ?? []) as Due[],
            };
          }

          const [summaryResult, dueResult] = await Promise.all([
            supabase.rpc("get_member_cash_summary"),
            supabase
              .from("member_dues")
              .select("id,member_external_id,period_label,amount_paid,recorded_at")
              .eq("member_external_id", nextAccount.member_external_id)
              .order("recorded_at", { ascending: false })
              .limit(24),
          ]);

          if (summaryResult.error) throw summaryResult.error;
          if (dueResult.error) throw dueResult.error;

          return {
            summary: (summaryResult.data?.[0] ?? null) as Summary | null,
            transactions: [],
            dues: (dueResult.data ?? []) as Due[],
          };
        },
        { ttlMs: 30_000, forceRefresh },
      );

      setSummary(snapshot.summary);
      setTransactions(snapshot.transactions);
      setDues(snapshot.dues);
      setMessage("");
    } catch (caught) {
      setMessage("Ringkasan kas belum dapat dimuat.");
      setError(
        caught instanceof Error
          ? caught.message
          : "Terjadi masalah saat membaca kas.",
      );
    } finally {
      setLoadingData(false);
    }
  }, [accessAccount, accessLoading, fetchWithCache, user]);

  useEffect(() => {
    if (accessLoading) return;
    void load();
  }, [accessLoading, load]);

  const addTransaction = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!user) throw new Error("Sesi login tidak ditemukan.");
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
        throw new Error("Nominal kas harus lebih dari nol.");
      const { error: insertError } = await supabase
        .from("club_cash_transactions")
        .insert({
          transaction_date: date,
          transaction_type: type,
          category: category.trim(),
          amount: parsedAmount,
          description: description.trim(),
          created_by: user.id,
        });
      if (insertError) throw insertError;
      setSuccess("Transaksi kas tersimpan dan saldo sudah diperbarui.");
      setCategory("");
      setAmount("");
      setDescription("");
      setFormOpen(false);
      invalidateCache("cash:");
      invalidateCache("dashboard_club_stats");
      invalidateCache("admin_dashboard_overview");
      await load(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Transaksi belum bisa disimpan.",
      );
    } finally {
      setSaving(false);
    }
  };

  const voidTransaction = async (transaction: Transaction) => {
    if (transaction.source !== "production" || transaction.voided_at) return;
    const reason = await promptAction({
      title: "Koreksi transaksi?",
      description: `Transaksi “${transaction.description}” tidak akan dihapus dari audit trail. Jelaskan alasan koreksinya.`,
      confirmLabel: "Koreksi Transaksi",
      cancelLabel: "Batal",
      destructive: true,
      placeholder: "Alasan koreksi...",
    });
    if (reason === null) return;
    if (!reason.trim()) {
      setError("Alasan koreksi wajib diisi.");
      return;
    }
    setError("");
    setSuccess("");
    try {
      const { error: voidError } = await getSupabaseBrowserClient().rpc(
        "void_club_cash_transaction",
        { p_transaction_id: transaction.id, p_reason: reason },
      );
      if (voidError) throw voidError;
      setSuccess(
        "Transaksi dikoreksi. Nilainya tidak lagi dihitung pada saldo kas.",
      );
      invalidateCache("cash:");
      invalidateCache("dashboard_club_stats");
      invalidateCache("admin_dashboard_overview");
      await load(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Transaksi belum dapat dikoreksi.",
      );
    }
  };

  const downloadLedger = () => {
    const cell = (value: string | number) =>
      `"${String(value).replaceAll('"', '""')}"`;
    const rows = [
      [
        "Tanggal",
        "Tipe",
        "Kategori",
        "Keterangan",
        "Nominal",
        "Status",
        "Alasan koreksi",
      ],
      ...visibleTransactions.map((item) => [
        item.transaction_date || "",
        item.transaction_type,
        item.category || "",
        item.description,
        item.amount,
        item.voided_at ? "Dikoreksi" : "Aktif",
        item.void_reason || "",
      ]),
    ];
    const blob = new Blob(
      ["\ufeff", rows.map((row) => row.map(cell).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kas-revolt-${period === "all" ? "semua-periode" : period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };


  return { accessLoading, summary, account, transactions, dues, message, loadingData, error, success, type, setType, date, setDate, category, setCategory, amount, setAmount, description, setDescription, saving, formOpen, setFormOpen, period, setPeriod, filterType, setFilterType, query, setQuery, staff, periods, visibleTransactions, flow, categories, maxCategory, duesTotal, addTransaction, voidTransaction, downloadLedger };

}
