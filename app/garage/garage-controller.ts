"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  deleteMotorcycleRecord,
  saveMotorcycleRecord,
} from "./garage-actions";
import {
  fetchMotorcycles,
  type Motorcycle,
} from "./garage-data";
import {
  emptyMotorcycleForm,
  getPrimaryMotorcycle,
  motorcycleToForm,
  type MotorcycleForm,
} from "./garage-model";

export function useGarageController() {
  const { confirmAction } = useActionDialog();
  const {
    account,
    loading: accessLoading,
  } = useMemberAccess();
  const { fetchWithCache } = useDataCache();

  const [motorcycles, setMotorcycles] = useState<
    Motorcycle[]
  >([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<MotorcycleForm>(
    emptyMotorcycleForm,
  );
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const activeAccount =
    account?.status === "active" ? account : null;
  const memberExternalId =
    activeAccount?.member_external_id ?? null;

  const loadMotorcycles = useCallback(
    async (forceRefresh = false) => {
      if (!memberExternalId) {
        setMotorcycles([]);
        setLoadingData(false);
        return;
      }

      try {
        const data =
          await fetchWithCache<Motorcycle[]>(
            "garage:" + memberExternalId,
            () =>
              fetchMotorcycles(memberExternalId),
            { ttlMs: 90_000, forceRefresh },
          );

        setMotorcycles(data);
        setError("");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Garage belum dapat dimuat.",
        );
      } finally {
        setLoadingData(false);
      }
    },
    [fetchWithCache, memberExternalId],
  );

  useEffect(() => {
    if (accessLoading) return;

    const timer = window.setTimeout(() => {
      void loadMotorcycles();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [accessLoading, loadMotorcycles]);

  const primaryBike = useMemo(
    () => getPrimaryMotorcycle(motorcycles),
    [motorcycles],
  );

  const openCreate = useCallback(() => {
    setForm({
      ...emptyMotorcycleForm,
      isPrimary: motorcycles.length === 0,
    });
    setError("");
    setMessage("");
    setSheetOpen(true);
  }, [motorcycles.length]);

  const openEdit = useCallback(
    (motorcycle: Motorcycle) => {
      setForm(motorcycleToForm(motorcycle));
      setError("");
      setMessage("");
      setSheetOpen(true);
    },
    [],
  );

  const saveMotorcycle = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setSaving(true);
      setError("");
      setMessage("");

      try {
        await saveMotorcycleRecord(form);
        setSheetOpen(false);
        setMessage(
          form.id
            ? "Motor berhasil diperbarui."
            : "Motor berhasil masuk ke Garage.",
        );
        setForm(emptyMotorcycleForm);
        await loadMotorcycles(true);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Data motor belum dapat disimpan.",
        );
      } finally {
        setSaving(false);
      }
    },
    [form, loadMotorcycles],
  );

  const deleteMotorcycle = useCallback(
    async (motorcycle: Motorcycle) => {
      const name =
        motorcycle.nickname ||
        motorcycle.brand + " " + motorcycle.model;

      const confirmed = await confirmAction({
        title: "Hapus motor dari Garage?",
        description:
          name +
          " akan dihapus dari profil Garage kamu.",
        confirmLabel: "Hapus Motor",
        cancelLabel: "Batal",
        destructive: true,
      });

      if (!confirmed) return;

      setBusyId(motorcycle.id);
      setError("");
      setMessage("");

      try {
        await deleteMotorcycleRecord(motorcycle.id);
        setMessage("Motor dihapus dari Garage.");
        await loadMotorcycles(true);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Motor belum dapat dihapus.",
        );
      } finally {
        setBusyId("");
      }
    },
    [confirmAction, loadMotorcycles],
  );

  return {
    account,
    activeAccount,
    accessLoading,
    motorcycles,
    loadingData,
    sheetOpen,
    form,
    saving,
    busyId,
    error,
    message,
    primaryBike,
    setSheetOpen,
    setForm,
    openCreate,
    openEdit,
    saveMotorcycle,
    deleteMotorcycle,
  };
}
