import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CashTransaction } from "./cash-data";

export async function createCashTransaction({
  userId,
  transactionDate,
  transactionType,
  category,
  amount,
  description,
}: {
  userId: string | null;
  transactionDate: string;
  transactionType: "income" | "expense";
  category: string;
  amount: string;
  description: string;
}) {
  if (!userId) {
    throw new Error("Sesi login tidak ditemukan.");
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Nominal kas harus lebih dari nol.");
  }

  const { error } = await getSupabaseBrowserClient()
    .from("club_cash_transactions")
    .insert({
      transaction_date: transactionDate,
      transaction_type: transactionType,
      category: category.trim(),
      amount: parsedAmount,
      description: description.trim(),
      created_by: userId,
    });

  if (error) throw error;
}

export async function voidCashTransaction({
  transactionId,
  reason,
}: {
  transactionId: string;
  reason: string;
}) {
  const { error } = await getSupabaseBrowserClient().rpc(
    "void_club_cash_transaction",
    {
      p_transaction_id: transactionId,
      p_reason: reason,
    },
  );

  if (error) throw error;
}

export function downloadCashLedger(
  transactions: CashTransaction[],
  period: string,
) {
  const cell = (value: string | number) =>
    '"' + String(value).replaceAll('"', '""') + '"';

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
    ...transactions.map((item) => [
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
    [
      "\ufeff",
      rows
        .map((row) => row.map(cell).join(","))
        .join("\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    "kas-revolt-" +
    (period === "all" ? "semua-periode" : period) +
    ".csv";
  link.click();
  URL.revokeObjectURL(url);
}
