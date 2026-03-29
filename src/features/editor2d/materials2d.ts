import type { ProfileMaterialType } from "@/core/domain/profile";

/** Заливка плана (Pixi fill), приглушённые тона под тёмный UI. */
const FALLBACK = 0x6a7585;

const FILL: Readonly<Record<ProfileMaterialType, number>> = {
  osb: 0xa88a5c,
  eps: 0xb8c4cc,
  xps: 0xa8bcc8,
  wood: 0x8b7355,
  steel: 0x8a9098,
  gypsum: 0xc5c8ce,
  concrete: 0x6e757d,
  membrane: 0x5a626c,
  insulation: 0xd0d6dc,
  custom: FALLBACK,
};

export function fillColor2dForMaterialType(mt: ProfileMaterialType): number {
  return FILL[mt] ?? FALLBACK;
}
