"use client";

import { useMemberAccess, type AppRole } from "@/hooks/use-member-access";
import { useDataCache } from "@/context/data-cache-context";
import {
  Activity,
  Bell,
  BellRing,
  Bike,
  CalendarCog,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileSpreadsheet,
  Globe,
  History,
  Home,
  Megaphone,
  Menu,
  Route,
  ScanLine,
  Settings,
  ShieldCheck,
  Trophy,
  UserCog,
  UserPlus,
  UserRound,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type NavItem = readonly [string, string, ComponentType];

const DRAWER_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const utamaItems: readonly NavItem[] = [
  ["Home", "/dashboard", Home],
  ["Agenda", "/agenda", CalendarDays],
  ["Catat Riding", "/riding", Bike],
  ["Direktori Member", "/member", UsersRound],
  ["Profil Saya", "/profil", UserRound],
];

const bottomItems: readonly NavItem[] = [
  ["Home", "/dashboard", Home],
  ["Agenda", "/agenda", CalendarDays],
  ["Riding", "/riding", Bike],
  ["Member", "/member", UsersRound],
  ["Profil", "/profil", UserRound],
];

const komunitasItems: readonly NavItem[] = [
  ["My Garage", "/garage", Wrench],
  ["Voyager", "/voyager", Route],
  ["Leaderboard", "/leaderboard", Trophy],
  ["Kas Revolt", "/kas", CircleDollarSign],
  ["Buletin", "/bulletin", Bell],
  ["Check-in", "/check-in", ScanLine],
  ["Riwayat Agenda", "/history", History],
];

const operationalItems: readonly NavItem[] = [
  ["Pendaftaran Member", "/admin/join-requests", UserPlus],
  ["Validasi Riding", "/riding/approval", ShieldCheck],
  ["Rekap Kehadiran", "/admin/attendance", ClipboardCheck],
];

const adminItems: readonly NavItem[] = [
  ["Dashboard Admin", "/admin", Settings],
  ["Manajemen Member", "/admin/members", UserCog],
  ["Manajemen Agenda", "/admin/events", CalendarCog],
  ["Manajemen Buletin", "/admin/bulletins", Megaphone],
  ["Analitik & Audit", "/admin/insights", Activity],
  ["Import Data", "/admin/import", FileSpreadsheet],
];

const hasRole = (role: AppRole | undefined, roles: AppRole[]) => Boolean(role && roles.includes(role));

const activeAliases: Record<string, readonly string[]> = {
  "Home": ["Home"],
  "Agenda": ["Agenda"],
  "Catat Riding": ["Riding", "Catat Riding"],
  "Direktori Member": ["Member", "Direktori Member"],
  "Profil Saya": ["Profil", "Profil Saya"],
  "My Garage": ["Garage", "My Garage"],
  "Voyager": ["Voyager"],
  "Leaderboard": ["Leaderboard"],
  "Kas Revolt": ["Kas Revolt"],
  "Buletin": ["Bulletin", "Buletin"],
  "Check-in": ["Check-in"],
  "Riwayat Agenda": ["History", "Riwayat Agenda"],
  "Pendaftaran Member": ["Join Requests", "Pendaftaran Member"],
  "Validasi Riding": ["Validasi Ride", "Validasi Riding"],
  "Rekap Kehadiran": ["Kehadiran", "Rekap Kehadiran"],
  "Dashboard Admin": ["Admin", "Pusat Admin", "Dashboard Admin"],
  "Manajemen Member": ["Kelola Member", "Manajemen Member"],
  "Manajemen Agenda": ["Kelola Agenda", "Manajemen Agenda"],
  "Manajemen Buletin": ["Kelola Bulletin", "Manajemen Buletin"],
  "Analitik & Audit": ["Analytics", "Analitik & Audit"],
  "Import Data": ["Import CSV", "Import Data"],
};

const isItemActive = (label: string, currentActive: string) =>
  (activeAliases[label] ?? [label]).includes(currentActive);

export function AppShell({ active, title, children }: { active: string; title: string; children: ReactNode }) {
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


  // Detect which accordion section contains the active page
  const isKomunitasActive = useMemo(() => komunitasItems.some(([label]) => isItemActive(label, active)), [active]);
  const isOperationalActive = useMemo(() => operationalItems.some(([label]) => isItemActive(label, active)), [active]);
  const isAdminActive = useMemo(() => adminItems.some(([label]) => isItemActive(label, active)), [active]);

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    komunitas: isKomunitasActive,
    operational: isOperationalActive,
    admin: isAdminActive,
  });

  const komunitasOpen = Boolean(openSections.komunitas || isKomunitasActive);
  const operationalOpen = Boolean(openSections.operational || isOperationalActive);
  const adminOpen = Boolean(openSections.admin || isAdminActive);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  const renderNavLinks = (items: readonly NavItem[], isSubnav = false) => (
    <nav className={isSubnav ? "sidebar-subnav" : ""}>
      {items.map(([label, href, Icon]) => {
        const isCurrent = isItemActive(label, active);
        return (
          <Link
            className={isCurrent ? "active" : ""}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            key={label}
            onClick={() => setOpen(false)}
          >
            <Icon />
            <span className="sidebar-link-label">{label}</span>
            {label === "Pendaftaran Member" && pendingJoinCount > 0 && (
              <b className="sidebar-badge-pill">{pendingJoinCount}</b>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <main className="app-shell">
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

        {/* 1. Menu Utama (Pinned di atas) */}
        <p className="navlabel">
          UTAMA
        </p>
        {renderNavLinks(utamaItems)}

        {/* 2. Accordion Group: Komunitas, Operasional, Admin */}
        <div className="sidebar-accordion-group">
          {/* Komunitas & Aktivitas */}
          <div className={`sidebar-accordion ${komunitasOpen ? "open" : ""}`}>
            <button
              type="button"
              className={`sidebar-accordion-header ${isKomunitasActive ? "has-active" : ""}`}
              onClick={() => toggleSection("komunitas")}
              aria-expanded={komunitasOpen}
            >
              <Trophy />
              <span className="accordion-title">Komunitas</span>
              <ChevronDown className="accordion-chevron" />
            </button>
            {renderNavLinks(komunitasItems, true)}
          </div>

          {/* Operasional Lapangan (Khusus Road Captain, Admin, Superadmin) */}
          {canOperational && (
            <div className={`sidebar-accordion ${operationalOpen ? "open" : ""}`}>
              <button
                type="button"
                className={`sidebar-accordion-header ${isOperationalActive ? "has-active" : ""}`}
                onClick={() => toggleSection("operational")}
                aria-expanded={operationalOpen}
              >
                <ShieldCheck />
                <span className="accordion-title">Operasional</span>
                {pendingJoinCount > 0 && <b className="sidebar-badge-pill">{pendingJoinCount}</b>}
                <ChevronDown className="accordion-chevron" />
              </button>
              {renderNavLinks(operationalItems, true)}
            </div>
          )}

          {/* Manajemen Admin (Khusus Admin & Superadmin) */}
          {canAdmin && (
            <div className={`sidebar-accordion ${adminOpen ? "open" : ""}`}>
              <button
                type="button"
                className={`sidebar-accordion-header ${isAdminActive ? "has-active" : ""}`}
                onClick={() => toggleSection("admin")}
                aria-expanded={adminOpen}
              >
                <Settings />
                <span className="accordion-title">Administrasi</span>
                <ChevronDown className="accordion-chevron" />
              </button>
              {renderNavLinks(adminItems, true)}
            </div>
          )}
        </div>

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
        <header>
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
          <div>
            <small>REVOLT RIDERS · MEMBER HUB</small>
            <h1>{title}</h1>
          </div>
          <div className="tools">
            <Link
              href="/notifications"
              className="header-bell-btn"
              title="Pengaturan notifikasi"
              aria-label="Pengaturan notifikasi"
            >
              <Bell size={16} />
            </Link>
            <Link
              className={`login-link${account?.status && account.status !== "active" ? " account-warning" : ""}`}
              href={user ? "/profil" : "/login"}
            >
              {accountLabel}
            </Link>
          </div>
        </header>
        {children}
      </section>

      <nav
        className="bottom"
        aria-label="Navigasi utama"
        inert={isMobileDrawer && open ? true : undefined}
      >
        {bottomItems.map(([label, href, Icon]) => (
          <Link
            key={label}
            className={isItemActive(label, active) ? "active" : ""}
            href={href}
            aria-current={isItemActive(label, active) ? "page" : undefined}
          >
            <Icon />
            <small>{label}</small>
          </Link>
        ))}
      </nav>
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
