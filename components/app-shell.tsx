"use client";

import { useMemberAccess, type AppRole } from "@/hooks/use-member-access";
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
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type NavItem = readonly [string, string, ComponentType];

const utamaItems: readonly NavItem[] = [
  ["Home", "/dashboard", Home],
  ["Agenda", "/agenda", CalendarDays],
  ["Catat Riding", "/riding", Bike],
  ["Member", "/member", UsersRound],
  ["Profil", "/profil", UserRound],
];

const bottomItems: readonly NavItem[] = [
  ["Home", "/dashboard", Home],
  ["Agenda", "/agenda", CalendarDays],
  ["Riding", "/riding", Bike],
  ["Member", "/member", UsersRound],
  ["Profil", "/profil", UserRound],
];

const komunitasItems: readonly NavItem[] = [
  ["Leaderboard", "/leaderboard", Trophy],
  ["Kas Revolt", "/kas", CircleDollarSign],
  ["Bulletin", "/bulletin", Bell],
  ["Check-in", "/check-in", ScanLine],
  ["History", "/history", History],
];

const operationalItems: readonly NavItem[] = [
  ["Join Requests", "/admin/join-requests", UserPlus],
  ["Validasi Ride", "/riding/approval", ShieldCheck],
  ["Kehadiran", "/admin/attendance", ClipboardCheck],
];

const adminItems: readonly NavItem[] = [
  ["Pusat Admin", "/admin", Settings],
  ["Kelola Member", "/admin/members", UserCog],
  ["Kelola Agenda", "/admin/events", CalendarCog],
  ["Kelola Bulletin", "/admin/bulletins", Megaphone],
  ["Analytics", "/admin/insights", Activity],
  ["Import CSV", "/admin/import", FileSpreadsheet],
];

const hasRole = (role: AppRole | undefined, roles: AppRole[]) => Boolean(role && roles.includes(role));

const isItemActive = (label: string, currentActive: string) => {
  if (label === currentActive) return true;
  if (label === "Catat Riding" && currentActive === "Riding") return true;
  if (label === "Pusat Admin" && currentActive === "Admin") return true;
  return false;
};

