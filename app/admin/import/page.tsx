"use client";

import { AppShell } from "@/components/app-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Check, FileSpreadsheet, ShieldAlert, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Account = { role: string; status: string };
type ImportKind = "members" | "cash";
type Mapping = Record<string, string>;
const memberFields = ["member_external_id", "full_name", "nickname", "city", "join_date", "club_role", "total_km"] as const;
const cashFields = ["transaction_date", "transaction_type", "amount", "description"] as const;
const labels: Record<string, string> = { member_external_id: "Member ID", full_name: "Nama lengkap", nickname: "Nickname", city: "Kota", join_date: "Tanggal bergabung", club_role: "Jabatan club", total_km: "Total KM", transaction_date: "Tanggal", transaction_type: "Tipe", amount: "Nominal", description: "Keterangan" };
const required = new Set(["member_external_id", "full_name", "transaction_type", "amount", "description"]);
const aliases: Record<string, string[]> = { member_external_id: ["memberid", "idmember", "rrid", "nomember"], full_name: ["nama", "namalengkap", "fullname"], nickname: ["nickname", "namapanggilan", "panggilan"], city: ["kota", "domisili"], join_date: ["joindate", "tanggalbergabung", "tanggabergabung"], club_role: ["jabatan", "role", "clubrole"], total_km: ["km", "totalkm", "kilometer"], transaction_date: ["tanggal", "date", "transactiondate"], transaction_type: ["tipe", "jenis", "type", "transactiontype"], amount: ["nominal", "jumlah", "amount"], description: ["keterangan", "deskripsi", "description", "kategori"] };

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const isoDate = (value: string) => {
  const clean = value.trim();
  if (!clean) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const parts = clean.split(/[\/.\-]/);
  if (parts.length !== 3 || parts[0].length > 2) return "";
  const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
  return /^\d{4}$/.test(year) ? `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}` : "";
};
const numeric = (value: string) => { const clean = value.replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."); const parsed = Number(clean); return Number.isFinite(parsed) ? String(Math.max(0, parsed)) : "0"; };

function parseDelimited(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) { const char = text[index]; const next = text[index + 1]; if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; } else if (char === '"') quoted = !quoted; else if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ""; } else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") index += 1; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; } else cell += char; }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows;
}

