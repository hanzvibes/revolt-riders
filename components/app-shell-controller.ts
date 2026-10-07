"use client";

import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  adminItems,
  hasRole,
  isItemActive,
  komunitasItems,
  operationalItems,
} from "./app-shell-navigation";

export const DRAWER_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useAppShellController(
  active: string,
) {
  const [open, setOpen] = useState(false);
  const [isMobileDrawer, setIsMobileDrawer] =
    useState(false);
  const [pendingJoinCount, setPendingJoinCount] =
    useState(0);
  const menuButtonRef =
    useRef<HTMLButtonElement | null>(null);
  const closeButtonRef =
    useRef<HTMLButtonElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const drawerWasOpenRef = useRef(false);
  const { user, account, loading } =
    useMemberAccess();
  const { fetchWithCache } = useDataCache();

  const canOperational =
    account?.status === "active" &&
    hasRole(account.role, [
      "road_captain",
      "admin",
      "superadmin",
    ]);
  const canAdmin =
    account?.status === "active" &&
    hasRole(account.role, ["admin", "superadmin"]);

  useEffect(() => {
    const media = window.matchMedia(
      "(max-width: 720px)",
    );
    const sync = () =>
      setIsMobileDrawer(media.matches);

    sync();
    media.addEventListener("change", sync);

    return () =>
      media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isMobileDrawer || !open) return;

    drawerWasOpenRef.current = true;
    const previousOverflow =
      document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame =
      window.requestAnimationFrame(() =>
        closeButtonRef.current?.focus(),
      );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (
        event.key !== "Tab" ||
        !asideRef.current
      ) {
        return;
      }

      const focusable = Array.from(
        asideRef.current.querySelectorAll<HTMLElement>(
          DRAWER_FOCUSABLE_SELECTOR,
        ),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !==
            "true" &&
          element.offsetParent !== null,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last =
        focusable[focusable.length - 1];
      const activeElement =
        document.activeElement;

      if (
        event.shiftKey &&
        activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
    };
  }, [isMobileDrawer, open]);

  useEffect(() => {
    if (
      !isMobileDrawer ||
      open ||
      !drawerWasOpenRef.current
    ) {
      return;
    }

    drawerWasOpenRef.current = false;
    window.requestAnimationFrame(() =>
      menuButtonRef.current?.focus(),
    );
  }, [isMobileDrawer, open]);

  const isKomunitasActive = useMemo(
    () =>
      komunitasItems.some(([label]) =>
        isItemActive(label, active),
      ),
    [active],
  );
  const isOperationalActive = useMemo(
    () =>
      operationalItems.some(([label]) =>
        isItemActive(label, active),
      ),
    [active],
  );
  const isAdminActive = useMemo(
    () =>
      adminItems.some(([label]) =>
        isItemActive(label, active),
      ),
    [active],
  );

  const [openSections, setOpenSections] =
    useState<Record<string, boolean>>({
      komunitas: isKomunitasActive,
      operational: isOperationalActive,
      admin: isAdminActive,
    });

  const toggleSection = (key: string) => {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
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
        const result: {
          count?: number | null;
          error?: { message?: string } | null;
        } = await getSupabaseBrowserClient()
          .from("join_requests")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending");

        if (result.error) throw result.error;

        return typeof result.count === "number"
          ? result.count
          : 0;
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

  return {
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
    komunitasOpen: Boolean(
      openSections.komunitas ||
        isKomunitasActive,
    ),
    operationalOpen: Boolean(
      openSections.operational ||
        isOperationalActive,
    ),
    adminOpen: Boolean(
      openSections.admin || isAdminActive,
    ),
    toggleSection,
    accountLabel,
  };
}
