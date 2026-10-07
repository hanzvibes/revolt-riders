"use client";

import { useMemberAccess } from "@/hooks/use-member-access";
import { useDataCache } from "@/context/data-cache-context";
import { ArrowLeft, Bell, BellRing, Globe, Menu, Route, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DRAWER_FOCUSABLE_SELECTOR, hasRole } from "@/components/navigation-config";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { MobileNavigation } from "@/components/mobile-navigation";

export function AppShell({
  active,
  title,
  eyebrow = "REVOLT RIDERS · MEMBER HUB",
  headerAction,
  socialHeader = false,
  headerBackHref,
  children,
}: {
  active: string;
  title: string;
  eyebrow?: string | null;
  headerAction?: ReactNode;
  socialHeader?: boolean;
  headerBackHref?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isMobileDrawer, setIsMobileDrawer] = useState(false);
  const [pendingJoinCount, setPendingJoinCount] = useState(0);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const drawerWasOpenRef = useRef(false);
  const { user, account, loading } = useMemberAccess();
  const { fetchWithCache } = useDataCache();

  const canOperational = account?.status === "active" && hasRole(account.role, ["road_captain", "admin", "superadmin"]);
  const canAdmin = account?.status === "active" && hasRole(account.role, ["admin", "superadmin"]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const sync = () => setIsMobileDrawer(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isMobileDrawer || !open) return;

    drawerWasOpenRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !asideRef.current) return;

      const focusable = Array.from(
        asideRef.current.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE_SELECTOR),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true" &&
          element.offsetParent !== null,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileDrawer, open]);

  useEffect(() => {
    if (!isMobileDrawer || open || !drawerWasOpenRef.current) return;

    drawerWasOpenRef.current = false;
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, [isMobileDrawer, open]);


  useEffect(() => {
    let mounted = true;

    if (!canOperational) {
      return () => {
        mounted = false;
      };
    }

    void fetchWithCache<number>(
      "shell:pending-join-count",
      async () => {
        const res: { count?: number | null; error?: { message?: string } | null } =
          await getSupabaseBrowserClient()
            .from("join_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending");

        if (res.error) throw res.error;
        return typeof res.count === "number" ? res.count : 0;
      },
      { ttlMs: 30_000 },
    )
      .then((count) => {
        if (mounted) setPendingJoinCount(count);
      })
      .catch(() => {
        if (mounted) setPendingJoinCount(0);
      });

    return () => {
      mounted = false;
    };
  }, [canOperational, fetchWithCache]);

  const accountLabel = loading
    ? "Memuat"
    : !user
    ? "Masuk"
    : account?.status === "active"
    ? "Akun"
    : account?.status === "inactive"
    ? "Nonaktif"
    : "Verifikasi";

  return (
    <main className={socialHeader ? "app-shell social-shell" : "app-shell"}>
      <aside
        ref={asideRef}
        id="app-mobile-drawer"
        className={open ? "open" : ""}
        aria-label="Navigasi aplikasi"
        aria-hidden={isMobileDrawer && !open ? true : undefined}
        inert={isMobileDrawer && !open ? true : undefined}
      >
        <Link className="brand" href="/" aria-label="Revolt Riders home">
          <Image src="/revolt-riders-logo.jpg" alt="Logo resmi Revolt Riders" width={66} height={66} priority />
          <strong>
            REVOLT RIDERS<small>MEMBER HUB</small>
          </strong>
        </Link>
        <button
          ref={closeButtonRef}
          className="close-menu"
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
        >
          <X />
        </button>

        <SidebarNavigation
          active={active}
          canOperational={canOperational}
          canAdmin={canAdmin}
          pendingJoinCount={pendingJoinCount}
          onNavigate={() => setOpen(false)}
        />

        {/* 3. Bottom Mini Profile Card & Motto */}
        <div className="sidebar-footer">
          {user ? (
            <div className="sidebar-user-card">
              <div className="sidebar-user-avatar">
                {account?.member_external_id ? (
                  account.member_external_id.replace(/^RR-?/i, "").slice(0, 3) || "RR"
                ) : (
                  <UserRound size={16} />
                )}
              </div>
              <div className="sidebar-user-info">
                <strong className="sidebar-user-id" title={account?.member_external_id || user.email || ""}>
                  {account?.member_external_id || user.email?.split("@")[0] || "Member"}
                </strong>
                <span className={`sidebar-role-pill role-${account?.role || "member"}`}>
                  {(account?.role || "member").replace("_", " ").toUpperCase()}
                </span>
              </div>
              <div className="sidebar-user-actions">
                <Link
                  href="/notifications"
                  className="sidebar-user-btn"
                  title="Pengaturan Notifikasi"
                  aria-label="Pengaturan notifikasi"
                  onClick={() => setOpen(false)}
                >
                  <BellRing size={15} />
                </Link>
                <Link
                  href="/"
                  className="sidebar-user-btn"
                  title="Kunjungi Web Publik"
                  aria-label="Buka website publik Revolt Riders di tab baru"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Globe size={15} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="sidebar-guest-card">
              <div className="sidebar-guest-text">
                <b>Akses Member</b>
                <small>Masuk akun Anda</small>
              </div>
              <Link href="/login" className="sidebar-login-btn" onClick={() => setOpen(false)}>
                Masuk
              </Link>
            </div>
          )}

          <div className="motto">
            <Route />
            <span>
              <b>Ride safe.</b>
              <small>Brotherhood tanpa batas.</small>
            </span>
          </div>
        </div>
      </aside>

      <button
        className={`shade${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-label="Tutup menu"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
      />

      <section
        className="content"
        inert={isMobileDrawer && open ? true : undefined}
      >
        <header className={socialHeader ? "social-app-header" : undefined}>
          {headerBackHref ? (
            <Link
              className="hamb social-back-link"
              href={headerBackHref}
              aria-label="Kembali"
            >
              <ArrowLeft />
            </Link>
          ) : (
            <button
              ref={menuButtonRef}
              className="hamb"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              aria-controls="app-mobile-drawer"
              aria-expanded={open}
            >
              <Menu />
            </button>
          )}
          <div>
            {eyebrow ? <small>{eyebrow}</small> : null}
            <h1>{title}</h1>
          </div>
          <div className="tools">
            {headerAction}
            <Link
              href="/notifications"
              className="header-bell-btn"
              title="Pengaturan notifikasi"
              aria-label="Pengaturan notifikasi"
            >
              <Bell size={16} />
            </Link>
            {!socialHeader ? (
              <Link
                className={`login-link${account?.status && account.status !== "active" ? " account-warning" : ""}`}
                href={user ? "/profil" : "/login"}
              >
                {accountLabel}
              </Link>
            ) : null}
          </div>
        </header>
        {children}
      </section>

      <MobileNavigation active={active} inert={isMobileDrawer && open} />
    </main>
  );
}

export function SyncPending({ area }: { area: string }) {
  return (
    <section className="empty-state card">
      <span className="status-dot" />
      <h2>{area} siap dihubungkan</h2>
      <p>Modul production sudah tersedia. Data akan tampil setelah akses Google Sheets untuk server dikonfigurasi.</p>
    </section>
  );
}
