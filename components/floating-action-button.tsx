"use client";

import { Plus } from "lucide-react";

export function FloatingActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="floating-action-button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Plus aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
