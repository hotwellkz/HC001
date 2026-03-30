import type { Project } from "./project";
import { getProfileById } from "./profileOps";
import type { Wall } from "./wall";
import type { WallCalculationResult } from "./wallCalculation";
import { coreLayerNormalOffsetsMm } from "./wallProfileLayers";

/**
 * Полоса ядра (утеплитель) по нормали к оси стены для 2D: все внутренние доски
 * (обвязка, стыки, торцы) только здесь, без захода на OSB.
 */
export function boardCoreNormalOffsetsMm(
  wall: Wall,
  calc: WallCalculationResult,
  project: Project,
): { readonly offStartMm: number; readonly offEndMm: number } {
  const T = wall.thicknessMm;
  const profile = wall.profileId ? getProfileById(project, wall.profileId) : undefined;
  if (profile) {
    const core = coreLayerNormalOffsetsMm(T, profile);
    if (core) {
      return core;
    }
  }
  const snap = calc.settingsSnapshot;
  const D = snap.coreDepthMm ?? snap.jointBoardDepthMm ?? snap.plateBoardDepthMm;
  return { offStartMm: -D / 2, offEndMm: D / 2 };
}
