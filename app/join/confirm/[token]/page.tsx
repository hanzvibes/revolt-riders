"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";

type JoinRequestData = {
  id: string;
  full_name: string;
  birth_place: string;
  birth_date: string;
  city: string;
  instagram: string;
  whatsapp: string;
  status: "pending" | "accepted" | "confirmed" | "active" | "rejected" | "expired";
  confirmation_token: string;
  accepted_at: string | null;
  confirmed_at: string | null;
  activated_at: string | null;
  assigned_member_id: string | null;
  rejection_reason: string | null;
};

export default function CandidateConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [request, setRequest] = useState<JoinRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRequest() {
      try {
        setLoading(true);
        setError("");
        const supabase = getSupabaseBrowserClient();

        const { data, error: qErr } = await supabase
          .from("join_requests")
          .select("*")
          .eq("confirmation_token", token)
          .maybeSingle();

        if (qErr) throw qErr;

        if (!data) {
          setError("Tautan konfirmasi tidak valid atau data pendaftaran tidak ditemukan.");
          return;
        }

        if (active) {
          setRequest(data as JoinRequestData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data pendaftaran.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (token) {
      void loadRequest();
    }
    return () => {
      active = false;
    };
  }, [token]);

  const handleConfirm = async () => {
    if (!request) return;
    setConfirming(true);
    setError("");

    try {
      const supabase = getSupabaseBrowserClient();

      // Call RPC
      const { data, error: rpcErr } = await supabase.rpc("confirm_join_request", {
        p_token: token,
      });

      if (rpcErr) throw rpcErr;

      setSuccessMsg(
        (data as { message?: string })?.message ||
          "Terima kasih! Konfirmasi komitmen Anda telah diterima. Pengurus akan mengaktivasi dan menerbitkan Nomor Anggota (ID RR) Anda."
      );

      // Refresh data
      setRequest((prev) => (prev ? { ...prev, status: "confirmed", confirmed_at: new Date().toISOString() } : null));
    } catch (err) {
      // Fallback direct update
      try {
        const supabase = getSupabaseBrowserClient();
        const { error: updErr } = await supabase
          .from("join_requests")
          .update({
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("confirmation_token", token);

        if (updErr) throw updErr;

        setSuccessMsg("Terima kasih! Konfirmasi komitmen Anda telah diterima.");
        setRequest((prev) => (prev ? { ...prev, status: "confirmed" } : null));
      } catch (fallbackErr) {
        setError(
          fallbackErr instanceof Error ? fallbackErr.message : "Gagal mengonfirmasi komitmen. Silakan coba lagi."
        );
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <main className="auth-page" style={{ padding: "40px 16px" }}>
      <Link href="/" className="back-link">
        <ArrowLeft size={16} />
        <span>Ke Beranda</span>
      </Link>

      <section className="auth-card" style={{ maxWidth: 480, margin: "20px auto" }}>
        <div className="auth-logo-badge">
          <Image src="/revolt-riders-logo.jpg" alt="Revolt Riders" width={104} height={104} priority />
        </div>

        <span className="auth-badge">
          <Sparkles size={11} /> Konfirmasi Keanggotaan
        </span>

        <h1>Komitmen Bergabung</h1>

        {loading ? (
          <p className="system-message" style={{ margin: "20px 0" }}>
            Memeriksa tautan konfirmasi Anda…
          </p>
        ) : error && !request ? (
          <div style={{ margin: "20px 0" }}>
            <p className="error-message" style={{ margin: "0 0 16px" }}>
              {error}
            </p>
            <Link href="/" className="primary-action" style={{ textDecoration: "none" }}>
              KEMBALI KE BERANDA
            </Link>
          </div>
        ) : request ? (
          <div style={{ textAlign: "left", marginTop: 16 }}>
            {/* Status Info Banner */}
            {request.status === "accepted" && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 12,
                  padding: "14px",
                  marginBottom: 18,
                  color: "#166534",
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, marginBottom: 4 }}>
                  <CheckCircle2 size={16} />
                  <span>Pendaftaran Anda Telah Disetujui Pengurus!</span>
                </div>
                Silakan baca komitmen persaudaraan di bawah dan klik tombol konfirmasi untuk menyatakan kesiapan Anda bergabung.
              </div>
            )}

            {request.status === "confirmed" && (
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 12,
                  padding: "14px",
                  marginBottom: 18,
                  color: "#1e40af",
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, marginBottom: 4 }}>
                  <UserCheck size={16} />
                  <span>Komitmen Dikonfirmasi</span>
                </div>
                Anda telah mengonfirmasi kesediaan bergabung. Pengurus sedang memproses penerbitan ID RR resmi Anda.
              </div>
            )}

            {request.status === "active" && (
              <div
                style={{
                  background: "#fdf2f8",
                  border: "1px solid #fbcfe8",
                  borderRadius: 12,
                  padding: "14px",
                  marginBottom: 18,
                  color: "#9d174d",
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, marginBottom: 4 }}>
                  <ShieldCheck size={16} />
                  <span>Akun Member Resmi Aktif!</span>
                </div>
                Selamat! Anda telah resmi menjadi bagian dari Revolt Riders dengan nomor anggota{" "}
                <b>{request.assigned_member_id}</b>. Silakan login ke Portal Member.
              </div>
            )}

            {request.status === "expired" && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 12,
                  padding: "14px",
                  marginBottom: 18,
                  color: "#92400e",
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, marginBottom: 4 }}>
                  <Clock size={16} />
                  <span>Batas Waktu Konfirmasi Telah Habis</span>
                </div>
                Masa berlaku konfirmasi (7 hari) telah kedaluwarsa. Anda dapat mengajukan pendaftaran kembali di landing page.
              </div>
            )}

            {/* Candidate Summary Card */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 18,
                fontSize: "0.76rem",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <small style={{ color: "#64748b", display: "block" }}>Nama Lengkap</small>
                  <strong style={{ color: "#0f172a" }}>{request.full_name}</strong>
                </div>
                <div>
                  <small style={{ color: "#64748b", display: "block" }}>Domisili / Kota</small>
                  <strong style={{ color: "#0f172a" }}>{request.city}</strong>
                </div>
                <div>
                  <small style={{ color: "#64748b", display: "block" }}>WhatsApp</small>
                  <strong style={{ color: "#0f172a" }}>{request.whatsapp}</strong>
                </div>
                <div>
                  <small style={{ color: "#64748b", display: "block" }}>Instagram</small>
                  <strong style={{ color: "#0f172a" }}>@{request.instagram}</strong>
                </div>
              </div>
            </div>

            {/* Club Commitments */}
            {request.status === "accepted" && (
              <>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "16px",
                    marginBottom: 18,
                  }}
                >
                  <h4 style={{ fontSize: "0.84rem", fontWeight: 850, margin: "0 0 8px", color: "#0f172a" }}>
                    Ikrar Persaudaraan Revolt Riders
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.74rem", color: "#475569", lineHeight: 1.6 }}>
                    <li>Menjunjung tinggi nilai persaudaraan, saling menghargai, dan tidak membeda-bedakan motor.</li>
                    <li>Mengutamakan keselamatan (*Safety First*) dan tertib berlalu lintas di manapun berada.</li>
                    <li>Menjaga nama baik komunitas Revolt Riders baik di jalan raya maupun media sosial.</li>
                    <li>Siap berpartisipasi aktif dalam kegiatan touring, kopdar, dan bakti sosial komunitas.</li>
                  </ul>
                </div>

                {error && <p className="error-message">{error}</p>}
                {successMsg && <p className="success-message">{successMsg}</p>}

                <button
                  type="button"
                  className="primary-action"
                  style={{ width: "100%", minHeight: 46 }}
                  disabled={confirming}
                  onClick={handleConfirm}
                >
                  {confirming ? "Mengonfirmasi…" : "SAYA KONFIRMASI BERGABUNG"}
                </button>
              </>
            )}

            {request.status === "active" && (
              <Link href="/login" className="primary-action" style={{ width: "100%", minHeight: 46, textDecoration: "none" }}>
                MASUK KE PORTAL MEMBER
              </Link>
            )}

            {request.status === "expired" && (
              <Link href="/" className="primary-action" style={{ width: "100%", minHeight: 46, textDecoration: "none" }}>
                DAFTAR ULANG DI LANDING PAGE
              </Link>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
