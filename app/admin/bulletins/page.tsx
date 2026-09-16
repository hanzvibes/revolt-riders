"use client";

import { AppShell } from "@/components/app-shell";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Bell, Check, Edit3, Eye, EyeOff, Plus, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Bulletin = {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const canManage = (role?: string) => role === "admin" || role === "superadmin";

export default function ManageBulletinsPage() {
  const { user, account, loading: accessLoading } = useMemberAccess();
  const [items, setItems] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (account?.status !== "active" || !canManage(account.role)) {
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await getSupabaseBrowserClient().from("announcements")
      .select("id,title,body,is_published,published_at,expires_at,created_at")
      .order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    setItems((data ?? []) as Bulletin[]);
    setLoading(false);
  }, [account]);

  useEffect(() => { if (!accessLoading) void load(); }, [accessLoading, load]);

  const resetForm = () => {
    setEditingId(null); setTitle(""); setBody(""); setExpiresAt(""); setPublishNow(true);
  };

  const edit = (item: Bulletin) => {
    setEditingId(item.id); setTitle(item.title); setBody(item.body); setPublishNow(item.is_published);
    setExpiresAt(item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || account?.status !== "active" || !canManage(account.role)) return;
    setSaving(true); setError(""); setMessage("");
    const payload = {
      title: title.trim(),
      body: body.trim(),
      is_published: publishNow,
      published_at: publishNow ? new Date().toISOString() : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };
    const supabase = getSupabaseBrowserClient();
    const result = editingId
      ? await supabase.from("announcements").update(payload).eq("id", editingId)
      : await supabase.from("announcements").insert(payload);
    if (result.error) setError(result.error.message);
    else {
      setMessage(editingId ? "Bulletin berhasil diperbarui." : publishNow ? "Bulletin berhasil dipublikasikan." : "Draft bulletin tersimpan.");
      resetForm();
      await load();
    }
    setSaving(false);
  };

  const togglePublish = async (item: Bulletin) => {
    setError(""); setMessage("");
    const nextPublished = !item.is_published;
    const { error: updateError } = await getSupabaseBrowserClient().from("announcements").update({
      is_published: nextPublished,
      published_at: nextPublished ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", item.id);
    if (updateError) setError(updateError.message);
    else { setMessage(nextPublished ? "Bulletin dipublikasikan." : "Bulletin ditarik menjadi draft."); await load(); }
  };

  if (accessLoading || loading) return <AppShell active="Kelola Bulletin" title="Kelola Bulletin"><div className="page-wrap"><p>Memeriksa akses dan bulletin…</p></div></AppShell>;
  if (account?.status !== "active" || !canManage(account?.role)) return <AppShell active="Kelola Bulletin" title="Kelola Bulletin"><div className="page-wrap"><section className="empty-state card"><ShieldAlert/><h2>Akses admin diperlukan</h2><p>Bulletin hanya dapat dikelola oleh akun aktif Admin atau Superadmin.</p><a className="primary-action" href={account ? "/profil" : "/login"}>{account ? "LIHAT STATUS AKUN" : "MASUK"}</a></section></div></AppShell>;

  return <AppShell active="Kelola Bulletin" title="Kelola Bulletin"><div className="page-wrap bulletin-admin-grid">
    <section className="form-card card bulletin-editor"><div className="form-heading"><Bell/><span><em>{editingId ? "EDIT BULLETIN" : "BULLETIN BARU"}</em><h2>{editingId ? "Perbarui pengumuman" : "Tulis pengumuman"}</h2><p>Bulletin terbit langsung di dashboard dan halaman Bulletin member.</p></span></div><form onSubmit={save}><label>Judul<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={120} required/></label><label>Isi pengumuman<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={7} maxLength={2000} required/></label><label>Berlaku sampai (opsional)<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)}/></label><label className="publish-check"><input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)}/><span>Publikasikan sekarang</span></label><div className="form-actions"><button className="primary-action" disabled={saving}>{saving ? "MENYIMPAN…" : editingId ? "SIMPAN PERUBAHAN" : <><Plus/>SIMPAN BULLETIN</>}</button>{editingId && <button type="button" className="outline-action" onClick={resetForm}>BATAL EDIT</button>}</div></form></section>
    <section className="card bulletin-management"><div className="section-title"><span><em>ARSIP BULLETIN</em><h3>Pengumuman tersimpan</h3></span><b>{items.length}</b></div>{message && <p className="success-message"><Check/>{message}</p>}{error && <p className="error-message">{error}</p>}{items.length === 0 ? <p className="system-message">Belum ada bulletin. Buat pengumuman pertama dari formulir.</p> : <div className="bulletin-management-list">{items.map((item) => <article key={item.id}><div><span className={item.is_published ? "bulletin-live" : "bulletin-draft"}>{item.is_published ? "TAYANG" : "DRAFT"}</span><h3>{item.title}</h3><p>{item.body}</p><small>{item.published_at ? `Terbit ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(item.published_at))} WIB` : "Belum dipublikasikan"}{item.expires_at ? ` · Berakhir ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(item.expires_at))} WIB` : ""}</small></div><div className="bulletin-actions"><button onClick={() => edit(item)}><Edit3/>Edit</button><button onClick={() => void togglePublish(item)}>{item.is_published ? <EyeOff/> : <Eye/>}{item.is_published ? "Tarik" : "Terbitkan"}</button></div></article>)}</div>}</section>
  </div></AppShell>;
}
