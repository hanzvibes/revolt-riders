"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  createCashTransaction,
  downloadCashLedger,
  voidCashTransaction,
} from "./cash-actions";
import {
  fetchCashSnapshot,
  type CashAccount,
  type CashDue,
  type CashSnapshot,
  type CashSummary,
  type CashTransaction,
} from "./cash-data";
import {
  deriveCashWorkspace,
  isCashStaffRole,
  type CashFilterType,
} from "./cash-model";

export function useCashScreenController() {
  const { promptAction } = useActionDialog();
  const {
    user,
    account: accessAccount,
    loading: accessLoading,
  } = useMemberAccess();
  const { fetchWithCache, invalidateCache } =
    useDataCache();

  const account = accessAccount as CashAccount | null;
  const userId = user?.id ?? null;
  const [summary, setSummary] =
    useState<CashSummary | null>(null);
  const [transactions, setTransactions] = useState<
    CashTransaction[]
  >([]);
  const [dues, setDues] = useState<CashDue[]>([]);
  const [message, setMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [type, setType] =
    useState<"income" | "expense">("income");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [period, setPeriod] = useState("all");
  const [filterType, setFilterType] =
    useState<CashFilterType>("all");
  const [query, setQuery] = useState("");

  const staff = isCashStaffRole(account?.role);

  const workspace = useMemo(
    () =>
      deriveCashWorkspace({
        transactions,
        dues,
        period,
        filterType,
        query,
      }),
    [dues, filterType, period, query, transactions],
  );

  const load = useCallback(
    async (forceRefresh = false) => {
      if (accessLoading) return;

      if (!forceRefresh) setLoadingData(true);

      if (!user) {
        setSummary(null);
        setTransactions([]);
        setDues([]);
        setMessage(
          "Masuk ke akun untuk melihat ringkasan Kas Revolt.",
        );
        setLoadingData(false);
        return;
      }

      if (!account || account.status !== "active") {
        setSummary(null);
        setTransactions([]);
        setDues([]);
        setMessage(
          "Akun member harus aktif untuk melihat Kas Revolt.",
        );
        setLoadingData(false);
        return;
      }

      setError("");

      try {
        const cacheKey =
          "cash:" +
          account.member_external_id +
          ":" +
          account.role;
        const snapshot =
          await fetchWithCache<CashSnapshot>(
            cacheKey,
            () => fetchCashSnapshot(account),
            {
              ttlMs: 30_000,
              forceRefresh,
            },
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
    },
    [
      accessLoading,
      account,
      fetchWithCache,
      user,
    ],
  );

  useEffect(() => {
    if (accessLoading) return;

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [accessLoading, load]);

  const refreshCash = useCallback(async () => {
    invalidateCache("cash:");
    invalidateCache("dashboard_club_stats");
    invalidateCache("admin_dashboard_overview");
    await load(true);
  }, [invalidateCache, load]);

  const addTransaction = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError("");
      setSuccess("");
      setSaving(true);

      try {
        await createCashTransaction({
          userId,
          transactionDate: date,
          transactionType: type,
          category,
          amount,
          description,
        });

        setSuccess(
          "Transaksi kas tersimpan dan saldo sudah diperbarui.",
        );
        setCategory("");
        setAmount("");
        setDescription("");
        setFormOpen(false);
        await refreshCash();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Transaksi belum bisa disimpan.",
        );
      } finally {
        setSaving(false);
      }
    },
    [
      amount,
      category,
      date,
      description,
      refreshCash,
      type,
      userId,
    ],
  );

  const voidTransaction = useCallback(
    async (transaction: CashTransaction) => {
      if (
        transaction.source !== "production" ||
        transaction.voided_at
      ) {
        return;
      }

      const reason = await promptAction({
        title: "Koreksi transaksi?",
        description:
          "Transaksi “" +
          transaction.description +
          "” tidak akan dihapus dari audit trail. Jelaskan alasan koreksinya.",
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
        await voidCashTransaction({
          transactionId: transaction.id,
          reason,
        });
        setSuccess(
          "Transaksi dikoreksi. Nilainya tidak lagi dihitung pada saldo kas.",
        );
        await refreshCash();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Transaksi belum dapat dikoreksi.",
        );
      }
    },
    [promptAction, refreshCash],
  );

  const downloadLedger = useCallback(() => {
    downloadCashLedger(
      workspace.visibleTransactions,
      period,
    );
  }, [period, workspace.visibleTransactions]);

  return {
    account,
    accessLoading,
    loadingData,
    summary,
    dues,
    message,
    error,
    success,
    type,
    date,
    category,
    amount,
    description,
    saving,
    formOpen,
    period,
    filterType,
    query,
    staff,
    periods: workspace.periods,
    visibleTransactions:
      workspace.visibleTransactions,
    flow: workspace.flow,
    categories: workspace.categories,
    maxCategory: workspace.maxCategory,
    duesTotal: workspace.duesTotal,
    setType,
    setDate,
    setCategory,
    setAmount,
    setDescription,
    setFormOpen,
    setPeriod,
    setFilterType,
    setQuery,
    addTransaction,
    voidTransaction,
    downloadLedger,
  };
}
