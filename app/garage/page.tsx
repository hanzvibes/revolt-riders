"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { AppShell } from "@/components/app-shell";
import { useDataCache } from "@/context/data-cache-context";
import { FloatingActionButton } from "@/components/floating-action-button";
import { ModalSheet } from "@/components/modal-sheet";
import { PageSkeleton } from "@/components/skeleton";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Bike,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  Gauge,
  Pencil,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Motorcycle = {
  id: string;
  member_external_id: string;
  nickname: string | null;
  brand: string;
  model: string;
  production_year: number | null;
  style: string | null;
  engine_cc: number | null;
  color: string | null;
  notes: string | null;
  is_primary: boolean;
  is_visible_to_members: boolean;
  created_at: string;
  updated_at: string;
};

type MotorcycleForm = {
  id: string | null;
  nickname: string;
  brand: string;
  model: string;
  productionYear: string;
  style: string;
  engineCc: string;
  color: string;
  notes: string;
  isPrimary: boolean;
  isVisibleToMembers: boolean;
};

const emptyForm: MotorcycleForm = {
  id: null,
  nickname: "",
  brand: "",
  model: "",
  productionYear: "",
  style: "",
  engineCc: "",
  color: "",
  notes: "",
  isPrimary: false,
  isVisibleToMembers: true,
};

const motorcycleStyles = [
  "Cafe Racer",
  "Tracker",
  "Scrambler",
  "Bobber",
  "Chopper",
  "Brat Style",
  "Street Cub",
  "Board Tracker",
  "Classic",
  "Adventure",
  "Other",
];

