"use client";

import { useMemberAccess, type AppRole } from "@/hooks/use-member-access";
import { Activity, Bell, BellRing, Bike, CalendarCog, CalendarDays, ChevronDown, CircleDollarSign, ClipboardCheck, FileSpreadsheet, Globe, History, Home, Menu, Megaphone, Route, ScanLine, Settings, ShieldCheck, Trophy, UserCog, UserPlus, UserRound, UsersRound, X } from "lucide-react";
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
];
const hasRole = (role: AppRole | undefined, roles: AppRole[]) => Boolean(role && roles.includes(role));

export function AppShell({ active, title, children }: { active: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pendingJoinCount, setPendingJoinCount] = useState(0);
  const { user, account, loading } = useMemberAccess();

  useEffect(() => {
    let active = true;
    if (account?.status === "active" && hasRole(account.role, ["road_captain", "admin", "superadmin"])) {
      const supabase = getSupabaseBrowserClient();
      void (async () => {
        const res: { count?: number | null } = await supabase
          .from("join_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");
        if (active && typeof res?.count === "number") {
          setPendingJoinCount(res.count);
        }
      })();
    }
    return () => {
      active = false;
    };
  }, [account]);

  const operational = useMemo<NavItem[]>(() => {
    if (account?.status !== "active") return [];
    const items: NavItem[] = [];
    if (hasRole(account.role, ["road_captain", "admin", "superadmin"])) {
      items.push(
        ["Join Requests", "/admin/join-requests", UserPlus],
        ["Validasi Ride", "/riding/approval", ShieldCheck],
        ["Kehadiran", "/admin/attendance", ClipboardCheck]
      );
    }
    if (hasRole(account.role, ["admin", "superadmin"])) {
      items.push(
        ["Admin", "/admin", Settings],
        ["Kelola Member", "/admin/members", UserCog],
        ["Kelola Agenda", "/admin/events", CalendarCog],
        ["Analytics", "/admin/insights", Activity],
        ["Kelola Bulletin", "/admin/bulletins", Megaphone],
        ["Import CSV", "/admin/import", FileSpreadsheet],
        ["History", "/history", History],
        ["Notifikasi", "/notifications", BellRing],
        ["Web Publik", "/", Globe]
      );
    }
    return items;
  }, [account]);

  const operationalActive = operational.some(([label]) => label === active);
  const accountLabel = loading ? "Memuat" : !user ? "Masuk" : account?.status === "active" ? "Profil" : account?.status === "inactive" ? "Nonaktif" : "Verifikasi";
  const nav = (items: readonly NavItem[]) => items.map(([label, href, Icon]) => (
    <Link className={active === label ? "active" : ""} href={href} key={label} onClick={() => setOpen(false)}>
      <Icon />
      <span style={{ flex: 1 }}>{label}</span>
      {label === "Join Requests" && pendingJoinCount > 0 && (
        <b style={{ background: "var(--red)", color: "#fff", padding: "1px 6px", borderRadius: 9999, fontSize: "0.6rem", fontWeight: 900 }}>
          {pendingJoinCount}
        </b>
      )}
    </Link>
  ));

  return (
    <main className="app-shell">
      <aside className={open ? "open" : ""}>
        <Link className="brand" href="/" aria-label="Revolt Riders home">
          <Image src="/revolt-riders-logo.jpg" alt="Logo resmi Revolt Riders" width={66} height={66} priority />
          <strong>REVOLT RIDERS<small>MEMBER HUB</small></strong>
        </Link>
        <button className="close-menu" onClick={() => setOpen(false)} aria-label="Tutup menu"><X /></button>

        {/* Menu Utama */}
        <p className="navlabel" style={{ marginTop: "10px" }}>MENU UTAMA</p>
        <nav>{nav(utamaItems)}</nav>

        {/* Komunitas */}
        <p className="navlabel">KOMUNITAS</p>
        <nav>{nav(komunitasItems)}</nav>

        {/* Panel Pengurus (Collapsible khusus Staff/Admin) */}
        {operational.length > 0 && (
          <details className="sidebar-tools" open={operationalActive}>
            <summary>
              <Settings />
              <span>Panel Pengurus</span>
              <ChevronDown />
            </summary>
            <nav>{nav(operational)}</nav>
          </details>
        )}

        <div className="motto" style={{ marginTop: "auto" }}>
          <Route />
          <span>
            <b>Ride safe.</b>
            <small>Brotherhood tanpa batas.</small>
          </span>
        </div>
      </aside>

      {open && <button className="shade" onClick={() => setOpen(false)} aria-label="Tutup menu" />}

      <section className="content">
        <header>
          <button className="hamb" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu /></button>
          <div>
            <small>REVOLT RIDERS · SITUBONDO</small>
            <h1>{title}</h1>
          </div>
          <div className="tools">
            <span className="live-dot">● LIVE</span>
            <Link className={`login-link${account?.status && account.status !== "active" ? " account-warning" : ""}`} href={user ? "/profil" : "/login"}>
              {accountLabel}
            </Link>
          </div>
        </header>
        {children}
      </section>

      <nav className="bottom">
        {bottomItems.map(([label, href, Icon]) => (
          <Link key={label} className={active === label ? "active" : ""} href={href}>
            <Icon />
            <small>{label}</small>
          </Link>
        ))}
      </nav>
    </main>
  );
}

export function SyncPending({ area }: { area: string }) {
  return <section className="empty-state card"><span className="status-dot"/><h2>{area} siap dihubungkan</h2><p>Modul production sudah tersedia. Data akan tampil setelah akses Google Sheets untuk server dikonfigurasi.</p></section>;
}
