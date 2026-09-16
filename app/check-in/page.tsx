"use client";

import { AppShell } from "@/components/app-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Camera, CameraOff, CheckCircle2, ScanLine, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

type BarcodeDetectorLike = { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

export default function CheckInPage() {
  const [code, setCode] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const frameRef = useRef<number | null>(null);
  const scanningRef = useRef(false);

  const stopCamera = () => {
    scanningRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  };

  useEffect(() => {
    let live = true;
    void getSupabaseBrowserClient().auth.getUser().then(({ data }) => { if (live) setReady(Boolean(data.user)); });
    return () => { live = false; stopCamera(); };
  }, []);

  const submitCode = async (rawCode: string) => {
    const normalizedCode = rawCode.trim().toUpperCase();
    if (!normalizedCode) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const { data, error: rpcError } = await getSupabaseBrowserClient().rpc("check_in_with_code", { p_code: normalizedCode });
      if (rpcError) throw rpcError;
      const row = (data ?? [])[0] as { event_title?: string; already_checked_in?: boolean } | undefined;
      setMessage(row?.already_checked_in ? `Kehadiran untuk ${row.event_title ?? "agenda ini"} sudah tercatat.` : `Check-in ${row?.event_title ?? "agenda"} berhasil.`);
      setCode("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kode check-in tidak dapat diproses.");
    } finally {
      setSaving(false);
    }
  };

  const startCamera = async () => {
    setError(""); setMessage(""); setCameraMessage("");
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) {
      setCameraMessage("Pemindai QR belum didukung browser ini. Gunakan input kode di bawah atau buka lewat Chrome Android terbaru.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("Kamera tidak tersedia pada perangkat ini. Gunakan input kode di bawah.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
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
            const result = results.find((item) => item.rawValue.trim());
            if (result) {
              stopCamera();
              setCode(result.rawValue.trim().toUpperCase());
              await submitCode(result.rawValue);
              return;
            }
          }
        } catch {
          // Scanning continues when a single frame cannot be decoded.
        }
        if (scanningRef.current) frameRef.current = requestAnimationFrame(() => void scanFrame());
      };
      frameRef.current = requestAnimationFrame(() => void scanFrame());
    } catch (caught) {
      stopCamera();
      setCameraMessage(caught instanceof Error && caught.name === "NotAllowedError" ? "Izin kamera ditolak. Izinkan kamera atau gunakan input kode." : "Kamera belum dapat dibuka. Coba lagi atau gunakan input kode.");
    }
  };

  const submit = async (event: FormEvent) => { event.preventDefault(); await submitCode(code); };

  return <AppShell active="Check-in" title="Check-in"><div className="page-wrap"><section className="form-card card checkin-card"><div className="form-heading"><ScanLine/><span><em>KEHADIRAN AGENDA</em><h2>Check-in member</h2><p>Scan QR dari pengurus atau masukkan kode agenda sebagai alternatif.</p></span></div>{!ready ? <div className="notice">Masuk terlebih dahulu dengan akun member aktif untuk mencatat kehadiran. <a href="/login">Masuk sekarang</a></div> : <><div className="scanner-stage"><video ref={videoRef} className={cameraOpen ? "camera-live" : ""} playsInline muted aria-label="Pratinjau kamera pemindai QR"/><div className="scanner-frame" aria-hidden="true"/><span>{cameraOpen ? "MEMINDAI QR…" : "SIAP MEMINDAI"}</span></div><button className="dark-action camera-button" onClick={() => cameraOpen ? stopCamera() : void startCamera()} disabled={saving}>{cameraOpen ? <><CameraOff/>TUTUP KAMERA</> : <><Camera/>SCAN QR DENGAN KAMERA</>}</button>{cameraMessage && <p className="system-message">{cameraMessage}</p>}<div className="manual-divider"><span>atau masukkan kode</span></div><form onSubmit={submit}><label>Kode check-in<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Contoh: RR-AB12-CD34" autoCapitalize="characters" required/></label><button className="primary-action" disabled={saving}>{saving ? "MEMPROSES…" : "CHECK-IN SEKARANG"}</button></form></>}{message && <p className="success-message"><CheckCircle2/>{message}</p>}{error && <p className="error-message">{error}</p>}<div className="notice"><ShieldCheck/> Sistem menolak check-in ganda dengan aman. Kode hanya berlaku pada jadwal yang ditentukan pengurus.</div></section></div></AppShell>;
}
