import type { AppRole } from "@/hooks/use-member-access";
import {
  Activity,
  Bell,
  Bike,
  CalendarCog,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileSpreadsheet,
  History,
  Home,
  Megaphone,
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
  type LucideIcon,
} from "lucide-react";

export type NavItem = readonly [
  string,
  string,
  LucideIcon,
];

export const utamaItems: readonly NavItem[] = [
  ["Home", "/dashboard", Home],
  ["Agenda", "/agenda", CalendarDays],
  ["Catat Riding", "/riding", Bike],
  ["Direktori Member", "/member", UsersRound],
  ["Profil Saya", "/profil", UserRound],
];

export const bottomItems: readonly NavItem[] = [
  ["Home", "/dashboard", Home],
  ["Agenda", "/agenda", CalendarDays],
  ["Riding", "/riding", Bike],
  ["Member", "/member", UsersRound],
  ["Profil", "/profil", UserRound],
];

export const komunitasItems: readonly NavItem[] = [
  ["My Garage", "/garage", Wrench],
  ["Voyager", "/voyager", Route],
  ["Leaderboard", "/leaderboard", Trophy],
  ["Kas Revolt", "/kas", CircleDollarSign],
  ["Buletin", "/bulletin", Bell],
  ["Check-in", "/check-in", ScanLine],
  ["Riwayat Agenda", "/history", History],
];

export const operationalItems: readonly NavItem[] = [
  ["Pendaftaran Member", "/admin/join-requests", UserPlus],
  ["Validasi Riding", "/riding/approval", ShieldCheck],
  ["Rekap Kehadiran", "/admin/attendance", ClipboardCheck],
];

export const adminItems: readonly NavItem[] = [
  ["Dashboard Admin", "/admin", Settings],
  ["Manajemen Member", "/admin/members", UserCog],
  ["Manajemen Agenda", "/admin/events", CalendarCog],
  ["Manajemen Buletin", "/admin/bulletins", Megaphone],
  ["Analitik & Audit", "/admin/insights", Activity],
  ["Import Data", "/admin/import", FileSpreadsheet],
];

export const hasRole = (
  role: AppRole | undefined,
  roles: AppRole[],
) => Boolean(role && roles.includes(role));

const activeAliases: Record<
  string,
  readonly string[]
> = {
  Home: ["Home"],
  Agenda: ["Agenda"],
  "Catat Riding": ["Riding", "Catat Riding"],
  "Direktori Member": ["Member", "Direktori Member"],
  "Profil Saya": ["Profil", "Profil Saya"],
  "My Garage": ["Garage", "My Garage"],
  Voyager: ["Voyager"],
  Leaderboard: ["Leaderboard"],
  "Kas Revolt": ["Kas Revolt"],
  Buletin: ["Bulletin", "Buletin"],
  "Check-in": ["Check-in"],
  "Riwayat Agenda": ["History", "Riwayat Agenda"],
  "Pendaftaran Member": [
    "Join Requests",
    "Pendaftaran Member",
  ],
  "Validasi Riding": [
    "Validasi Ride",
    "Validasi Riding",
  ],
  "Rekap Kehadiran": [
    "Kehadiran",
    "Rekap Kehadiran",
  ],
  "Dashboard Admin": [
    "Admin",
    "Pusat Admin",
    "Dashboard Admin",
  ],
  "Manajemen Member": [
    "Kelola Member",
    "Manajemen Member",
  ],
  "Manajemen Agenda": [
    "Kelola Agenda",
    "Manajemen Agenda",
  ],
  "Manajemen Buletin": [
    "Kelola Bulletin",
    "Manajemen Buletin",
  ],
  "Analitik & Audit": [
    "Analytics",
    "Analitik & Audit",
  ],
  "Import Data": ["Import CSV", "Import Data"],
};

export const isItemActive = (
  label: string,
  currentActive: string,
) =>
  (activeAliases[label] ?? [label]).includes(
    currentActive,
  );
