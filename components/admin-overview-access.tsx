import { AppShell } from "@/components/app-shell";
import { ShieldAlert } from "lucide-react";

export function AdminLoadingState() {
  return (
    <AppShell active="Admin" title="Dashboard Admin">
      <div className="page-wrap"><p>Memeriksa izin…</p></div>
    </AppShell>
  );
}

export function AdminRestrictedState({ hasAccount }: { hasAccount: boolean }) {
  return (
    <AppShell active="Admin" title="Dashboard Admin">
      <div className="page-wrap">
        <section className="empty-state card">
          <ShieldAlert />
          <h2>Akses pengurus diperlukan</h2>
          <p>Halaman ini hanya tersedia untuk akun aktif Admin dan Superadmin.</p>
          <a className="primary-action" href={hasAccount ? "/profil" : "/login"}>
            {hasAccount ? "LIHAT STATUS AKUN" : "MASUK"}
          </a>
        </section>
      </div>
    </AppShell>
  );
}
