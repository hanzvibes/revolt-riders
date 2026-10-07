"use client";

import { AppShell } from "@/components/app-shell";
import { CountUpNumber } from "@/components/count-up-number";
import { FloatingActionButton } from "@/components/floating-action-button";
import { ModalSheet } from "@/components/modal-sheet";
import { PageState } from "@/components/page-state";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, CircleDollarSign, FileDown, Search, ShieldCheck, Undo2, WalletCards } from "lucide-react";

import { FilterType, rupiah, monthLabel } from "./cash-screen-model";

import { useCashScreen } from "./use-cash-screen";

export default function CashPage() {

  const { accessLoading, summary, account, transactions, dues, message, loadingData, error, success, type, setType, date, setDate, category, setCategory, amount, setAmount, description, setDescription, saving, formOpen, setFormOpen, period, setPeriod, filterType, setFilterType, query, setQuery, staff, periods, visibleTransactions, flow, categories, maxCategory, duesTotal, addTransaction, voidTransaction, downloadLedger } = useCashScreen();

  if (accessLoading || loadingData) {
    return (
      <AppShell active="Kas Revolt" title="Kas Revolt">
        <PageSkeleton title="Memuat Kas Revolt..." />
      </AppShell>
    );
  }

  return (
    <AppShell active="Kas Revolt" title="Kas Revolt">
      <div className="page-wrap cash-page">
        <div className="page-intro">
          <div>
            <em>Keuangan</em>
            <h2>Kas Revolt</h2>
            <p>
              Pantau saldo, arus masuk, pengeluaran, dan transaksi komunitas
              dalam satu tempat.
            </p>
          </div>
        </div>
        {message ? (
          <PageState
            tone={
              message.startsWith("Masuk") || message.startsWith("Akun")
                ? "restricted"
                : "error"
            }
            icon={<CircleDollarSign />}
            title={message}
            description={
              message.startsWith("Masuk") || message.startsWith("Akun")
                ? undefined
                : error
            }
            action={
              message.startsWith("Masuk") || message.startsWith("Akun") ? (
                <a
                  className="primary-action"
                  href={account ? "/profil" : "/login"}
                >
                  {account ? "LIHAT STATUS AKUN" : "MASUK KE AKUN"}
                </a>
              ) : undefined
            }
          />
        ) : (
          <>
            <section className="finance-overview">
              <article className="finance-balance">
                <span>
                  <WalletCards />
                  <em>Saldo kas</em>
                </span>
                <b>
                  <CountUpNumber
                    value={Number(summary?.total_balance ?? 0)}
                    formatOptions={{
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }}
                  />
                </b>
                <small>Diperbarui dari seluruh transaksi tercatat</small>
              </article>
              <article className="finance-metric income">
                <i>
                  <ArrowDownLeft />
                </i>
                <span>
                  <small>Pemasukan bulan ini</small>
                  <b>
                    <CountUpNumber
                      value={Number(summary?.income_this_month ?? 0)}
                      maximumFractionDigits={1}
                      formatOptions={{
                        style: "currency",
                        currency: "IDR",
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }}
                    />
                  </b>
                  <em>Arus dana masuk</em>
                </span>
              </article>
              <article className="finance-metric expense">
                <i>
                  <ArrowUpRight />
                </i>
                <span>
                  <small>Pengeluaran bulan ini</small>
                  <b>
                    <CountUpNumber
                      value={Number(summary?.expense_this_month ?? 0)}
                      maximumFractionDigits={1}
                      formatOptions={{
                        style: "currency",
                        currency: "IDR",
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }}
                    />
                  </b>
                  <em>Arus dana keluar</em>
                </span>
              </article>
            </section>
            <section className="card dues-card">
              <div className="section-title">
                <span>
                  <em>Iuran member</em>
                  <h3>
                    {staff ? "Rekap iuran tercatat" : "Riwayat iuran kamu"}
                  </h3>
                </span>
                <b>{rupiah(duesTotal)}</b>
              </div>
              {dues.length === 0 ? (
                <p className="system-message">Belum ada iuran yang tercatat.</p>
              ) : (
                <div>
                  {dues.slice(0, staff ? 6 : 4).map((due) => (
                    <article key={due.id}>
                      <span>
                        <b>
                          {staff ? due.member_external_id : due.period_label}
                        </b>
                        <small>
                          {staff
                            ? due.period_label
                            : due.recorded_at
                              ? new Intl.DateTimeFormat("id-ID", {
                                  month: "short",
                                  year: "numeric",
                                }).format(
                                  new Date(`${due.recorded_at}T00:00:00`),
                                )
                              : "Tanggal belum tersedia"}
                        </small>
                      </span>
                      <strong>{rupiah(Number(due.amount_paid))}</strong>
                    </article>
                  ))}
                </div>
              )}
            </section>
            {staff && (
              <FloatingActionButton
                label="Transaksi baru"
                onClick={() => setFormOpen(true)}
              />
            )}
            <ModalSheet
              open={formOpen}
              onClose={() => setFormOpen(false)}
              eyebrow="Transaksi baru"
              title="Catat transaksi kas"
            >
              <form
                className="sheet-form cash-sheet-form"
                onSubmit={addTransaction}
              >
                <label>
                  Tipe
                  <select
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value as "income" | "expense")
                    }
                  >
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                </label>
                <label>
                  Tanggal
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Kategori
                  <input
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="Kas bulanan / Konsumsi"
                    required
                  />
                </label>
                <label>
                  Nominal
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0"
                    required
                  />
                </label>
                <label className="entry-description">
                  Keterangan
                  <input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Keterangan transaksi"
                    required
                  />
                </label>
                {error && <p className="error-message" role="alert">{error}</p>}
                {success && (
                  <p className="success-message" role="status" aria-live="polite">
                    <CheckCircle2 />
                    {success}
                  </p>
                )}
                <div className="sheet-actions">
                  <button className="primary-action" disabled={saving}>
                    {saving ? "MENYIMPAN…" : "SIMPAN TRANSAKSI"}
                  </button>
                  <button
                    type="button"
                    className="outline-action"
                    onClick={() => setFormOpen(false)}
                  >
                    BATAL
                  </button>
                </div>
              </form>
            </ModalSheet>
            {staff ? (
              <section className="finance-workspace">
                <div className="card finance-ledger">
                  <div className="ledger-head">
                    <div>
                      <em>Buku kas</em>
                      <h3>Riwayat transaksi</h3>
                    </div>
                    <span>
                      <b>{visibleTransactions.length} data</b>
                      <button
                        className="ledger-export"
                        onClick={downloadLedger}
                      >
                        <FileDown />
                        CSV
                      </button>
                    </span>
                  </div>
                  <div className="finance-toolbar">
                    <label className="finance-search">
                      <Search />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Cari transaksi atau kategori"
                      />
                    </label>
                    <select
                      value={period}
                      onChange={(event) => setPeriod(event.target.value)}
                      aria-label="Periode transaksi"
                    >
                      <option value="all">Semua periode</option>
                      {periods.map((item) => (
                        <option key={item} value={item}>
                          {monthLabel(item)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="finance-segments">
                    {(["all", "income", "expense"] as FilterType[]).map(
                      (item) => (
                        <button
                          key={item}
                          className={filterType === item ? "active" : ""}
                          onClick={() => setFilterType(item)}
                        >
                          {item === "all"
                            ? "Semua"
                            : item === "income"
                              ? "Pemasukan"
                              : "Pengeluaran"}
                        </button>
                      ),
                    )}
                  </div>
                  {visibleTransactions.length === 0 ? (
                    <p className="system-message">
                      Tidak ada transaksi yang cocok dengan filter.
                    </p>
                  ) : (
                    <div className="native-transactions">
                      {visibleTransactions.map((transaction) => {
                        const incoming =
                          transaction.transaction_type === "income";
                        return (
                          <article
                            className={transaction.voided_at ? "voided" : ""}
                            key={`${transaction.source}-${transaction.id}`}
                          >
                            <i className={incoming ? "in" : "out"}>
                              {incoming ? <ArrowDownLeft /> : <ArrowUpRight />}
                            </i>
                            <span>
                              <b>{transaction.description}</b>
                              <small>
                                {transaction.voided_at
                                  ? `Dikoreksi · ${transaction.void_reason}`
                                  : `${transaction.category || "Tanpa kategori"} · ${transaction.transaction_date ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${transaction.transaction_date}T00:00:00`)) : "Tanggal belum tersedia"}`}
                              </small>
                            </span>
                            <strong
                              className={
                                incoming ? "cash-income" : "cash-expense"
                              }
                            >
                              {incoming ? "+" : "−"}
                              {rupiah(transaction.amount)}
                            </strong>
                            {transaction.source === "production" &&
                              !transaction.voided_at && (
                                <button
                                  className="void-transaction"
                                  onClick={() =>
                                    void voidTransaction(transaction)
                                  }
                                  aria-label={`Koreksi transaksi ${transaction.description}`}
                                >
                                  <Undo2 />
                                </button>
                              )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
                <aside className="finance-side">
                  <section className="card flow-card">
                    <div className="section-title">
                      <span>
                        <em>Arus kas</em>
                        <h3>Ringkasan filter</h3>
                      </span>
                    </div>
                    <div>
                      <span>
                        <small>Dana masuk</small>
                        <b className="cash-income">{rupiah(flow.income)}</b>
                      </span>
                      <span>
                        <small>Dana keluar</small>
                        <b className="cash-expense">{rupiah(flow.expense)}</b>
                      </span>
                      <span className="flow-net">
                        <small>Arus bersih</small>
                        <b>{rupiah(flow.income - flow.expense)}</b>
                      </span>
                    </div>
                  </section>
                  <section className="card category-card">
                    <div className="section-title">
                      <span>
                        <em>Pengeluaran</em>
                        <h3>Kategori terbesar</h3>
                      </span>
                    </div>
                    {categories.length === 0 ? (
                      <p className="system-message">
                        Belum ada pengeluaran pada filter ini.
                      </p>
                    ) : (
                      <div className="category-bars">
                        {categories.map((item) => (
                          <article key={item.label}>
                            <span>
                              <b>{item.label}</b>
                              <small>{rupiah(item.value)}</small>
                            </span>
                            <i>
                              <em
                                style={{
                                  width: `${Math.max(8, (item.value / maxCategory) * 100)}%`,
                                }}
                              />
                            </i>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </aside>
              </section>
            ) : (
              <div className="notice">
                <ShieldCheck /> Ringkasan kas dapat dilihat member aktif.
                Rincian transaksi hanya tersedia untuk Treasurer dan Admin.
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
