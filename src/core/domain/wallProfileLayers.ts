import type { Profile, ProfileMaterialType } from "./profile";
import { sortProfileLayersByOrder } from "./profileOps";

const THICK_EPS_MM = 0.5;

/** Минимальная толщина стены на экране (px), ниже которой послойный 2D не рисуется. */
export const MIN_LAYERED_WALL_SCREEN_THICKNESS_PX = 12;

export interface WallProfileLayerStripMm {
  readonly layerId: string;
  readonly materialType: ProfileMaterialType;
  /** Толщина слоя после согласования с wallThicknessMm. */
  readonly thicknessMm: number;
}

/**
 * Слои профиля для визуализации (2D/3D): порядок orderIndex, сумма толщин = wallThicknessMm.
 * null — если не layered или недостаточно слоёв.
 */
export function resolveWallProfileLayerStripsMm(wallThicknessMm: number, profile: Profile): WallProfileLayerStripMm[] | null {
  if (profile.compositionMode !== "layered") {
    return null;
  }
  const sorted = sortProfileLayersByOrder([...profile.layers]);
  if (sorted.length < 2) {
    return null;
  }
  const T = wallThicknessMm;
  let raw = sorted.map((l) => Math.max(0, l.thicknessMm));
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum < 1e-6) {
    return null;
  }
  if (Math.abs(sum - T) > THICK_EPS_MM) {
    const k = T / sum;
    raw = raw.map((t) => t * k);
  }
  return sorted.map((l, i) => ({
    layerId: l.id,
    materialType: l.materialType,
    thicknessMm: raw[i]!,
  }));
}

export function isInsulationCoreMaterial(materialType: ProfileMaterialType): boolean {
  return materialType === "eps" || materialType === "xps" || materialType === "insulation";
}

/**
 * Смещения по нормали (мм) от оси стены для зоны ядра (утеплитель): первая непрерывная
 * полоса слоёв eps/xps/insulation (если в профиле несколько подряд — объединяются).
 */
export function coreLayerNormalOffsetsMm(
  wallThicknessMm: number,
  profile: Profile,
): { readonly offStartMm: number; readonly offEndMm: number } | null {
  const strips = resolveWallProfileLayerStripsMm(wallThicknessMm, profile);
  if (!strips || strips.length < 2) {
    return null;
  }
  const T = wallThicknessMm;
  let acc = -T / 2;
  let bandStart: number | null = null;
  let bandEnd: number | null = null;
  for (const strip of strips) {
    const off0 = acc;
    const off1 = acc + strip.thicknessMm;
    if (isInsulationCoreMaterial(strip.materialType)) {
      if (bandStart === null) {
        bandStart = off0;
      }
      bandEnd = off1;
    } else if (bandStart !== null && bandEnd !== null) {
      return { offStartMm: bandStart, offEndMm: bandEnd };
    }
    acc = off1;
  }
  if (bandStart !== null && bandEnd !== null) {
    return { offStartMm: bandStart, offEndMm: bandEnd };
  }
  return null;
}
