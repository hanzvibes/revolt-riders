import type { Motorcycle } from "./garage-data";

export type MotorcycleForm = {
  id: string | null;
  nickname: string;
  brand: string;
  model: string;
  productionYear: string;
  style: string;
  engineCc: string;
  color: string;
  notes: string;
  isPrimary: boolean;
  isVisibleToMembers: boolean;
};

export const emptyMotorcycleForm: MotorcycleForm = {
  id: null,
  nickname: "",
  brand: "",
  model: "",
  productionYear: "",
  style: "",
  engineCc: "",
  color: "",
  notes: "",
  isPrimary: false,
  isVisibleToMembers: true,
};

export const motorcycleStyles = [
  "Cafe Racer",
  "Tracker",
  "Scrambler",
  "Bobber",
  "Chopper",
  "Brat Style",
  "Street Cub",
  "Board Tracker",
  "Classic",
  "Adventure",
  "Other",
];

export function motorcycleToForm(
  motorcycle: Motorcycle,
): MotorcycleForm {
  return {
    id: motorcycle.id,
    nickname: motorcycle.nickname ?? "",
    brand: motorcycle.brand,
    model: motorcycle.model,
    productionYear: motorcycle.production_year
      ? String(motorcycle.production_year)
      : "",
    style: motorcycle.style ?? "",
    engineCc: motorcycle.engine_cc
      ? String(motorcycle.engine_cc)
      : "",
    color: motorcycle.color ?? "",
    notes: motorcycle.notes ?? "",
    isPrimary: motorcycle.is_primary,
    isVisibleToMembers:
      motorcycle.is_visible_to_members,
  };
}

export function getPrimaryMotorcycle(
  motorcycles: Motorcycle[],
) {
  return (
    motorcycles.find(
      (motorcycle) => motorcycle.is_primary,
    ) ??
    motorcycles[0] ??
    null
  );
}
