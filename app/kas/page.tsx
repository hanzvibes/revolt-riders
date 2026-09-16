"use client";

import { AppShell } from "@/components/app-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CheckCircle2, CircleDollarSign, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Summary = { total_balance: number; income_this_month: number; expense_this_month: number; last_updated: string | null };
type Account = { role: string; status: "pending" | "active" | "inactive" };
type Transaction = { id: string; transaction_type: "income" | "expense" | "advance"; transaction_date: string | null; description: string; amount: number; created_at: string; source: "import" | "production" };
type TransactionRow = Omit<Transaction, "source" | "amount"> & { amount: number | string };

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const isStaffRole = (role?: string) => ["treasurer", "admin", "superadmin"].includes(role || "");

export default function CashPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [message, setMessage] = useState("Memuat ringkasan kas…");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [type, setType] = useState<"income" | "expense">("income");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const staff = isStaffRole(account?.role);
  const visibleTransactions = useMemo(() => transactions.slice().sort((a, b) => `${b.transaction_date || ""}${b.created_at}`.localeCompare(`${a.transaction_date || ""}${a.created_at}`)).slice(0, 25), [transactions]);

  const load = async () => {
    let authenticated = true;
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        authenticated = false;
        setMessage("Masuk ke akun untuk melihat ringkasan Kas Revolt.");
        return;
      }
      const { data: accountData, error: accountError } = await supabase.from("member_accounts").select("role,status").eq("user_id", user.id).maybeSingle();
      if (accountError) throw accountError;
      const nextAccount = accountData as Account | null;
      setAccount(nextAccount);
      if (nextAccount?.status !== "active") {
        setSummary(null);
        setMessage("Akun member harus aktif untuk melihat Kas Revolt.");
        return;
      }
      const { data: summaryData, error: summaryError } = await supabase.rpc("get_member_cash_summary");
      if (summaryError) throw summaryError;
      setSummary((summaryData?.[0] ?? null) as Summary | null);
      if (nextAccount.status === "active" && isStaffRole(nextAccount.role)) {
        const [imported, production] = await Promise.all([
          supabase.from("cash_transactions").select("id,transaction_type,transaction_date,description,amount,created_at").order("transaction_date", { ascending: false }).limit(100),
          supabase.from("club_cash_transactions").select("id,transaction_type,transaction_date,description,amount,created_at").order("transaction_date", { ascending: false }).limit(100),
        ]);
        if (imported.error) throw imported.error;
        if (production.error) throw production.error;
        setTransactions([
          ...((imported.data ?? []) as TransactionRow[]).map((row: TransactionRow) => ({ ...row, amount: Number(row.amount), source: "import" as const })),
          ...((production.data ?? []) as TransactionRow[]).map((row: TransactionRow) => ({ ...row, amount: Number(row.amount), source: "production" as const })),
        ] as Transaction[]);
      } else {
        setTransactions([]);
      }
      setMessage("");
    } catch (caught) {
      setMessage("Ringkasan kas belum dapat dimuat.");
      if (authenticated) setError(caught instanceof Error ? caught.message : "Terjadi masalah saat membaca kas.");
    }
  };

  useEffect(() => { void load(); }, []);

  const addTransaction = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi login tidak ditemukan.");
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) throw new Error("Nominal kas harus lebih dari nol.");
      const { error: insertError } = await supabase.from("club_cash_transactions").insert({
        transaction_date: date,
        transaction_type: type,
        category: category.trim(),
        amount: parsedAmount,
        description: description.trim(),
        created_by: user.id,
      });
      if (insertError) throw insertError;
      setSuccess("Transaksi kas tersimpan dan saldo sudah diperbarui.");
      setCategory(""); setAmount(""); setDescription("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Transaksi belum bisa disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return <AppShell active="Kas Revolt" title="Kas Revolt"><div className="page-wrap">
    <div className="page-intro"><div><em>TRANSPARANSI KAS</em><h2>Kas Revolt</h2><p>Saldo komunitas dihitung dari transaksi produksi. Rincian dan input hanya untuk pengurus kas.</p></div></div>
    {message ? <div className="card empty-state"><CircleDollarSign/><h2>{message}</h2>{(message.startsWith("Masuk")||message.startsWith("Akun")) && <a className="primary-action" href={account?"/profil":"/login"}>{account?"LIHAT STATUS AKUN":"MASUK KE AKUN"}</a>}</div> : <>
      <section className="cash-summary"><article className="card cash-balance"><em>SALDO TERHITUNG</em><b>{rupiah(Number(summary?.total_balance ?? 0))}</b><small>Dari pemasukan dikurangi pengeluaran yang tercatat</small></article><article className="card"><span>Pemasukan bulan ini</span><b>{rupiah(Number(summary?.income_this_month ?? 0))}</b></article><article className="card"><span>Pengeluaran bulan ini</span><b>{rupiah(Number(summary?.expense_this_month ?? 0))}</b></article></section>
      {staff && <section className="cash-workspace"><section className="form-card card cash-form"><div className="form-heading"><Plus/><span><em>TRANSAKSI BARU</em><h2>Input Kas Revolt</h2><p>Setelah disimpan, transaksi bersifat permanen. Gunakan transaksi koreksi untuk pembetulan.</p></span></div><form onSubmit={addTransaction}><label>Tipe<select value={type} onChange={(event) => setType(event.target.value as "income" | "expense")}><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></select></label><label>Tanggal<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required/></label><label>Kategori<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Contoh: Kas bulanan / Konsumsi" required/></label><label>Nominal<input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" required/></label><label>Keterangan<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Keterangan transaksi" required/></label>{error && <p className="error-message">{error}</p>}{success && <p className="success-message"><CheckCircle2/>{success}</p>}<button className="primary-action" disabled={saving}>{saving ? "MENYIMPAN…" : "SIMPAN TRANSAKSI"}</button></form></section>
        <section className="card transaction-panel"><div className="section-title"><span><em>RIWAYAT TERBARU</em><h3>Transaksi Kas</h3></span><b>{transactions.length}</b></div>{visibleTransactions.length === 0 ? <p className="system-message">Belum ada transaksi yang dapat ditampilkan.</p> : <div className="transaction-list">{visibleTransactions.map((transaction) => <article key={`${transaction.source}-${transaction.id}`}><span><em className={transaction.transaction_type === "income" ? "cash-income" : "cash-expense"}>{transaction.transaction_type === "income" ? "MASUK" : transaction.transaction_type === "expense" ? "KELUAR" : "UANG MUKA"}</em><b>{transaction.description}</b><small>{transaction.transaction_date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(`${transaction.transaction_date}T00:00:00`)) : "Tanggal belum tersedia"} · {transaction.source === "production" ? "Input aplikasi" : "Data awal"}</small></span><strong className={transaction.transaction_type === "income" ? "cash-income" : "cash-expense"}>{transaction.transaction_type === "income" ? "+" : "−"}{rupiah(transaction.amount)}</strong></article>)}</div>}</section>
      </section>}
      {!staff && <div className="notice"><ShieldCheck/> Ringkasan ini dihitung langsung dari transaksi produksi. Rincian kas tidak dibuka ke seluruh member.</div>}
    </>}
  </div></AppShell>;
}
