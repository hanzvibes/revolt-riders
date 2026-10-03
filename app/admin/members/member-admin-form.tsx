import { ModalSheet } from "@/components/modal-sheet";
import { Check, Clock, Gauge, KeyRound, ShieldCheck, UsersRound } from "lucide-react";
import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import {
  roles,
  type MemberAccount,
  type MemberForm,
} from "./member-admin-model";

type MemberAdminFormProps = {
  open: boolean;
  onClose: () => void;
  editing: boolean;
  form: MemberForm;
  setForm: Dispatch<SetStateAction<MemberForm>>;
  editingAccount: MemberAccount | null;
  accountRole: string;
  setAccountRole: (role: string) => void;
  accountStatus: "active" | "inactive";
  setAccountStatus: (status: "active" | "inactive") => void;
  canManageRole: boolean;
  canResetSelectedPassword: boolean;
  newPassword: string;
  setNewPassword: (password: string) => void;
  showPasswordReset: boolean;
  setShowPasswordReset: (show: boolean) => void;
  resettingPassword: boolean;
  onResetPassword: () => void | Promise<void>;
  error: string;
  saving: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function MemberAdminForm({
  open,
  onClose,
  editing,
  form,
  setForm,
  editingAccount,
  accountRole,
  setAccountRole,
  accountStatus,
  setAccountStatus,
  canManageRole,
  canResetSelectedPassword,
  newPassword,
  setNewPassword,
  showPasswordReset,
  setShowPasswordReset,
  resettingPassword,
  onResetPassword,
  error,
  saving,
  onSubmit,
}: MemberAdminFormProps) {
  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      eyebrow={editing ? "EDIT MEMBER" : "MEMBER BARU"}
      title={
        editing
          ? `${form.memberId} · ${form.fullName || "Member"}`
          : "Tambah data member baru"
      }
    >
      <form className="sheet-form member-sheet-form member-modal-form" onSubmit={onSubmit}>
        <div className="member-modal-section">
          <div className="member-modal-section-title">
            <UsersRound size={13} style={{ color: "var(--red)" }} />
            <span>1. Profil Member Resmi</span>
          </div>

          <div className="member-modal-grid-2">
            <label>
              Member ID
              <input
                value={form.memberId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    memberId: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="RR-001"
                pattern="RR-[0-9]{3,}"
                disabled={editing}
                required
              />
            </label>

            <label>
              Nama Lengkap
              <input
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                maxLength={120}
                placeholder="Nama lengkap sesuai KTP"
                required
              />
            </label>
          </div>

          <div className="member-modal-grid-2">
            <label>
              Nickname / Panggilan
              <input
                value={form.nickname}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nickname: event.target.value,
                  }))
                }
                maxLength={80}
                placeholder="Nama panggilan di club"
              />
            </label>

            <label>
              Jabatan Club
              <input
                list="club-role-options"
                value={form.clubRole}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    clubRole: event.target.value,
                  }))
                }
                maxLength={80}
                placeholder="PRESIDENT, FOUNDER, dll."
              />
              <datalist id="club-role-options">
                <option value="PRESIDENT" />
                <option value="FOUNDER" />
                <option value="EXCECUTOR" />
                <option value="NEGOSIATOR" />
                <option value="CAPROS" />
                <option value="PROSPEK" />
                <option value="VIRGIN" />
                <option value="LIFE MEMBER" />
              </datalist>
            </label>
          </div>

          <label>
            Tanggal Bergabung
            <input
              type="date"
              value={form.joinDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  joinDate: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className="member-modal-section">
          <div className="member-modal-section-title">
            <Gauge size={13} style={{ color: "var(--red)" }} />
            <span>2. Data Kendaraan & Jarak Tempuh</span>
          </div>

          <div className="member-modal-grid-2">
            <label>
              Kendaraan / Motor
              <input
                value={form.motorcycle}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    motorcycle: event.target.value,
                  }))
                }
                maxLength={120}
                placeholder="Contoh: Yamaha R15 / CB150R"
              />
            </label>

            <label>
              Kota Domisili
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                maxLength={80}
                placeholder="Situbondo"
              />
            </label>
          </div>

          <label>
            Total KM Komunitas
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.totalKm}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  totalKm: event.target.value,
                }))
              }
              required
            />
          </label>
        </div>

        {editing && editingAccount && (
          <div className="member-modal-section">
            <div className="member-modal-section-title">
              <ShieldCheck size={13} style={{ color: "var(--red)" }} />
              <span>3. Akses Akun Aplikasi</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "var(--rr-type-caption)",
                  background: "#f0fdf4",
                  color: "#166534",
                  padding: "2px 7px",
                  borderRadius: 4,
                  fontWeight: 800,
                }}
              >
                Terhubung
              </span>
            </div>

            <div className="member-modal-grid-2">
              {canManageRole ? (
                <label>
                  Role Akun Aplikasi
                  <select
                    value={accountRole}
                    onChange={(event) => setAccountRole(event.target.value)}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  Role Akun Aplikasi
                  <input value={accountRole.replace("_", " ")} disabled />
                </label>
              )}

              <label>
                Status Login Akun
                <select
                  value={accountStatus}
                  onChange={(event) =>
                    setAccountStatus(event.target.value as "active" | "inactive")
                  }
                >
                  <option value="active">Aktif (Dapat Login)</option>
                  <option value="inactive">Nonaktif (Diblokir)</option>
                </select>
              </label>
            </div>

            <div
              style={{
                marginTop: 12,
                padding: "12px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 8,
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "var(--ink)",
                }}
              >
                <KeyRound size={14} style={{ color: "var(--red)" }} />
                <span>Reset Password Member</span>
              </div>

              {canResetSelectedPassword ? (
                <>
                  <p
                    style={{
                      margin: "0 0 9px",
                      fontSize: "0.7rem",
                      lineHeight: 1.5,
                      color: "#64748b",
                    }}
                  >
                    Gunakan saat member lupa password. Password lama langsung
                    diganti setelah dikonfirmasi.
                  </p>

                  {showPasswordReset ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 8,
                        alignItems: "end",
                      }}
                    >
                      <label style={{ margin: 0 }}>
                        Password Baru
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          minLength={8}
                          autoComplete="new-password"
                          placeholder="Minimal 8 karakter"
                          disabled={resettingPassword}
                        />
                      </label>
                      <button
                        type="button"
                        className="outline-action"
                        onClick={() => void onResetPassword()}
                        disabled={resettingPassword || newPassword.length < 8}
                        style={{ minHeight: 42, whiteSpace: "nowrap" }}
                      >
                        <KeyRound size={13} />
                        {resettingPassword ? "MEMPROSES…" : "RESET"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="outline-action"
                      onClick={() => setShowPasswordReset(true)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <KeyRound size={13} />
                      RESET PASSWORD
                    </button>
                  )}
                </>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.7rem",
                    lineHeight: 1.5,
                    color: "#64748b",
                  }}
                >
                  Hanya Superadmin yang dapat mereset password akun Admin
                  atau Superadmin.
                </p>
              )}
            </div>
          </div>
        )}

        {editing && !editingAccount && (
          <div className="member-modal-section">
            <div className="member-modal-section-title">
              <ShieldCheck size={13} style={{ color: "#94a3b8" }} />
              <span>3. Akses Akun Aplikasi</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#64748b",
                fontSize: "0.75rem",
                padding: "10px 12px",
                background: "#f8fafc",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
            >
              <Clock size={15} style={{ color: "#94a3b8", flexShrink: 0 }} />
              <span>
                Member ini belum mendaftarkan akun login di aplikasi. Akun akan terhubung otomatis saat member mendaftar dengan ID RR ini.
              </span>
            </div>
          </div>
        )}

        {error && <p className="error-message" style={{ marginTop: 4 }}>{error}</p>}

        <div className="sheet-actions" style={{ marginTop: 12 }}>
          <button className="primary-action" disabled={saving}>
            {saving ? (
              "MENYIMPAN…"
            ) : (
              <>
                <Check />
                SIMPAN MEMBER
              </>
            )}
          </button>
          <button
            type="button"
            className="outline-action"
            onClick={onClose}
          >
            BATAL
          </button>
        </div>
      </form>
    </ModalSheet>
  );
}
