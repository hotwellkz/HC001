import type { Profile } from "./profile";
import { computeProfileTotalThicknessMm } from "./profileOps";

/** Профили, допустимые для балок перекрытия (не SIP-стены). */
export const FLOOR_BEAM_PROFILE_CATEGORIES = [
  "beam",
  "board",
  "custom",
  "pipe",
  "roof",
  "slab",
] as const;

export type FloorBeamProfileCategory = (typeof FLOOR_BEAM_PROFILE_CATEGORIES)[number];

export function isProfileUsableForFloorBeam(profile: Profile): boolean {
  return (FLOOR_BEAM_PROFILE_CATEGORIES as readonly string[]).includes(profile.category);
}

/**
 * Две главные стороны прямоугольного сечения (мм): большая и меньшая из (толщина профиля, defaultWidthMm).
 */
export function beamSectionPrincipalDimsMm(profile: Profile): { aMm: number; bMm: number } | null {
  const t = computeProfileTotalThicknessMm(profile);
  if (!(t > 0)) {
    return null;
  }
  const w =
    profile.defaultWidthMm != null && profile.defaultWidthMm > 0 ? profile.defaultWidthMm : t;
  const a = Math.max(t, w);
  const b = Math.min(t, w);
  return { aMm: a, bMm: b };
}

/**
 * Ориентация прямоугольного сечения линейного элемента (балка, стропило и т.п.):
 * - `flat` — плашмя: большая сторона в плане, меньшая по вертикали в типичной горизонтальной укладке;
 * - `edge` — на ребро: меньшая сторона в плане, большая по «высоте» сечения.
 */
export type LinearElementSectionOrientation = "flat" | "edge";

/**
 * Толщина в плане (перпендикулярно оси балки) и высота по Z.
 * Без roll: «плашмя» — большая сторона в плане, меньшая по высоте.
 * С roll: на ребро — наоборот.
 */
export function beamPlanThicknessAndVerticalMm(
  profile: Profile,
  sectionRolled: boolean,
): { planThicknessMm: number; verticalMm: number } {
  const dims = beamSectionPrincipalDimsMm(profile);
  if (!dims) {
    return { planThicknessMm: 0, verticalMm: 0 };
  }
  return sectionRolled
    ? { planThicknessMm: dims.bMm, verticalMm: dims.aMm }
    : { planThicknessMm: dims.aMm, verticalMm: dims.bMm };
}

/** То же, что {@link beamPlanThicknessAndVerticalMm} с явной ориентацией сечения. */
export function beamPlanThicknessAndVerticalFromOrientationMm(
  profile: Profile,
  orientation: LinearElementSectionOrientation,
): { planThicknessMm: number; verticalMm: number } {
  return beamPlanThicknessAndVerticalMm(profile, orientation === "edge");
}
