import type { LengthChange2dTarget } from "./lengthChange2dSession";
import type { Project } from "./project";
import type { WallEndSide } from "./wallJoint";
import { applyFloorBeamLengthChangeInProject } from "./floorBeamLengthChangeApply";
import { applyWallLengthChangeInProject } from "./wallLengthChangeApply";

export function applyLinearLengthChangeInProject(
  project: Project,
  target: LengthChange2dTarget,
  movingEnd: WallEndSide,
  newLengthMm: number,
): { readonly project: Project } | { readonly error: string } {
  if (target.kind === "wall") {
    return applyWallLengthChangeInProject(project, target.wallId, movingEnd, newLengthMm);
  }
  return applyFloorBeamLengthChangeInProject(project, target.beamId, movingEnd, newLengthMm);
}
