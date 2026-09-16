"use client";

import { useMemberAccess, type AppRole } from "@/hooks/use-member-access";
import { Activity, Bell, Bike, CalendarDays, ChevronDown, CircleDollarSign, ClipboardCheck, FileSpreadsheet, Home, Menu, Megaphone, Route, ScanLine, Settings, ShieldCheck, Trophy, UserCog, UserRound, UsersRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";

type NavItem = readonly [string, string, ComponentType];
const primary: readonly NavItem[] = [["Home", "/", Home], ["Agenda", "/agenda", CalendarDays], ["Riding", "/riding", Bike], ["Member", "/member", UsersRound]];
const bottomItems: readonly NavItem[] = [...primary, ["Profil", "/profil", UserRound]];
const community: readonly NavItem[] = [["Kas Revolt", "/kas", CircleDollarSign], ["Leaderboard", "/leaderboard", Trophy], ["Bulletin", "/bulletin", Bell]];
const hasRole = (role: AppRole | undefined, roles: AppRole[]) => Boolean(role && roles.includes(role));

export function AppShell({ active, title, children }: { active: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, account, loading } = useMemberAccess();
  const operational = useMemo<NavItem[]>(() => {
    if (account?.status !== "active") return [];
    const items: NavItem[] = [["Check-in", "/check-in", ScanLine]];
    if (hasRole(account.role, ["road_captain", "admin", "superadmin"])) items.push(["Kehadiran", "/admin/attendance", ClipboardCheck], ["Validasi Ride", "/riding/approval", ShieldCheck]);
    if (hasRole(account.role, ["admin", "superadmin"])) items.push(["Admin", "/admin", Settings], ["Analytics", "/admin/insights", Activity], ["Kelola Member", "/admin/members", UserCog], ["Kelola Bulletin", "/admin/bulletins", Megaphone], ["Import CSV", "/admin/import", FileSpreadsheet]);
    return items;
  }, [account]);
  const operationalActive = operational.some(([label]) => label === active);
  const accountLabel = loading ? "Memuat" : !user ? "Masuk" : account?.status === "active" ? "Profil" : account?.status === "inactive" ? "Nonaktif" : "Verifikasi";
  const nav = (items: readonly NavItem[]) => items.map(([label, href, Icon]) => <Link className={active === label ? "active" : ""} href={href} key={label} onClick={() => setOpen(false)}><Icon />{label}</Link>);

  return <main className="app-shell"><aside className={open ? "open" : ""}>
    <Link className="brand" href="/" aria-label="Revolt Riders home"><Image src="/revolt-riders-logo.jpg" alt="Logo resmi Revolt Riders" width={66} height={66} priority/><strong>REVOLT RIDERS<small>MEMBER HUB</small></strong></Link>
    <button className="close-menu" onClick={() => setOpen(false)} aria-label="Tutup menu"><X/></button>
    <nav>{nav(primary)}</nav>
    <p className="navlabel">KOMUNITAS</p><nav>{nav(community)}</nav>
    {operational.length > 0 && <details className="sidebar-tools" open={operationalActive}><summary><Settings/><span>Operasional</span><ChevronDown/></summary><nav>{nav(operational)}</nav></details>}
    <div className="motto"><Route/><span><b>Ride safe.</b><small>Brotherhood tanpa batas.</small></span></div>
  </aside>
  {open && <button className="shade" onClick={() => setOpen(false)} aria-label="Tutup menu"/>}
  <section className="content"><header><button className="hamb" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu/></button><div><small>REVOLT RIDERS · SITUBONDO</small><h1>{title}</h1></div><div className="tools"><span className="live-dot">● LIVE</span><Link className={`login-link${account?.status && account.status !== "active" ? " account-warning" : ""}`} href={user ? "/profil" : "/login"}>{accountLabel}</Link></div></header>{children}</section>
  <nav className="bottom">{bottomItems.map(([label, href, Icon]) => <Link key={label} className={active === label ? "active" : ""} href={href}><Icon/><small>{label}</small></Link>)}</nav>
  </main>;
}

export function SyncPending({ area }: { area: string }) {
  return <section className="empty-state card"><span className="status-dot"/><h2>{area} siap dihubungkan</h2><p>Modul production sudah tersedia. Data akan tampil setelah akses Google Sheets untuk server dikonfigurasi.</p></section>;
}
