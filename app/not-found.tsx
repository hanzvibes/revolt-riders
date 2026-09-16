import Link from "next/link";

export default function NotFound() {
  return <main className="system-screen"><section className="system-card"><em>404</em><h1>Halaman tidak ditemukan</h1><p>Tautan mungkin sudah berubah atau tidak lagi tersedia.</p><Link className="primary-action" href="/">KEMBALI KE DASHBOARD</Link></section></main>;
}