export function AppShell({ active, title, children }: { active: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pendingJoinCount, setPendingJoinCount] = useState(0);
  const { user, account, loading } = useMemberAccess();

  const canOperational = account?.status === "active" && hasRole(account.role, ["road_captain", "admin", "superadmin"]);
  const canAdmin = account?.status === "active" && hasRole(account.role, ["admin", "superadmin"]);

  // Detect which accordion section contains the active page
  const isKomunitasActive = useMemo(() => komunitasItems.some(([label]) => isItemActive(label, active)), [active]);
  const isOperationalActive = useMemo(() => operationalItems.some(([label]) => isItemActive(label, active)), [active]);
  const isAdminActive = useMemo(() => adminItems.some(([label]) => isItemActive(label, active)), [active]);

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    komunitas: isKomunitasActive,
    operational: isOperationalActive,
    admin: isAdminActive,
  });

  // Auto-expand section when navigating into it
  useEffect(() => {
    setOpenSections((prev) => ({
      ...prev,
      ...(isKomunitasActive ? { komunitas: true } : {}),
      ...(isOperationalActive ? { operational: true } : {}),
      ...(isAdminActive ? { admin: true } : {}),
    }));
  }, [isKomunitasActive, isOperationalActive, isAdminActive]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    let mounted = true;
    if (canOperational) {
      const supabase = getSupabaseBrowserClient();
      void (async () => {
        const res: { count?: number | null } = await supabase
          .from("join_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");
        if (mounted && typeof res?.count === "number") {
          setPendingJoinCount(res.count);
        }
      })();
    }
    return () => {
      mounted = false;
    };
  }, [canOperational]);

  const accountLabel = loading
    ? "Memuat"
    : !user
    ? "Masuk"
    : account?.status === "active"
    ? "Profil"
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
            key={label}
            onClick={() => setOpen(false)}
          >
            <Icon />
            <span style={{ flex: 1 }}>{label}</span>
            {label === "Join Requests" && pendingJoinCount > 0 && (
              <b className="sidebar-badge-pill">{pendingJoinCount}</b>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <main className="app-shell">
      <aside className={open ? "open" : ""}>
        <Link className="brand" href="/" aria-label="Revolt Riders home">
          <Image src="/revolt-riders-logo.jpg" alt="Logo resmi Revolt Riders" width={66} height={66} priority />
          <strong>
            REVOLT RIDERS<small>MEMBER HUB</small>
          </strong>
        </Link>
        <button className="close-menu" onClick={() => setOpen(false)} aria-label="Tutup menu">
          <X />
        </button>

        {/* 1. Menu Utama (Pinned di atas) */}
        <p className="navlabel" style={{ marginTop: "10px" }}>
          MENU UTAMA
        </p>
        {renderNavLinks(utamaItems)}

        {/* 2. Accordion Group: Komunitas, Operasional, Admin */}
        <div className="sidebar-accordion-group">
          {/* Komunitas & Aktivitas */}
          <div className={`sidebar-accordion ${openSections.komunitas ? "open" : ""}`}>
            <button
              type="button"
              className={`sidebar-accordion-header ${isKomunitasActive ? "has-active" : ""}`}
              onClick={() => toggleSection("komunitas")}
              aria-expanded={openSections.komunitas}
            >
              <Trophy />
              <span className="accordion-title">Komunitas</span>
              <ChevronDown className="accordion-chevron" />
            </button>
            {openSections.komunitas && renderNavLinks(komunitasItems, true)}
          </div>

          {/* Operasional Lapangan (Khusus Road Captain, Admin, Superadmin) */}
          {canOperational && (
            <div className={`sidebar-accordion ${openSections.operational ? "open" : ""}`}>
              <button
                type="button"
                className={`sidebar-accordion-header ${isOperationalActive ? "has-active" : ""}`}
                onClick={() => toggleSection("operational")}
                aria-expanded={openSections.operational}
              >
                <ShieldCheck />
                <span className="accordion-title">Operasional</span>
                {pendingJoinCount > 0 && <b className="sidebar-badge-pill">{pendingJoinCount}</b>}
                <ChevronDown className="accordion-chevron" />
              </button>
              {openSections.operational && renderNavLinks(operationalItems, true)}
            </div>
          )}

          {/* Manajemen Admin (Khusus Admin & Superadmin) */}
          {canAdmin && (
            <div className={`sidebar-accordion ${openSections.admin ? "open" : ""}`}>
              <button
                type="button"
                className={`sidebar-accordion-header ${isAdminActive ? "has-active" : ""}`}
                onClick={() => toggleSection("admin")}
                aria-expanded={openSections.admin}
              >
                <Settings />
                <span className="accordion-title">Kelola Admin</span>
                <ChevronDown className="accordion-chevron" />
              </button>
              {openSections.admin && renderNavLinks(adminItems, true)}
            </div>
          )}
        </div>

        {/* 3. Bottom Mini Profile Card & Motto */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column" }}>
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
                  onClick={() => setOpen(false)}
                >
                  <BellRing size={15} />
                </Link>
                <Link
                  href="/"
                  className="sidebar-user-btn"
                  title="Kunjungi Web Publik"
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

          <div className="motto" style={{ marginTop: "10px" }}>
            <Route />
            <span>
              <b>Ride safe.</b>
              <small>Brotherhood tanpa batas.</small>
            </span>
          </div>
        </div>
      </aside>

      {open && <button className="shade" onClick={() => setOpen(false)} aria-label="Tutup menu" />}

      <section className="content">
        <header>
          <button className="hamb" onClick={() => setOpen(true)} aria-label="Buka menu">
            <Menu />
          </button>
          <div>
            <small>REVOLT RIDERS · SITUBONDO</small>
            <h1>{title}</h1>
          </div>
          <div className="tools">
            <span className="live-dot">● LIVE</span>
            <Link
              href="/notifications"
              className="header-bell-btn"
              title="Notifikasi Revolt"
              aria-label="Notifikasi"
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

      <nav className="bottom">
        {bottomItems.map(([label, href, Icon]) => (
          <Link key={label} className={isItemActive(label, active) ? "active" : ""} href={href}>
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