export default function ImportPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [kind, setKind] = useState<ImportKind>("members");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { void (async () => { const supabase = getSupabaseBrowserClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data } = await supabase.from("member_accounts").select("role,status").eq("user_id", user.id).maybeSingle(); setAccount(data as Account | null); })(); }, []);

  const fields = kind === "members" ? memberFields : cashFields;
  const canImport = account?.status === "active" && (kind === "members" ? ["admin", "superadmin"].includes(account.role) : ["treasurer", "admin", "superadmin"].includes(account.role));

  const chooseFile = async (file?: File) => {
    setError(""); setSuccess(""); setRows([]); setHeaders([]);
    if (!file) return; if (file.size > 5_000_000) return setError("Ukuran CSV maksimal 5 MB.");
    const parsed = parseDelimited(await file.text());
    if (parsed.length < 2) return setError("CSV harus memiliki header dan minimal satu baris data.");
    const nextHeaders = parsed[0].map((header, index) => header || `Kolom ${index + 1}`);
    const auto: Mapping = {};
    fields.forEach((field) => { const match = nextHeaders.find((header) => aliases[field]?.includes(normalize(header))); if (match) auto[field] = match; });
    setFileName(file.name); setHeaders(nextHeaders); setRows(parsed.slice(1, 1001)); setMapping(auto);
  };

  const normalizedRows = useMemo(() => rows.map((row) => Object.fromEntries(fields.map((field) => { const column = headers.indexOf(mapping[field] ?? ""); const raw = column >= 0 ? row[column] ?? "" : ""; if (field === "join_date" || field === "transaction_date") return [field, isoDate(raw)]; if (field === "total_km" || field === "amount") return [field, numeric(raw)]; if (field === "member_external_id") return [field, raw.trim().toUpperCase()]; if (field === "transaction_type") { const value = normalize(raw); return [field, ["income", "pemasukan", "masuk"].includes(value) ? "income" : ["expense", "pengeluaran", "keluar"].includes(value) ? "expense" : ""]; } return [field, raw.trim()]; }))).filter((row) => kind === "members" ? /^RR-\d{3,}$/.test(row.member_external_id) && row.full_name : ["income", "expense"].includes(row.transaction_type) && Number(row.amount) > 0 && row.description), [fields, headers, kind, mapping, rows]);
  const missing = fields.filter((field) => required.has(field) && !mapping[field]);

  const confirmImport = async () => {
    if (!canImport || missing.length || !normalizedRows.length) return;
    setSaving(true); setError(""); setSuccess("");
    const rpc = kind === "members" ? "import_member_csv" : "import_cash_csv";
    const { data, error: importError } = await getSupabaseBrowserClient().rpc(rpc, { p_source_file: fileName, p_rows: normalizedRows });
    if (importError) setError(importError.message); else { const result = data as { record_count?: number } | null; setSuccess(`${result?.record_count ?? normalizedRows.length} baris berhasil diimpor dan masuk audit trail.`); setRows([]); setHeaders([]); setFileName(""); }
    setSaving(false);
  };

  return <AppShell active="Import CSV" title="Import Data"><div className="page-wrap"><div className="page-intro"><div><em>Import data</em><h2>Import CSV</h2><p>Upload, cocokkan kolom, periksa preview, lalu konfirmasi. Maksimal 1.000 baris per proses.</p></div></div>{!account || !canImport ? <section className="empty-state card"><ShieldAlert /><h2>Akses pengurus diperlukan</h2><p>Member hanya dapat diimpor Admin/Superadmin. Kas dapat diimpor Treasurer, Admin, atau Superadmin.</p></section> : <section className="import-layout"><div className="card import-controls"><label>Jenis data<select value={kind} onChange={(event) => { setKind(event.target.value as ImportKind); setRows([]); setHeaders([]); setFileName(""); setMapping({}); }}><option value="members">Member</option><option value="cash">Kas</option></select></label><label className="file-drop"><Upload /><b>{fileName || "Pilih file CSV / TSV"}</b><small>Header wajib berada di baris pertama</small><input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={(event) => void chooseFile(event.target.files?.[0])} /></label>{headers.length > 0 && <div className="mapping-grid">{fields.map((field) => <label key={field}>{labels[field]}{required.has(field) && <em>Wajib</em>}<select value={mapping[field] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}><option value="">Tidak dipakai</option>{headers.map((header) => <option value={header} key={header}>{header}</option>)}</select></label>)}</div>}{missing.length > 0 && <p className="error-message">Kolom wajib belum dipetakan: {missing.map((field) => labels[field]).join(", ")}.</p>}{error && <p className="error-message">{error}</p>}{success && <p className="success-message"><Check />{success}</p>}<button className="primary-action" disabled={saving || missing.length > 0 || normalizedRows.length === 0} onClick={() => void confirmImport()}>{saving ? "MENGIMPOR…" : `KONFIRMASI IMPORT ${normalizedRows.length} BARIS`}</button></div><div className="card import-preview"><div className="section-title"><span><em>Pratinjau</em><h3>{normalizedRows.length} baris valid</h3></span><FileSpreadsheet /></div>{normalizedRows.length === 0 ? <p className="system-message">Pilih file dan mapping kolom untuk melihat preview.</p> : <div className="data-table-wrap"><table><thead><tr>{fields.map((field) => <th key={field}>{labels[field]}</th>)}</tr></thead><tbody>{normalizedRows.slice(0, 8).map((row, index) => <tr key={index}>{fields.map((field) => <td key={field}>{row[field] || "—"}</td>)}</tr>)}</tbody></table></div>}</div></section>}</div></AppShell>;
}
