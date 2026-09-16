"use client";

import { AppShell } from "@/components/app-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, CircleDollarSign, FileDown, Plus, Search, ShieldCheck, Undo2, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Summary = { total_balance: number; income_this_month: number; expense_this_month: number; last_updated: string | null };
type Account = { role: string; status: "pending" | "active" | "inactive"; member_external_id: string };
type Due = { id: string; member_external_id: string; period_label: string; amount_paid: number | string; recorded_at: string | null };
type Transaction = { id: string; transaction_type: "income" | "expense" | "advance"; transaction_date: string | null; description: string; category: string | null; amount: number; created_at: string; voided_at: string | null; void_reason: string | null; source: "import" | "production" };
type TransactionRow = Omit<Transaction, "source" | "amount"> & { amount: number | string };
type FilterType = "all" | "income" | "expense";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const compactRupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", notation: "compact", maximumFractionDigits: 1 }).format(value);
const isStaffRole = (role?: string) => ["treasurer", "admin", "superadmin"].includes(role || "");
const monthKey = (transaction: Transaction) => (transaction.transaction_date || transaction.created_at).slice(0, 7);
const monthLabel = (value: string) => new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(`${value}-01T00:00:00`));

export default function CashPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [message, setMessage] = useState("Memuat ringkasan kas…");
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
  const sortedTransactions = useMemo(() => transactions.slice().sort((a, b) => `${b.transaction_date || ""}${b.created_at}`.localeCompare(`${a.transaction_date || ""}${a.created_at}`)), [transactions]);
  const periods = useMemo(() => Array.from(new Set(sortedTransactions.map(monthKey))).filter(Boolean), [sortedTransactions]);
  const visibleTransactions = useMemo(() => sortedTransactions.filter((transaction) => {
    const matchesPeriod = period === "all" || monthKey(transaction) === period;
    const matchesType = filterType === "all" || transaction.transaction_type === filterType;
    const haystack = `${transaction.description} ${transaction.category || ""}`.toLowerCase();
    return matchesPeriod && matchesType && haystack.includes(query.trim().toLowerCase());
  }).slice(0, 50), [filterType, period, query, sortedTransactions]);
  const flow = useMemo(() => visibleTransactions.filter((transaction) => !transaction.voided_at).reduce((total, transaction) => {
    if (transaction.transaction_type === "income") total.income += transaction.amount;
    else total.expense += transaction.amount;
    return total;
  }, { income: 0, expense: 0 }), [visibleTransactions]);
  const categories = useMemo(() => {
    const totals = new Map<string, number>();
    visibleTransactions.filter((transaction) => !transaction.voided_at && transaction.transaction_type !== "income").forEach((transaction) => {
      const label = transaction.category || "Lainnya";
      totals.set(label, (totals.get(label) || 0) + transaction.amount);
    });
    return Array.from(totals, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [visibleTransactions]);
  const maxCategory = categories[0]?.value || 1;
  const duesTotal = useMemo(() => dues.reduce((total, due) => total + Number(due.amount_paid), 0), [dues]);

  const load = async () => {
    let authenticated = true;
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { authenticated = false; setMessage("Masuk ke akun untuk melihat ringkasan Kas Revolt."); return; }
      const { data: accountData, error: accountError } = await supabase.from("member_accounts").select("role,status,member_external_id").eq("user_id", user.id).maybeSingle();
      if (accountError) throw accountError;
      const nextAccount = accountData as Account | null;
      setAccount(nextAccount);
      if (nextAccount?.status !== "active") { setSummary(null); setMessage("Akun member harus aktif untuk melihat Kas Revolt."); return; }
      const { data: summaryData, error: summaryError } = await supabase.rpc("get_member_cash_summary");
      if (summaryError) throw summaryError;
      setSummary((summaryData?.[0] ?? null) as Summary | null);
      if (isStaffRole(nextAccount.role)) {
        const [imported, production] = await Promise.all([
          supabase.from("cash_transactions").select("id,transaction_type,transaction_date,description,amount,created_at").order("transaction_date", { ascending: false }).limit(250),
          supabase.from("club_cash_transactions").select("id,transaction_type,transaction_date,category,description,amount,created_at,voided_at,void_reason").order("transaction_date", { ascending: false }).limit(250),
        ]);
        if (imported.error) throw imported.error;
        if (production.error) throw production.error;
        setTransactions([
          ...((imported.data ?? []) as Omit<TransactionRow, "category" | "voided_at" | "void_reason">[]).map((row) => ({ ...row, category: "Data awal", amount: Number(row.amount), voided_at: null, void_reason: null, source: "import" as const })),
          ...((production.data ?? []) as TransactionRow[]).map((row) => ({ ...row, amount: Number(row.amount), source: "production" as const })),
        ]);
        const { data: dueData, error: dueError } = await supabase.from("member_dues").select("id,member_external_id,period_label,amount_paid,recorded_at").order("recorded_at", { ascending: false }).limit(250);
        if (dueError) throw dueError;
        setDues((dueData ?? []) as Due[]);
      } else {
        setTransactions([]);
        const { data: dueData, error: dueError } = await supabase.from("member_dues").select("id,member_external_id,period_label,amount_paid,recorded_at").eq("member_external_id", nextAccount.member_external_id).order("recorded_at", { ascending: false }).limit(24);
        if (dueError) throw dueError;
        setDues((dueData ?? []) as Due[]);
      }
      setMessage("");
    } catch (caught) {
      setMessage("Ringkasan kas belum dapat dimuat.");
      if (authenticated) setError(caught instanceof Error ? caught.message : "Terjadi masalah saat membaca kas.");
    }
  };

  useEffect(() => {
    // Initial authenticated ledger hydration.
    void load();
  }, []);

  const addTransaction = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setSuccess(""); setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi login tidak ditemukan.");
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) throw new Error("Nominal kas harus lebih dari nol.");
      const { error: insertError } = await supabase.from("club_cash_transactions").insert({ transaction_date: date, transaction_type: type, category: category.trim(), amount: parsedAmount, description: description.trim(), created_by: user.id });
      if (insertError) throw insertError;
      setSuccess("Transaksi kas tersimpan dan saldo sudah diperbarui.");
      setCategory(""); setAmount(""); setDescription(""); setFormOpen(false);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Transaksi belum bisa disimpan."); }
    finally { setSaving(false); }
  };

  const voidTransaction = async (transaction: Transaction) => {
    if (transaction.source !== "production" || transaction.voided_at) return;
    const reason = window.prompt(`Koreksi transaksi “${transaction.description}”. Transaksi tidak akan dihapus dari audit trail.`, "");
    if (reason === null) return;
    setError(""); setSuccess("");
    try {
      const { error: voidError } = await getSupabaseBrowserClient().rpc("void_club_cash_transaction", { p_transaction_id: transaction.id, p_reason: reason });
      if (voidError) throw voidError;
      setSuccess("Transaksi dikoreksi. Nilainya tidak lagi dihitung pada saldo kas.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Transaksi belum dapat dikoreksi."); }
  };

  const downloadLedger = () => {
    const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [["Tanggal", "Tipe", "Kategori", "Keterangan", "Nominal", "Status", "Alasan koreksi"], ...visibleTransactions.map((item) => [item.transaction_date || "", item.transaction_type, item.category || "", item.description, item.amount, item.voided_at ? "Dikoreksi" : "Aktif", item.void_reason || ""])];
    const blob = new Blob(["\ufeff", rows.map((row) => row.map(cell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `kas-revolt-${period === "all" ? "semua-periode" : period}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return <AppShell active="Kas Revolt" title="Kas Revolt"><div className="page-wrap cash-page">
    <div className="page-intro"><div><em>FINANCE CENTER</em><h2>Kas Revolt</h2><p>Pantau saldo, arus masuk, pengeluaran, dan transaksi komunitas dalam satu tempat.</p></div>{staff && <button className="cash-add-button" onClick={() => setFormOpen((current) => !current)}>{formOpen ? <X/> : <Plus/>}{formOpen ? "Tutup" : "Transaksi baru"}</button>}</div>
    {message ? <div className="card empty-state"><CircleDollarSign/><h2>{message}</h2>{(message.startsWith("Masuk") || message.startsWith("Akun")) && <a className="primary-action" href={account ? "/profil" : "/login"}>{account ? "LIHAT STATUS AKUN" : "MASUK KE AKUN"}</a>}</div> : <>
      <section className="finance-overview"><article className="finance-balance"><span><WalletCards/><em>SALDO KAS TERKINI</em></span><b>{rupiah(Number(summary?.total_balance ?? 0))}</b><small>Diperbarui dari seluruh transaksi tercatat</small></article><article className="finance-metric income"><i><ArrowDownLeft/></i><span><small>PEMASUKAN BULAN INI</small><b>{compactRupiah(Number(summary?.income_this_month ?? 0))}</b><em>Arus dana masuk</em></span></article><article className="finance-metric expense"><i><ArrowUpRight/></i><span><small>PENGELUARAN BULAN INI</small><b>{compactRupiah(Number(summary?.expense_this_month ?? 0))}</b><em>Arus dana keluar</em></span></article></section>
      <section className="card dues-card"><div className="section-title"><span><em>IURAN MEMBER</em><h3>{staff ? "Rekap iuran tercatat" : "Riwayat iuran kamu"}</h3></span><b>{rupiah(duesTotal)}</b></div>{dues.length === 0 ? <p className="system-message">Belum ada iuran yang tercatat.</p> : <div>{dues.slice(0, staff ? 6 : 4).map((due) => <article key={due.id}><span><b>{staff ? due.member_external_id : due.period_label}</b><small>{staff ? due.period_label : due.recorded_at ? new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(new Date(`${due.recorded_at}T00:00:00`)) : "Tanggal belum tersedia"}</small></span><strong>{rupiah(Number(due.amount_paid))}</strong></article>)}</div>}</section>
      {formOpen && <section className="card finance-entry"><div className="form-heading"><Plus/><span><em>TRANSAKSI BARU</em><h2>Catat transaksi kas</h2><p>Transaksi tersimpan permanen dan langsung memperbarui saldo.</p></span></div><form onSubmit={addTransaction}><label>Tipe<select value={type} onChange={(event) => setType(event.target.value as "income" | "expense")}><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></select></label><label>Tanggal<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required/></label><label>Kategori<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Kas bulanan / Konsumsi" required/></label><label>Nominal<input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" required/></label><label className="entry-description">Keterangan<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Keterangan transaksi" required/></label>{error && <p className="error-message">{error}</p>}{success && <p className="success-message"><CheckCircle2/>{success}</p>}<button className="primary-action" disabled={saving}>{saving ? "MENYIMPAN…" : "SIMPAN TRANSAKSI"}</button></form></section>}
      {staff ? <section className="finance-workspace"><div className="card finance-ledger"><div className="ledger-head"><div><em>BUKU KAS</em><h3>Riwayat transaksi</h3></div><span><b>{visibleTransactions.length} data</b><button className="ledger-export" onClick={downloadLedger}><FileDown/>CSV</button></span></div><div className="finance-toolbar"><label className="finance-search"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari transaksi atau kategori"/></label><select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Periode transaksi"><option value="all">Semua periode</option>{periods.map((item) => <option key={item} value={item}>{monthLabel(item)}</option>)}</select></div><div className="finance-segments">{(["all", "income", "expense"] as FilterType[]).map((item) => <button key={item} className={filterType === item ? "active" : ""} onClick={() => setFilterType(item)}>{item === "all" ? "Semua" : item === "income" ? "Pemasukan" : "Pengeluaran"}</button>)}</div>{visibleTransactions.length === 0 ? <p className="system-message">Tidak ada transaksi yang cocok dengan filter.</p> : <div className="native-transactions">{visibleTransactions.map((transaction) => { const incoming = transaction.transaction_type === "income"; return <article className={transaction.voided_at ? "voided" : ""} key={`${transaction.source}-${transaction.id}`}><i className={incoming ? "in" : "out"}>{incoming ? <ArrowDownLeft/> : <ArrowUpRight/>}</i><span><b>{transaction.description}</b><small>{transaction.voided_at ? `Dikoreksi · ${transaction.void_reason}` : `${transaction.category || "Tanpa kategori"} · ${transaction.transaction_date ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${transaction.transaction_date}T00:00:00`)) : "Tanggal belum tersedia"}`}</small></span><strong className={incoming ? "cash-income" : "cash-expense"}>{incoming ? "+" : "−"}{rupiah(transaction.amount)}</strong>{transaction.source === "production" && !transaction.voided_at && <button className="void-transaction" onClick={() => void voidTransaction(transaction)} aria-label={`Koreksi transaksi ${transaction.description}`}><Undo2/></button>}</article>; })}</div>}</div>
        <aside className="finance-side"><section className="card flow-card"><div className="section-title"><span><em>ARUS KAS</em><h3>Ringkasan filter</h3></span></div><div><span><small>Dana masuk</small><b className="cash-income">{rupiah(flow.income)}</b></span><span><small>Dana keluar</small><b className="cash-expense">{rupiah(flow.expense)}</b></span><span className="flow-net"><small>Arus bersih</small><b>{rupiah(flow.income - flow.expense)}</b></span></div></section><section className="card category-card"><div className="section-title"><span><em>PENGELUARAN</em><h3>Kategori terbesar</h3></span></div>{categories.length === 0 ? <p className="system-message">Belum ada pengeluaran pada filter ini.</p> : <div className="category-bars">{categories.map((item) => <article key={item.label}><span><b>{item.label}</b><small>{rupiah(item.value)}</small></span><i><em style={{ width: `${Math.max(8, item.value / maxCategory * 100)}%` }}/></i></article>)}</div>}</section></aside>
      </section> : <div className="notice"><ShieldCheck/> Ringkasan kas dapat dilihat member aktif. Rincian transaksi hanya tersedia untuk Treasurer dan Admin.</div>}
    </>}
  </div></AppShell>;
}
