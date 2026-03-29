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
