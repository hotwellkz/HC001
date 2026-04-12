import { generateFloorInsulationPieces } from "./floorInsulationGenerate";
import type { FloorInsulationLayoutMode } from "./floorInsulation";
import { appendFloorInsulationPiecesForLayer } from "./floorInsulationOps";
import type { FloorInsulationFillRegion } from "./floorInsulationGeometry";
import { resolveFloorInsulationTemplateFromProfile } from "./insulationProfile";
import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";
import { getProfileById } from "./profileOps";

export function applyFloorInsulationToLayer(
  project: Project,
  layerId: string,
  profileId: string,
  layoutMode: FloorInsulationLayoutMode,
  fillRegion: FloorInsulationFillRegion,
  singleCellPointMm: { readonly x: number; readonly y: number } | null,
): { readonly project: Project; readonly errorMessage: string | null } {
  const profile = getProfileById(project, profileId);
  if (!profile || profile.category !== "insulation" || !profile.insulation) {
    return {
      project,
      errorMessage: "Выберите профиль утеплителя (категория «Утеплитель») в панели инструмента.",
    };
  }
  const template = resolveFloorInsulationTemplateFromProfile(profile, layoutMode);
  if (!template) {
    return { project, errorMessage: "Профиль утеплителя повреждён или неполный." };
  }
  const { pieces, errorMessage } = generateFloorInsulationPieces({
    project,
    layerId,
    template,
    profileId,
    profile,
    fillRegion,
    singleCellPointMm,
  });
  if (errorMessage && pieces.length === 0) {
    return { project, errorMessage };
  }
  const next = touchProjectMeta(appendFloorInsulationPiecesForLayer(project, layerId, pieces));
  return { project: next, errorMessage };
}
