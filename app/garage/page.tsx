"use client";

import { AppShell } from "@/components/app-shell";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageState } from "@/components/page-state";
import { PageSkeleton } from "@/components/skeleton";
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

import { GarageFormSheet } from "./garage-form-sheet";
import { useGarageController } from "./garage-controller";

export default function GaragePage() {
  const {
    account,
    activeAccount,
    accessLoading,
    motorcycles,
    loadingData,
    sheetOpen,
    form,
    saving,
    busyId,
    error,
    message,
    primaryBike,
    setSheetOpen,
    setForm,
    openCreate,
    openEdit,
    saveMotorcycle,
    deleteMotorcycle,
  } = useGarageController();

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
          <PageState
            tone="restricted"
            icon={<ShieldAlert />}
            title="Akun member aktif diperlukan"
            description="Motorcycle Passport hanya tersedia untuk member Revolt Riders yang sudah aktif."
            action={
              <a className="primary-action" href={account ? "/profil" : "/login"}>
                {account ? "LIHAT STATUS AKUN" : "MASUK"}
              </a>
            }
          />
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

        {error && <p className="error-message" role="alert">{error}</p>}
        {message && (
          <p className="success-message" role="status" aria-live="polite">
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
          <PageState
            compact
            icon={<Wrench />}
            title="Garage masih kosong"
            description="Tambahkan motor pertama. Unit pertama otomatis menjadi primary bike."
            action={
              <button type="button" className="primary-action" onClick={openCreate}>
                TAMBAH MOTOR
              </button>
            }
          />
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

      <GarageFormSheet
        open={sheetOpen}
        form={form}
        saving={saving}
        onClose={() => setSheetOpen(false)}
        onFormChange={setForm}
        onSubmit={saveMotorcycle}
      />

    </AppShell>
  );
}
