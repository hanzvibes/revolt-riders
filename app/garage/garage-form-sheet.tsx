"use client";

import { ModalSheet } from "@/components/modal-sheet";
import type {
  Dispatch,
  FormEvent,
  SetStateAction,
} from "react";
import {
  motorcycleStyles,
  type MotorcycleForm,
} from "./garage-model";

export function GarageFormSheet({
  open,
  form,
  saving,
  onClose,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  form: MotorcycleForm;
  saving: boolean;
  onClose: () => void;
  onFormChange: Dispatch<
    SetStateAction<MotorcycleForm>
  >;
  onSubmit: (event: FormEvent) => Promise<void>;
}) {
  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      eyebrow={
        form.id
          ? "Edit Motorcycle Passport"
          : "Motorcycle Passport"
      }
      title={form.id ? "Edit Motor" : "Tambah Motor"}
    >
      <form className="garage-form" onSubmit={onSubmit}>
        <div className="garage-form-grid">
          <label>
            <span>Nickname motor</span>
            <input
              value={form.nickname}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  nickname: event.target.value,
                }))
              }
              placeholder="Contoh: Blackbird"
              maxLength={60}
            />
          </label>

          <label>
            <span>Brand *</span>
            <input
              value={form.brand}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  brand: event.target.value,
                }))
              }
              placeholder="Honda"
              required
              maxLength={60}
            />
          </label>

          <label>
            <span>Model *</span>
            <input
              value={form.model}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  model: event.target.value,
                }))
              }
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
                onFormChange((current) => ({
                  ...current,
                  productionYear: event.target.value,
                }))
              }
              placeholder="2008"
            />
          </label>

          <label>
            <span>Style</span>
            <select
              value={form.style}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  style: event.target.value,
                }))
              }
            >
              <option value="">Pilih style</option>
              {motorcycleStyles.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
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
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  engineCc: event.target.value,
                }))
              }
              placeholder="200"
            />
          </label>

          <label className="garage-form-wide">
            <span>Warna</span>
            <input
              value={form.color}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  color: event.target.value,
                }))
              }
              placeholder="Black / Raw Metal"
              maxLength={60}
            />
          </label>

          <label className="garage-form-wide">
            <span>Catatan build</span>
            <textarea
              value={form.notes}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
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
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  isPrimary: event.target.checked,
                }))
              }
            />
            <span>
              <b>Primary bike</b>
              <small>
                Tampil sebagai motor utama di Garage.
              </small>
            </span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.isVisibleToMembers}
              onChange={(event) =>
                onFormChange((current) => ({
                  ...current,
                  isVisibleToMembers:
                    event.target.checked,
                }))
              }
            />
            <span>
              <b>Visible ke member</b>
              <small>
                Sesama member aktif dapat melihat motorcycle
                passport ini.
              </small>
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="primary-action garage-save-action"
          disabled={saving}
        >
          {saving
            ? "MENYIMPAN…"
            : form.id
              ? "SIMPAN PERUBAHAN"
              : "TAMBAH KE GARAGE"}
        </button>
      </form>
    </ModalSheet>
  );
}
