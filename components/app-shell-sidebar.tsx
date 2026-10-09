"use client";

import type { AppRole } from "@/hooks/use-member-access";
import {
  BellRing,
  ChevronDown,
  Globe,
  Route,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type {
  RefObject,
} from "react";
import {
  adminItems,
  isItemActive,
  komunitasItems,
  operationalItems,
  utamaItems,
  type NavItem,
} from "./app-shell-navigation";

type ShellUser = {
  email?: string | null;
} | null;

type ShellAccount = {
  member_external_id?: string | null;
  role?: AppRole;
} | null;

export function AppShellSidebar({
  active,
  open,
  isMobileDrawer,
  pendingJoinCount,
  canOperational,
  canAdmin,
  komunitasOpen,
  operationalOpen,
  adminOpen,
  isKomunitasActive,
  isOperationalActive,
  isAdminActive,
  asideRef,
  closeButtonRef,
  user,
  account,
  onClose,
  onToggleSection,
}: {
  active: string;
  open: boolean;
  isMobileDrawer: boolean;
  pendingJoinCount: number;
  canOperational: boolean;
  canAdmin: boolean;
  komunitasOpen: boolean;
  operationalOpen: boolean;
  adminOpen: boolean;
  isKomunitasActive: boolean;
  isOperationalActive: boolean;
  isAdminActive: boolean;
  asideRef: RefObject<HTMLElement | null>;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  user: ShellUser;
  account: ShellAccount;
  onClose: () => void;
  onToggleSection: (key: string) => void;
}) {
  const renderNavLinks = (
    items: readonly NavItem[],
    isSubnav = false,
  ) => (
    <nav
      className={
        isSubnav ? "sidebar-subnav" : ""
      }
    >
      {items.map(([label, href, Icon]) => {
        const isCurrent = isItemActive(
          label,
          active,
        );

        return (
          <Link
            className={
              isCurrent ? "active" : ""
            }
            href={href}
            aria-current={
              isCurrent ? "page" : undefined
            }
            key={label}
            onClick={onClose}
          >
            <Icon />
            <span className="sidebar-link-label">
              {label}
            </span>
            {label === "Pendaftaran Member" &&
            pendingJoinCount > 0 ? (
              <b className="sidebar-badge-pill">
                {pendingJoinCount}
              </b>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <aside
      ref={asideRef}
      id="app-mobile-drawer"
      className={open ? "open" : ""}
      aria-label="Navigasi aplikasi"
      aria-hidden={
        isMobileDrawer && !open
          ? true
          : undefined
      }
      inert={
        isMobileDrawer && !open
          ? true
          : undefined
      }
    >
      <Link
        className="brand"
        href="/"
        aria-label="Revolt Riders home"
      >
        <Image
          src="/revolt-riders-logo.jpg"
          alt="Logo resmi Revolt Riders"
          width={66}
          height={66}
          priority
        />
        <strong>
          REVOLT RIDERS
          <small>MEMBER HUB</small>
        </strong>
      </Link>

      <button
        ref={closeButtonRef}
        className="close-menu"
        onClick={onClose}
        aria-label="Tutup menu"
      >
        <X />
      </button>

      <p className="navlabel">UTAMA</p>
      {renderNavLinks(utamaItems)}

      <div className="sidebar-accordion-group">
        <div
          className={
            "sidebar-accordion" +
            (komunitasOpen ? " open" : "")
          }
        >
          <button
            type="button"
            className={
              "sidebar-accordion-header" +
              (isKomunitasActive
                ? " has-active"
                : "")
            }
            onClick={() =>
              onToggleSection("komunitas")
            }
            aria-expanded={komunitasOpen}
          >
            <Trophy />
            <span className="accordion-title">
              Komunitas
            </span>
            <ChevronDown className="accordion-chevron" />
          </button>
          {renderNavLinks(komunitasItems, true)}
        </div>

        {canOperational ? (
          <div
            className={
              "sidebar-accordion" +
              (operationalOpen ? " open" : "")
            }
          >
            <button
              type="button"
              className={
                "sidebar-accordion-header" +
                (isOperationalActive
                  ? " has-active"
                  : "")
              }
              onClick={() =>
                onToggleSection("operational")
              }
              aria-expanded={operationalOpen}
            >
              <ShieldCheck />
              <span className="accordion-title">
                Operasional
              </span>
              {pendingJoinCount > 0 ? (
                <b className="sidebar-badge-pill">
                  {pendingJoinCount}
                </b>
              ) : null}
              <ChevronDown className="accordion-chevron" />
            </button>
            {renderNavLinks(
              operationalItems,
              true,
            )}
          </div>
        ) : null}

        {canAdmin ? (
          <div
            className={
              "sidebar-accordion" +
              (adminOpen ? " open" : "")
            }
          >
            <button
              type="button"
              className={
                "sidebar-accordion-header" +
                (isAdminActive
                  ? " has-active"
                  : "")
              }
              onClick={() =>
                onToggleSection("admin")
              }
              aria-expanded={adminOpen}
            >
              <Settings />
              <span className="accordion-title">
                Administrasi
              </span>
              <ChevronDown className="accordion-chevron" />
            </button>
            {renderNavLinks(adminItems, true)}
          </div>
        ) : null}
      </div>

      <div className="sidebar-footer">
        {user ? (
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {account?.member_external_id ? (
                account.member_external_id
                  .replace(/^RR-?/i, "")
                  .slice(0, 3) || "RR"
              ) : (
                <UserRound size={16} />
              )}
            </div>
            <div className="sidebar-user-info">
              <strong
                className="sidebar-user-id"
                title={
                  account?.member_external_id ||
                  user.email ||
                  ""
                }
              >
                {account?.member_external_id ||
                  user.email?.split("@")[0] ||
                  "Member"}
              </strong>
              <span
                className={
                  "sidebar-role-pill role-" +
                  (account?.role || "member")
                }
              >
                {(account?.role || "member")
                  .replace("_", " ")
                  .toUpperCase()}
              </span>
            </div>
            <div className="sidebar-user-actions">
              <Link
                href="/notifications"
                className="sidebar-user-btn"
                title="Pengaturan Notifikasi"
                aria-label="Pengaturan notifikasi"
                onClick={onClose}
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
            <Link
              href="/login"
              className="sidebar-login-btn"
              onClick={onClose}
            >
              Masuk
            </Link>
          </div>
        )}

        <div className="motto">
          <Route />
          <span>
            <b>Ride safe.</b>
            <small>
              Brotherhood tanpa batas.
            </small>
          </span>
        </div>
      </div>
    </aside>
  );
}
