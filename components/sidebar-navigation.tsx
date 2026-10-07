"use client";

import {
  adminItems,
  isItemActive,
  komunitasItems,
  operationalItems,
  utamaItems,
  type NavItem,
} from "@/components/navigation-config";
import { ChevronDown, Settings, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function NavLinks({
  items,
  active,
  pendingJoinCount,
  isSubnav = false,
  onNavigate,
}: {
  items: readonly NavItem[];
  active: string;
  pendingJoinCount: number;
  isSubnav?: boolean;
  onNavigate: () => void;
}) {
  return (
    <nav className={isSubnav ? "sidebar-subnav" : ""}>
      {items.map(([label, href, Icon]) => {
        const isCurrent = isItemActive(label, active);
        return (
          <Link
            className={isCurrent ? "active" : ""}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            key={label}
            onClick={onNavigate}
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
}

export function SidebarNavigation({
  active,
  canOperational,
  canAdmin,
  pendingJoinCount,
  onNavigate,
}: {
  active: string;
  canOperational: boolean;
  canAdmin: boolean;
  pendingJoinCount: number;
  onNavigate: () => void;
}) {
  const isKomunitasActive = useMemo(
    () => komunitasItems.some(([label]) => isItemActive(label, active)),
    [active],
  );
  const isOperationalActive = useMemo(
    () => operationalItems.some(([label]) => isItemActive(label, active)),
    [active],
  );
  const isAdminActive = useMemo(
    () => adminItems.some(([label]) => isItemActive(label, active)),
    [active],
  );
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    komunitas: isKomunitasActive,
    operational: isOperationalActive,
    admin: isAdminActive,
  });

  const komunitasOpen = Boolean(openSections.komunitas || isKomunitasActive);
  const operationalOpen = Boolean(openSections.operational || isOperationalActive);
  const adminOpen = Boolean(openSections.admin || isAdminActive);
  const toggleSection = (key: string) =>
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));

  return (
    <>
      <p className="navlabel">UTAMA</p>
      <NavLinks items={utamaItems} active={active} pendingJoinCount={pendingJoinCount} onNavigate={onNavigate} />

      <div className="sidebar-accordion-group">
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
          <NavLinks items={komunitasItems} active={active} pendingJoinCount={pendingJoinCount} isSubnav onNavigate={onNavigate} />
        </div>

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
            <NavLinks items={operationalItems} active={active} pendingJoinCount={pendingJoinCount} isSubnav onNavigate={onNavigate} />
          </div>
        )}

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
            <NavLinks items={adminItems} active={active} pendingJoinCount={pendingJoinCount} isSubnav onNavigate={onNavigate} />
          </div>
        )}
      </div>
    </>
  );
}
