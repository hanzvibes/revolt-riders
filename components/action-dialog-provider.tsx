"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ConfirmOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PromptOptions = ConfirmOptions & {
  defaultValue?: string;
  placeholder?: string;
};

type DialogRequest =
  | ({ kind: "confirm" } & ConfirmOptions)
  | ({ kind: "prompt" } & PromptOptions);

type ActionDialogContextValue = {
  confirmAction: (message: string | ConfirmOptions) => Promise<boolean>;
  promptAction: (
    message: string | PromptOptions,
    defaultValue?: string,
  ) => Promise<string | null>;
};

const ActionDialogContext = createContext<ActionDialogContextValue | null>(null);

const normalizeConfirm = (
  message: string | ConfirmOptions,
): ConfirmOptions =>
  typeof message === "string"
    ? {
        title: "Konfirmasi tindakan",
        description: message,
      }
    : message;

const normalizePrompt = (
  message: string | PromptOptions,
  defaultValue = "",
): PromptOptions =>
  typeof message === "string"
    ? {
        title: "Tambahkan keterangan",
        description: message,
        defaultValue,
      }
    : {
        ...message,
        defaultValue: message.defaultValue ?? defaultValue,
      };

export function ActionDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const resolverRef = useRef<((value: boolean | string | null) => void) | null>(
    null,
  );
  const requestKindRef = useRef<DialogRequest["kind"] | null>(null);

  const settle = useCallback((value: boolean | string | null) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    requestKindRef.current = null;
    setRequest(null);
    setPromptValue("");
    resolver?.(value);
  }, []);

  const cancelPending = useCallback(() => {
    if (!resolverRef.current) return;
    settle(requestKindRef.current === "prompt" ? null : false);
  }, [settle]);

  const confirmAction = useCallback(
    (message: string | ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        cancelPending();
        const nextRequest: DialogRequest = {
          kind: "confirm",
          ...normalizeConfirm(message),
        };
        resolverRef.current = (value) => resolve(value === true);
        requestKindRef.current = "confirm";
        setRequest(nextRequest);
      }),
    [cancelPending],
  );

  const promptAction = useCallback(
    (message: string | PromptOptions, defaultValue = "") =>
      new Promise<string | null>((resolve) => {
        cancelPending();
        const normalized = normalizePrompt(message, defaultValue);
        resolverRef.current = (value) =>
          resolve(typeof value === "string" ? value : null);
        requestKindRef.current = "prompt";
        setPromptValue(normalized.defaultValue ?? "");
        setRequest({ kind: "prompt", ...normalized });
      }),
    [cancelPending],
  );

  useEffect(
    () => () => {
      if (!resolverRef.current) return;
      const fallback = requestKindRef.current === "prompt" ? null : false;
      resolverRef.current(fallback);
      resolverRef.current = null;
      requestKindRef.current = null;
    },
    [],
  );

  const contextValue = useMemo(
    () => ({ confirmAction, promptAction }),
    [confirmAction, promptAction],
  );

  const confirmRequest = request?.kind === "confirm" ? request : null;
  const promptRequest = request?.kind === "prompt" ? request : null;

  return (
    <ActionDialogContext.Provider value={contextValue}>
      {children}

      <AlertDialog
        open={Boolean(confirmRequest)}
        onOpenChange={(open) => {
          if (!open && confirmRequest) settle(false);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmRequest?.title ?? "Konfirmasi tindakan"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRequest?.description ?? ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="min-h-11"
              onClick={() => settle(false)}
            >
              {confirmRequest?.cancelLabel ?? "Batal"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11"
              variant={confirmRequest?.destructive ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {confirmRequest?.confirmLabel ?? "Lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(promptRequest)}
        onOpenChange={(open) => {
          if (!open && promptRequest) settle(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              settle(promptValue.trim());
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {promptRequest?.title ?? "Tambahkan keterangan"}
              </DialogTitle>
              <DialogDescription>
                {promptRequest?.description ?? ""}
              </DialogDescription>
            </DialogHeader>
            <label className="grid gap-2 text-sm font-medium">
              Keterangan
              <Input
                autoFocus
                value={promptValue}
                placeholder={promptRequest?.placeholder ?? "Tulis keterangan..."}
                onChange={(event) => setPromptValue(event.target.value)}
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => settle(null)}
              >
                {promptRequest?.cancelLabel ?? "Batal"}
              </Button>
              <Button
                type="submit"
                className="min-h-11"
                variant={promptRequest?.destructive ? "destructive" : "default"}
              >
                {promptRequest?.confirmLabel ?? "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ActionDialogContext.Provider>
  );
}

export function useActionDialog() {
  const context = useContext(ActionDialogContext);
  if (!context) {
    throw new Error("useActionDialog harus digunakan di dalam ActionDialogProvider.");
  }
  return context;
}