export default function GaragePage() {
  const { confirmAction } = useActionDialog();
  const { account, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache } = useDataCache();
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<MotorcycleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const activeAccount = account?.status === "active" ? account : null;
  const memberExternalId = activeAccount?.member_external_id ?? null;

  const loadMotorcycles = useCallback(async (forceRefresh = false) => {
    if (!memberExternalId) {
      setMotorcycles([]);
      setLoadingData(false);
      return;
    }

    try {
      const motorcyclesData = await fetchWithCache<Motorcycle[]>(
        `garage:${memberExternalId}`,
        async () => {
          const { data, error: fetchError } = await getSupabaseBrowserClient()
            .from("member_motorcycles")
            .select(
              "id,member_external_id,nickname,brand,model,production_year,style,engine_cc,color,notes,is_primary,is_visible_to_members,created_at,updated_at",
            )
            .eq("member_external_id", memberExternalId)
            .order("is_primary", { ascending: false })
            .order("created_at", { ascending: true });

          if (fetchError) throw fetchError;
          return (data ?? []) as Motorcycle[];
        },
        { ttlMs: 90_000, forceRefresh },
      );

      setMotorcycles(motorcyclesData);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Garage belum dapat dimuat.");
    } finally {
      setLoadingData(false);
    }
  }, [fetchWithCache, memberExternalId]);

  useEffect(() => {
    if (accessLoading) return;
    void loadMotorcycles();
  }, [accessLoading, loadMotorcycles]);

  const primaryBike = useMemo(
    () => motorcycles.find((motorcycle) => motorcycle.is_primary) ?? motorcycles[0] ?? null,
    [motorcycles],
  );

  const openCreate = () => {
    setForm({
      ...emptyForm,
      isPrimary: motorcycles.length === 0,
    });
    setError("");
    setMessage("");
    setSheetOpen(true);
  };

  const openEdit = (motorcycle: Motorcycle) => {
    setForm({
      id: motorcycle.id,
      nickname: motorcycle.nickname ?? "",
      brand: motorcycle.brand,
      model: motorcycle.model,
      productionYear: motorcycle.production_year ? String(motorcycle.production_year) : "",
      style: motorcycle.style ?? "",
      engineCc: motorcycle.engine_cc ? String(motorcycle.engine_cc) : "",
      color: motorcycle.color ?? "",
      notes: motorcycle.notes ?? "",
      isPrimary: motorcycle.is_primary,
      isVisibleToMembers: motorcycle.is_visible_to_members,
    });
    setError("");
    setMessage("");
    setSheetOpen(true);
  };

  const saveMotorcycle = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: saveError } = await getSupabaseBrowserClient().rpc(
        "save_member_motorcycle",
        {
          p_id: form.id,
          p_nickname: form.nickname.trim() || null,
          p_brand: form.brand.trim(),
          p_model: form.model.trim(),
          p_production_year: form.productionYear ? Number(form.productionYear) : null,
          p_style: form.style.trim() || null,
          p_engine_cc: form.engineCc ? Number(form.engineCc) : null,
          p_color: form.color.trim() || null,
          p_notes: form.notes.trim() || null,
          p_is_primary: form.isPrimary,
          p_is_visible_to_members: form.isVisibleToMembers,
        },
      );

      if (saveError) throw saveError;
      setSheetOpen(false);
      setMessage(form.id ? "Motor berhasil diperbarui." : "Motor berhasil masuk ke Garage.");
      setForm(emptyForm);
      await loadMotorcycles(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Data motor belum dapat disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMotorcycle = async (motorcycle: Motorcycle) => {
    if (!await confirmAction(`Hapus ${motorcycle.nickname || `${motorcycle.brand} ${motorcycle.model}`} dari Garage?`)) {
      return;
    }

    setBusyId(motorcycle.id);
    setError("");
    setMessage("");

    try {
      const { error: deleteError } = await getSupabaseBrowserClient().rpc(
        "delete_member_motorcycle",
        { p_id: motorcycle.id },
      );
      if (deleteError) throw deleteError;
      setMessage("Motor dihapus dari Garage.");
      await loadMotorcycles(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Motor belum dapat dihapus.");
    } finally {
      setBusyId("");
    }
  };

  if (accessLoading || (activeAccount && loadingData)) {
    return (
      <AppShell active="Garage" title="My Garage">
        <PageSkeleton title="Memuat Garage..." />
      </AppShell>
    );
  }

  if (!activeAccount) {
    return (
      <AppShell active="Garage" title="My Garage">
        <div className="page-wrap">
          <section className="empty-state card">
            <ShieldAlert />
            <h2>Akun member aktif diperlukan</h2>
            <p>Motorcycle Passport hanya tersedia untuk member Revolt Riders yang sudah aktif.</p>
            <a className="primary-action" href={account ? "/profil" : "/login"}>
              {account ? "LIHAT STATUS AKUN" : "MASUK"}
            </a>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Garage" title="My Garage">
      <div className="page-wrap garage-page">
        <section className="garage-hero">
          <div className="garage-hero-copy">
            <span>
              <small>MOTORCYCLE PASSPORT</small>
              <h2>{primaryBike?.nickname || "My Garage"}</h2>
              <p>
                {primaryBike
                  ? `${primaryBike.brand} ${primaryBike.model}${primaryBike.production_year ? ` · ${primaryBike.production_year}` : ""}`
                  : "Simpan identitas motor custom yang jadi bagian dari perjalananmu."}
              </p>
            </span>
            <div className="garage-hero-icon" aria-hidden="true">
              <Bike />
            </div>
          </div>

          <div className="garage-hero-stats">
            <span>
              <small>Motor</small>
              <b>{motorcycles.length}</b>
            </span>
            <span>
              <small>Primary</small>
              <b>{primaryBike ? primaryBike.nickname || primaryBike.model : "—"}</b>
            </span>
            <span>
              <small>Visibility</small>
              <b>{motorcycles.filter((motorcycle) => motorcycle.is_visible_to_members).length} shared</b>
            </span>
          </div>
        </section>

        {error && <p className="error-message">{error}</p>}
        {message && (
          <p className="success-message">
            <Check />
            {message}
          </p>
        )}

        <div className="garage-section-head">
          <span>
            <em>Garage member</em>
            <h3>Motor Saya</h3>
          </span>
          <small>{motorcycles.length ? `${motorcycles.length} unit tersimpan` : "Belum ada motor"}</small>
        </div>

        {motorcycles.length === 0 ? (
          <section className="garage-empty card">
            <Wrench />
            <h3>Garage masih kosong</h3>
            <p>Tambahkan motor pertama. Unit pertama otomatis menjadi primary bike.</p>
            <button type="button" className="primary-action" onClick={openCreate}>
              TAMBAH MOTOR
            </button>
          </section>
        ) : (
          <section className="garage-grid" aria-label="Daftar motor saya">
            {motorcycles.map((motorcycle) => (
              <article
                key={motorcycle.id}
                className={`garage-bike-card${motorcycle.is_primary ? " is-primary" : ""}`}
              >
                <header>
                  <div className="garage-bike-mark">
                    <Bike aria-hidden="true" />
                  </div>
                  <span>
                    <small>{motorcycle.is_primary ? "PRIMARY BIKE" : "MOTORCYCLE"}</small>
                    <h3>{motorcycle.nickname || `${motorcycle.brand} ${motorcycle.model}`}</h3>
                    <p>{motorcycle.brand} {motorcycle.model}</p>
                  </span>
                  {motorcycle.is_primary && (
                    <i className="garage-primary-badge" title="Primary bike">
                      <Star aria-hidden="true" />
                    </i>
                  )}
                </header>

                <div className="garage-bike-specs">
                  <span>
                    <CalendarDays aria-hidden="true" />
                    <small>Tahun</small>
                    <b>{motorcycle.production_year ?? "—"}</b>
                  </span>
                  <span>
                    <Gauge aria-hidden="true" />
                    <small>Engine</small>
                    <b>{motorcycle.engine_cc ? `${motorcycle.engine_cc} cc` : "—"}</b>
                  </span>
                  <span>
                    <Sparkles aria-hidden="true" />
                    <small>Style</small>
                    <b>{motorcycle.style || "—"}</b>
                  </span>
                </div>

                {(motorcycle.color || motorcycle.notes) && (
                  <div className="garage-bike-notes">
                    {motorcycle.color && <b>{motorcycle.color}</b>}
                    {motorcycle.notes && <p>{motorcycle.notes}</p>}
                  </div>
                )}

                <footer>
                  <span className={motorcycle.is_visible_to_members ? "is-visible" : "is-private"}>
                    {motorcycle.is_visible_to_members ? <Eye /> : <EyeOff />}
                    {motorcycle.is_visible_to_members ? "Visible ke member" : "Private"}
                  </span>
                  <div>
                    <button type="button" onClick={() => openEdit(motorcycle)} aria-label="Edit motor">
                      <Pencil />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === motorcycle.id}
                      onClick={() => void deleteMotorcycle(motorcycle)}
                      aria-label="Hapus motor"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </footer>
              </article>
            ))}
          </section>
        )}
      </div>

      <FloatingActionButton label="Tambah motor ke Garage" onClick={openCreate} />

      <ModalSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        eyebrow={form.id ? "Edit Motorcycle Passport" : "Motorcycle Passport"}
        title={form.id ? "Edit Motor" : "Tambah Motor"}
      >
        <form className="garage-form" onSubmit={saveMotorcycle}>
          <div className="garage-form-grid">
            <label>
              <span>Nickname motor</span>
              <input
                value={form.nickname}
                onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
                placeholder="Contoh: Blackbird"
                maxLength={60}
              />
            </label>

            <label>
              <span>Brand *</span>
              <input
                value={form.brand}
                onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
                placeholder="Honda"
                required
                maxLength={60}
              />
            </label>

            <label>
              <span>Model *</span>
              <input
                value={form.model}
                onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
                placeholder="Tiger Revo"
                required
                maxLength={80}
              />
            </label>

            <label>
              <span>Tahun</span>
              <input
                type="number"
                inputMode="numeric"
                min={1950}
                max={2100}
                value={form.productionYear}
                onChange={(event) =>
                  setForm((current) => ({ ...current, productionYear: event.target.value }))
                }
                placeholder="2008"
              />
            </label>

            <label>
              <span>Style</span>
              <select
                value={form.style}
                onChange={(event) => setForm((current) => ({ ...current, style: event.target.value }))}
              >
                <option value="">Pilih style</option>
                {motorcycleStyles.map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Engine CC</span>
              <input
                type="number"
                inputMode="numeric"
                min={50}
                max={5000}
                value={form.engineCc}
                onChange={(event) => setForm((current) => ({ ...current, engineCc: event.target.value }))}
                placeholder="200"
              />
            </label>

            <label className="garage-form-wide">
              <span>Warna</span>
              <input
                value={form.color}
                onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                placeholder="Black / Raw Metal"
                maxLength={60}
              />
            </label>

            <label className="garage-form-wide">
              <span>Catatan build</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Detail custom, part khas, cerita singkat motor..."
                maxLength={600}
                rows={4}
              />
            </label>
          </div>

          <div className="garage-form-toggles">
            <label>
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(event) => setForm((current) => ({ ...current, isPrimary: event.target.checked }))}
              />
              <span>
                <b>Primary bike</b>
                <small>Tampil sebagai motor utama di Garage.</small>
              </span>
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.isVisibleToMembers}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isVisibleToMembers: event.target.checked }))
                }
              />
              <span>
                <b>Visible ke member</b>
                <small>Sesama member aktif dapat melihat motorcycle passport ini.</small>
              </span>
            </label>
          </div>

          <button type="submit" className="primary-action garage-save-action" disabled={saving}>
            {saving ? "MENYIMPAN…" : form.id ? "SIMPAN PERUBAHAN" : "TAMBAH KE GARAGE"}
          </button>
        </form>
      </ModalSheet>
    </AppShell>
  );
}
