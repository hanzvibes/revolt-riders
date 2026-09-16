"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="system-screen"><section className="system-card"><AlertTriangle/><em>TERJADI GANGGUAN</em><h1>Halaman belum dapat dimuat</h1><p>Koneksi atau layanan sedang bermasalah. Data kamu tidak hilang—coba muat ulang halaman ini.</p><div><button className="primary-action" onClick={reset}><RefreshCw/>COBA LAGI</button><Link className="outline-action" href="/">KE DASHBOARD</Link></div></section></main>;
}
