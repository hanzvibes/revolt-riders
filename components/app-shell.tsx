"use client";

import {
  ArrowLeft,
  Bell,
  Menu,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  bottomItems,
  isItemActive,
} from "./app-shell-navigation";
import { useAppShellController } from "./app-shell-controller";
import { AppShellSidebar } from "./app-shell-sidebar";

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
  const {
    user,
    account,
    open,
    setOpen,
    isMobileDrawer,
    pendingJoinCount,
    menuButtonRef,
    closeButtonRef,
    asideRef,
    canOperational,
    canAdmin,
    isKomunitasActive,
    isOperationalActive,
    isAdminActive,
    komunitasOpen,
    operationalOpen,
    adminOpen,
    toggleSection,
    accountLabel,
  } = useAppShellController(active);

  return (
    <main
      className={
        socialHeader
          ? "app-shell social-shell"
          : "app-shell"
      }
    >
      <AppShellSidebar
        active={active}
        open={open}
        isMobileDrawer={isMobileDrawer}
        pendingJoinCount={pendingJoinCount}
        canOperational={canOperational}
        canAdmin={canAdmin}
        komunitasOpen={komunitasOpen}
        operationalOpen={operationalOpen}
        adminOpen={adminOpen}
        isKomunitasActive={isKomunitasActive}
        isOperationalActive={isOperationalActive}
        isAdminActive={isAdminActive}
        asideRef={asideRef}
        closeButtonRef={closeButtonRef}
        user={user}
        account={account}
        onClose={() => setOpen(false)}
        onToggleSection={toggleSection}
      />

      <button
        className={
          "shade" + (open ? " open" : "")
        }
        onClick={() => setOpen(false)}
        aria-label="Tutup menu"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
      />

      <section
        className="content"
        inert={
          isMobileDrawer && open
            ? true
            : undefined
        }
      >
        <header
          className={
            socialHeader
              ? "social-app-header"
              : undefined
          }
        >
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
            {eyebrow ? (
              <small>{eyebrow}</small>
            ) : null}
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
                className={
                  "login-link" +
                  (account?.status &&
                  account.status !== "active"
                    ? " account-warning"
                    : "")
                }
                href={
                  user ? "/profil" : "/login"
                }
              >
                {accountLabel}
              </Link>
            ) : null}
          </div>
        </header>

        {children}
      </section>

      <nav
        className="bottom"
        aria-label="Navigasi utama"
        inert={
          isMobileDrawer && open
            ? true
            : undefined
        }
      >
        {bottomItems.map(
          ([label, href, Icon]) => {
            const current = isItemActive(
              label,
              active,
            );

            return (
              <Link
                key={label}
                className={
                  current ? "active" : ""
                }
                href={href}
                aria-current={
                  current
                    ? "page"
                    : undefined
                }
              >
                <Icon />
                <small>{label}</small>
              </Link>
            );
          },
        )}
      </nav>
    </main>
  );
}

export function SyncPending({
  area,
}: {
  area: string;
}) {
  return (
    <section className="empty-state card">
      <span className="status-dot" />
      <h2>{area} siap dihubungkan</h2>
      <p>
        Modul production sudah tersedia. Data akan tampil
        setelah akses Google Sheets untuk server
        dikonfigurasi.
      </p>
    </section>
  );
}
