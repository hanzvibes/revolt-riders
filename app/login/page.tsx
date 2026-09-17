"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [memberId, setMemberId] = useState("");
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => { void getSupabaseBrowserClient().auth.getUser().then(({ data }: { data: { user: User | null } }) => { if (data.user) setMessage(`Sudah masuk sebagai ${data.user.email ?? "member"}.`); }); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.replace("/profil"); router.refresh();
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
          if (signUpError.message.toLowerCase().includes("member_external_id") || signUpError.message.toLowerCase().includes("duplicate")) {
            throw new Error(`ID ${cleanId} sedang dalam proses verifikasi atau sudah pernah diajukan. Jika salah input, pengurus dapat membatalkan permintaan sebelumnya di menu Admin agar ID dapat didaftarkan ulang.`);
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
  return <main className="auth-page"><Link href="/" className="back-link"><ArrowLeft/>Kembali</Link><section className="auth-card"><Image src="/revolt-riders-logo.jpg" alt="Revolt Riders" width={128} height={128} priority/><em>MEMBER ACCESS</em><h1>{mode === "login" ? "Masuk ke Revolt" : "Daftar akun member"}</h1><p>{mode === "login" ? "Gunakan akun yang sudah diverifikasi pengurus." : "Member ID akan dicocokkan dengan data resmi club."}</p><form onSubmit={submit}>{mode === "register" && <label>Member ID<div><UserPlus/><input value={memberId} onChange={(event) => setMemberId(event.target.value)} placeholder="RR-014" required/></div></label>}<label>Email<div><Mail/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" required/></div></label><label>Password<div><LockKeyhole/><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required/></div></label>{error && <p className="error-message">{error}</p>}{message && <p className="success-message"><ShieldCheck/>{message}</p>}<button className="primary-action" disabled={loading}>{loading ? "Memproses…" : mode === "login" ? "MASUK" : "DAFTAR AKUN"}</button></form><button className="mode-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setMessage(""); }}>{mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}</button></section></main>;
}
