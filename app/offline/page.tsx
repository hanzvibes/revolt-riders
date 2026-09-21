import Image from "next/image";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32, background: "#101112", color: "#fff" }}><Image src="/icons/icon-192.png" alt="Logo Revolt Riders" width={120} height={120} priority style={{ borderRadius: 24, marginBottom: 24 }} /><p style={{ color: "#ed1b2f", fontSize: 11, fontWeight: 800, letterSpacing: ".14em" }}>REVOLT RIDERS · SITUBONDO</p><h1 style={{ margin: "8px 0 10px", fontSize: "clamp(28px, 8vw, 48px)" }}>Koneksi sedang terputus</h1><span style={{ maxWidth: 440, color: "#aeb1b4", lineHeight: 1.7 }}>Periksa jaringan lalu coba lagi. Halaman akan kembali memuat saat koneksi tersedia.</span><a href="/" style={{ marginTop: 28, padding: "14px 24px", borderRadius: 8, background: "#ed1b2f", color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: ".08em" }}>COBA LAGI</a></main>;
}
