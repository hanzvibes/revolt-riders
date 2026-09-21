"use client";

import { AppShell } from "@/components/app-shell";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  LogIn,
  PartyPopper,
  ScanLine,
  User,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

type CheckinResult = {
  attendance_id: string;
  event_id: string;
  event_title: string;
  already_checked_in: boolean;
  checked_in_at: string;
  member_name: string;
};

function extractCode(input: string): string {
  let clean = input.trim();
  if (clean.toLowerCase().includes("code=")) {
    try {
      const url = new URL(clean, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      clean = url.searchParams.get("code") || clean;
    } catch {
      const match = clean.match(/[?&]code=([^&#]+)/i);
      if (match) clean = decodeURIComponent(match[1]);
    }
  }
  return clean.trim().toUpperCase();
}

function CheckInContent() {
  const searchParams = useSearchParams();
  const urlParamCode = searchParams.get("code") || "";
  const { account, loading: accessLoading } = useMemberAccess();

  const [code, setCode] = useState(extractCode(urlParamCode));
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const frameRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const hasAutoSubmitted = useRef(false);

  const ready = account?.status === "active";

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const submitCode = useCallback(async (rawCode: string) => {
    const normalizedCode = extractCode(rawCode);
    if (!normalizedCode) return;
    setSaving(true);
    setError("");
    setResult(null);

    try {
      const { data, error: rpcError } = await getSupabaseBrowserClient().rpc(
        "check_in_with_code",
        { p_code: normalizedCode }
      );
      if (rpcError) throw rpcError;
      const rows = (data ?? []) as CheckinResult[];
      const firstRow = rows[0];
      if (!firstRow) {
        throw new Error("Respon kehadiran tidak valid.");
      }
      setResult(firstRow);
      setCode("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Kode check-in tidak dapat diproses."
      );
    } finally {
      setSaving(false);
    }
  }, []);

  // Auto check-in trigger when ?code=... is present and user is authenticated & active
  useEffect(() => {
    if (accessLoading || !ready) return;
    const targetCode = extractCode(urlParamCode);
    if (targetCode && !hasAutoSubmitted.current && !result && !saving) {
      hasAutoSubmitted.current = true;
      void submitCode(targetCode);
    }
  }, [accessLoading, ready, urlParamCode, result, saving, submitCode]);

  const startCamera = async () => {
    setError("");
    setResult(null);
    setCameraMessage("");
    const Detector = (
      window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;

    if (!Detector) {
      setCameraMessage(
        "Pemindai QR kamera internal browser memerlukan Chrome Android. Untuk iPhone / browser lain, cukup arahkan kamera bawaan HP Anda langsung ke QR Code."
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("Kamera tidak tersedia pada perangkat ini. Gunakan input kode di bawah.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      detectorRef.current = new Detector({ formats: ["qr_code"] });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      scanningRef.current = true;
      setCameraOpen(true);
      setCameraMessage("Arahkan kamera ke QR check-in yang ditampilkan pengurus.");

      const scanFrame = async () => {
        const video = videoRef.current;
        const detector = detectorRef.current;
        if (!scanningRef.current || !video || !detector) return;
        try {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const results = await detector.detect(video);
            const found = results.find((item) => item.rawValue.trim());
            if (found) {
              stopCamera();
              const extracted = extractCode(found.rawValue);
              setCode(extracted);
              await submitCode(found.rawValue);
              return;
            }
          }
        } catch {
          // Continue scanning
        }
        if (scanningRef.current) {
          frameRef.current = requestAnimationFrame(() => void scanFrame());
        }
      };
      frameRef.current = requestAnimationFrame(() => void scanFrame());
    } catch (caught) {
      stopCamera();
      setCameraMessage(
        caught instanceof Error && caught.name === "NotAllowedError"
          ? "Izin kamera ditolak. Izinkan akses kamera atau gunakan input kode."
          : "Kamera belum dapat dibuka. Coba lagi atau gunakan input kode."
      );
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await submitCode(code);
  };

  const loginRedirectUrl = urlParamCode
    ? `/login?redirect=${encodeURIComponent(`/check-in?code=${extractCode(urlParamCode)}`)}`
    : "/login";

  return (
    <AppShell active="Check-in" title="Check-in">
      <div className="page-wrap">
        <section className="form-card card checkin-card">
          <div className="form-heading">
            <ScanLine />
            <span>
              <em>Presensi agenda</em>
              <h2>Check-in Member</h2>
              <p>
                Scan QR dari pengurus dengan kamera HP atau masukkan kode agenda
                sebagai alternatif.
              </p>
            </span>
          </div>

          {accessLoading ? (
            <p className="system-message">Memeriksa status akun member…</p>
          ) : !ready ? (
            <div className="notice checkin-access-notice">
              <p className="checkin-access-copy">
                Akun member aktif diperlukan untuk mencatat kehadiran.
              </p>
              <a
                href={account ? "/profil" : loginRedirectUrl}
                className="primary-action checkin-access-action"
              >
                <LogIn size={15} />
                {account ? "Lihat Status Akun" : "Masuk Sekarang untuk Check-in"}
              </a>
            </div>
          ) : (
            <>
              {/* Result card if check-in succeeded or was already checked in */}
              {result && (
                <div
                  className="checkin-feedback-card"
                  role="status"
                  aria-live="polite"
                >
                  <div className="checkin-feedback-head">
                    {result.already_checked_in ? (
                      <CheckCircle2 size={24} aria-hidden="true" />
                    ) : (
                      <PartyPopper size={24} aria-hidden="true" />
                    )}
                    <h3>
                      {result.already_checked_in
                        ? "Kehadiran Sudah Pernah Tercatat"
                        : "Check-in Berhasil!"}
                    </h3>
                  </div>
                  <div className="checkin-feedback-meta">
                    <div>
                      <ScanLine size={14} aria-hidden="true" />
                      <strong>Agenda:</strong> {result.event_title}
                    </div>
                    <div>
                      <User size={14} aria-hidden="true" />
                      <strong>Member:</strong> {result.member_name}
                    </div>
                    <div>
                      <Clock size={14} aria-hidden="true" />
                      <strong>Waktu Check-in:</strong>{" "}
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Jakarta",
                      }).format(new Date(result.checked_in_at))}{" "}
                      WIB
                    </div>
                  </div>
                  <p className="checkin-feedback-copy">
                    {result.already_checked_in
                      ? "Kehadiranmu untuk agenda ini sudah tersimpan dengan aman. Selamat menikmati acara!"
                      : "Kehadiranmu telah resmi tercatat di sistem. Selamat menikmati agenda bersama brotherhood!"}
                  </p>
                </div>
              )}

              {error && (
                <p className="error-message checkin-inline-message">
                  {error}
                </p>
              )}

              {/* In-app scanner & manual input */}
              <div className="scanner-stage checkin-scanner-stage">
                <video
                  ref={videoRef}
                  className={cameraOpen ? "camera-live" : ""}
                  playsInline
                  muted
                  aria-label="Pratinjau kamera pemindai QR"
                />
                <div className="scanner-frame" aria-hidden="true" />
                <span>
                  {saving
                    ? "MEMPROSES KEHADIRAN…"
                    : cameraOpen
                    ? "MEMINDAI QR…"
                    : "SIAP MEMINDAI"}
                </span>
              </div>

              <button
                type="button"
                className="dark-action camera-button"
                onClick={() => (cameraOpen ? stopCamera() : void startCamera())}
                disabled={saving}
              >
                {cameraOpen ? (
                  <>
                    <CameraOff />
                    TUTUP KAMERA
                  </>
                ) : (
                  <>
                    <Camera />
                    SCAN QR DENGAN KAMERA
                  </>
                )}
              </button>

              {cameraMessage && (
                <p className="system-message checkin-camera-message">
                  {cameraMessage}
                </p>
              )}

              <div className="manual-divider">
                <span>atau masukkan kode</span>
              </div>

              <form onSubmit={submit}>
                <label>
                  Kode check-in
                  <input
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.toUpperCase())
                    }
                    placeholder="Contoh: RR-AB12-CD34"
                    autoCapitalize="characters"
                    required
                  />
                </label>
                <button className="primary-action" disabled={saving}>
                  {saving ? "MEMPROSES…" : "CHECK-IN SEKARANG"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <AppShell active="Check-in" title="Check-in">
          <div className="page-wrap">
            <p className="system-message">Memuat pemindai check-in…</p>
          </div>
        </AppShell>
      }
    >
      <CheckInContent />
    </Suspense>
  );
}
