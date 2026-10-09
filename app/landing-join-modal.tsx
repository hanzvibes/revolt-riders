"use client";

import { InstagramIcon } from "@/components/icons/instagram";
import { ModalSheet } from "@/components/modal-sheet";
import { CalendarDays, CheckCircle2, MapPin, Phone, User } from "lucide-react";
import type { FormEvent } from "react";

type LandingJoinModalProps = {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  fullName: string;
  birthPlace: string;
  birthDate: string;
  city: string;
  instagram: string;
  whatsapp: string;
  setFullName: (value: string) => void;
  setBirthPlace: (value: string) => void;
  setBirthDate: (value: string) => void;
  setCity: (value: string) => void;
  setInstagram: (value: string) => void;
  setWhatsapp: (value: string) => void;
  agreement: boolean;
  setAgreement: (value: boolean) => void;
  formSubmitting: boolean;
  formError: string;
  formSuccess: boolean;
};

export function LandingJoinModal({ open, onClose, onReset, onSubmit, fullName, setFullName, birthPlace, setBirthPlace, birthDate, setBirthDate, city, setCity, instagram, setInstagram, whatsapp, setWhatsapp, agreement, setAgreement, formSubmitting, formError, formSuccess }: LandingJoinModalProps) {
  return (
    <>
      {/* 14. Join With Us Modal Sheet */}
      <ModalSheet
        open={open}
        onClose={onClose}
        eyebrow="MEMBERSHIP REGISTRATION"
        title="Pendaftaran Anggota Revolt Riders"
      >
        <div className="join-modal-body">
          {formSuccess ? (
            <div className="join-success-card" role="status" aria-live="polite">
              <CheckCircle2 size={52} />
              <h3>Pendaftaran Berhasil Dikirim</h3>
              <p>
                Terima kasih telah mendaftar, <b>{fullName}</b>. Formulir pendaftaran Anda telah kami terima. Pengurus
                Revolt Riders akan segera menghubungi Anda melalui WhatsApp di nomor <b>{whatsapp}</b> untuk verifikasi selanjutnya.
              </p>
              <button
                type="button"
                className="btn-hero-primary"
                style={{ width: "100%", maxWidth: 220, justifyContent: "center" }}
                onClick={onReset}
              >
                Selesai
              </button>
            </div>
          ) : (
            <>
              <p className="join-modal-intro">
                Silakan lengkapi data pendaftaran di bawah ini. Pengurus akan memverifikasi data dan menghubungi Anda melalui WhatsApp.
              </p>

              <form
                className="join-form-stack"
                onSubmit={onSubmit}
                aria-busy={formSubmitting}
              >
                <div className="join-field-group">
                  <label className="join-field-label" htmlFor="join-full-name">
                    <span>Nama Lengkap</span>
                    <small>Sesuai KTP/SIM</small>
                  </label>
                  <div className="join-input-wrap">
                    <User />
                    <input
                      id="join-full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      required
                      minLength={3}
                    />
                  </div>
                </div>

                <div className="join-form-row">
                  <div className="join-field-group">
                    <label className="join-field-label" htmlFor="join-birth-place">
                      <span>Tempat Lahir</span>
                    </label>
                    <div className="join-input-wrap">
                      <MapPin />
                      <input
                        id="join-birth-place"
                        value={birthPlace}
                        onChange={(e) => setBirthPlace(e.target.value)}
                        placeholder="Situbondo"
                        required
                      />
                    </div>
                  </div>

                  <div className="join-field-group">
                    <label className="join-field-label" htmlFor="join-birth-date">
                      <span>Tanggal Lahir</span>
                    </label>
                    <div className="join-input-wrap">
                      <CalendarDays />
                      <input
                        id="join-birth-date"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="join-form-row">
                  <div className="join-field-group">
                    <label className="join-field-label" htmlFor="join-city">
                      <span>Domisili / Kota</span>
                    </label>
                    <div className="join-input-wrap">
                      <MapPin />
                      <input
                        id="join-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Contoh: Situbondo Kota"
                        required
                      />
                    </div>
                  </div>

                  <div className="join-field-group">
                    <label className="join-field-label" htmlFor="join-instagram">
                      <span>Akun Instagram</span>
                    </label>
                    <div className="join-input-wrap">
                      <InstagramIcon />
                      <input
                        id="join-instagram"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@username"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="join-field-group">
                  <label className="join-field-label" htmlFor="join-whatsapp">
                    <span>Nomor WhatsApp Aktif</span>
                    <small>Untuk verifikasi pengurus</small>
                  </label>
                  <div className="join-input-wrap">
                    <Phone />
                    <input
                      id="join-whatsapp"
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="081234567890"
                      required
                      minLength={10}
                    />
                  </div>
                </div>

                <div className="join-agreement-box">
                  <input
                    type="checkbox"
                    id="agreement-check"
                    checked={agreement}
                    onChange={(e) => setAgreement(e.target.checked)}
                    required
                  />
                  <label htmlFor="agreement-check">
                    Saya menyatakan bahwa data yang diisi adalah benar serta berkomitmen mematuhi kode etik dan tata tertib Revolt Riders.
                  </label>
                </div>

                {formError && (
                  <div className="error-message" role="alert">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-join-submit"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Mengirim Pendaftaran…" : "KIRIM PENDAFTARAN"}
                </button>
              </form>
            </>
          )}
        </div>
      </ModalSheet>
    </>
  );
}
