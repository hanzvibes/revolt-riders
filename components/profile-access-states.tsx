import { AppShell } from "@/components/app-shell";
import { PageState } from "@/components/page-state";
import { PageSkeleton } from "@/components/skeleton";
import { ShieldAlert, UserRound } from "lucide-react";

export function ProfileLoadingState() {
  return (
    <AppShell active="Profil" title="Profil Saya">
      <div className="profile-state-shell profile-loading-state" aria-live="polite" aria-busy="true">
        <PageSkeleton title="Memuat Kartu Anggota..." />
      </div>
    </AppShell>
  );
}

export function ProfileLoginState() {
  return (
    <AppShell active="Profil" title="Profil Saya">
      <div className="page-wrap profile-state-shell profile-access-state">
        <PageState
          tone="restricted"
          icon={<UserRound />}
          title="Belum masuk ke akun"
          description="Silakan masuk terlebih dahulu untuk membuka kartu anggota digital Revolt Riders."
          action={<a className="primary-action" href="/login">MASUK KE AKUN</a>}
        />
      </div>
    </AppShell>
  );
}

export function ProfileVerificationState({ email }: { email: string }) {
  return (
    <AppShell active="Profil" title="Profil Saya">
      <div className="page-wrap profile-state-shell profile-verification-state">
        <PageState
          icon={<ShieldAlert />}
          title="Akun menunggu verifikasi pengurus"
          description={<>{email}<br />Pendaftaran Anda telah diterima. Pengurus akan segera memverifikasi dan menghubungkan akun dengan Member ID resmi.</>}
        />
      </div>
    </AppShell>
  );
}
