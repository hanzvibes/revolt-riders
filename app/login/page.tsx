"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberId, setMemberId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }: { data: { user: User | null } }) => {
        if (data.user) setMessage(`Sudah masuk sebagai ${data.user.email ?? "member"}.`);
      });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.replace("/profil");
        router.refresh();
      } else {
        const cleanId = memberId.trim().toUpperCase();
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { member_external_id: cleanId },
          },
        });
        if (signUpError) {
          if (
            signUpError.message.toLowerCase().includes("member_external_id") ||
            signUpError.message.toLowerCase().includes("duplicate")
          ) {
            throw new Error(
              `ID ${cleanId} sedang dalam proses verifikasi atau sudah pernah diajukan. Jika salah input, pengurus dapat membatalkan permintaan sebelumnya di menu Admin agar ID dapat didaftarkan ulang.`
            );
          }
          throw signUpError;
        }
        setMessage("Pendaftaran diterima. Cek email untuk verifikasi, lalu tunggu validasi pengurus.");
      }
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Autentikasi gagal.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <Link href="/" className="back-link" title="Kembali ke Beranda">
        <ArrowLeft />
        <span>Beranda</span>
      </Link>

      <section className="auth-card">
        {/* Perfectly centered circular logo badge */}
        <div className="auth-logo-badge">
          <Image
            src="/revolt-riders-logo.jpg"
            alt="Revolt Riders Logo"
            width={104}
            height={104}
            priority
          />
        </div>

        {/* Tab switch */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
              setMessage("");
            }}
          >
            Daftar Baru
          </button>
        </div>

        <span className="auth-badge">
          <Sparkles size={11} />
          {mode === "login" ? "Member Access" : "Registrasi Anggota"}
        </span>

        <h1>{mode === "login" ? "Masuk ke Revolt" : "Daftar Akun Member"}</h1>
        <p>
          {mode === "login"
            ? "Gunakan akun resmi yang sudah diverifikasi oleh pengurus."
            : "Member ID akan dicocokkan dengan basis data keanggotaan resmi."}
        </p>

        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="auth-field">
              <label>
                <span>Member ID Resmi</span>
                <small>Contoh: RR-028</small>
              </label>
              <div className="auth-input-wrap">
                <UserPlus />
                <input
                  value={memberId}
                  onChange={(event) => setMemberId(event.target.value.toUpperCase())}
                  placeholder="RR-XXX"
                  required
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label>
              <span>Email Akun</span>
            </label>
            <div className="auth-input-wrap">
              <Mail />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@email.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label>
              <span>Password</span>
              {mode === "register" && <small>Minimal 8 karakter</small>}
            </label>
            <div className="auth-input-wrap">
              <LockKeyhole />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "login" ? "••••••••" : "Buat password aman"}
                minLength={8}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
                aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="success-message" role="status">
              <ShieldCheck />
              <span>{message}</span>
            </p>
          )}

          <button type="submit" className="primary-action" disabled={loading}>
            {loading ? (
              <>
                <span className="spin" style={{ display: "inline-block" }}>
                  ⟳
                </span>
                <span>Memproses…</span>
              </>
            ) : mode === "login" ? (
              "MASUK SEKARANG"
            ) : (
              "DAFTARKAN AKUN"
            )}
          </button>
        </form>

        <div className="auth-footer-link">
          <span>{mode === "login" ? "Belum memiliki akun terdaftar?" : "Sudah memiliki akun?"}</span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setMessage("");
            }}
          >
            {mode === "login" ? "Daftar di sini" : "Masuk akun"}
          </button>
        </div>

        <p className="auth-help-note">
          {mode === "login"
            ? "Lupa password atau akun belum disetujui? Silakan hubungi pengurus klub."
            : "Data registrasi akan ditinjau oleh Admin/Superadmin sebelum akun dapat digunakan."}
        </p>
      </section>
    </main>
  );
}
