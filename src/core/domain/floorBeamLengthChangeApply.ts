import type { Project } from "./project";
import type { WallEndSide } from "./wallJoint";
import { replaceFloorBeamInProject } from "./floorBeamOps";
import { floorBeamWithMovedRefEndAtLength } from "./floorBeamLengthChangeGeometry";

export function applyFloorBeamLengthChangeInProject(
  project: Project,
  beamId: string,
  movingEnd: WallEndSide,
  newLengthMm: number,
): { readonly project: Project } | { readonly error: string } {
  const beam = project.floorBeams.find((b) => b.id === beamId);
  if (!beam) {
    return { error: "Балка не найдена." };
  }
  const candidate = floorBeamWithMovedRefEndAtLength(beam, movingEnd, newLengthMm);
  if (!candidate) {
    return { error: "Некорректная геометрия балки." };
  }
  return { project: replaceFloorBeamInProject(project, beamId, candidate) };
}
