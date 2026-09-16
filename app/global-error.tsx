"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="id"><body><main className="system-screen"><section className="system-card"><AlertTriangle/><em>SISTEM REVOLT</em><h1>Aplikasi perlu dimuat ulang</h1><p>Terjadi gangguan tak terduga. Silakan coba lagi.</p><button className="primary-action" onClick={reset}><RefreshCw/>MUAT ULANG</button></section></main></body></html>;
}
