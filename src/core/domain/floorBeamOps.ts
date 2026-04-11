import type { Point2D } from "../geometry/types";
import type { FloorBeamEntity } from "./floorBeam";
import { newEntityId } from "./ids";
import { touchProjectMeta } from "./projectFactory";
import type { Project } from "./project";
import type { LinearProfilePlacementMode } from "../geometry/linearPlacementGeometry";

export const MIN_FLOOR_BEAM_SEGMENT_LENGTH_MM = 1;

export function segmentLengthMm(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export interface CreateFloorBeamInput {
  readonly layerId: string;
  readonly profileId: string;
  readonly refStartMm: Point2D;
  readonly refEndMm: Point2D;
  readonly linearPlacementMode: LinearProfilePlacementMode;
  readonly sectionRolled: boolean;
  readonly baseElevationMm: number;
}

export function createFloorBeamEntity(input: CreateFloorBeamInput): FloorBeamEntity | null {
  if (!Number.isFinite(input.baseElevationMm)) {
    return null;
  }
  if (segmentLengthMm(input.refStartMm, input.refEndMm) < MIN_FLOOR_BEAM_SEGMENT_LENGTH_MM) {
    return null;
  }
  const t = new Date().toISOString();
  return {
    id: newEntityId(),
    layerId: input.layerId,
    profileId: input.profileId,
    refStartMm: { x: input.refStartMm.x, y: input.refStartMm.y },
    refEndMm: { x: input.refEndMm.x, y: input.refEndMm.y },
    linearPlacementMode: input.linearPlacementMode,
    sectionRolled: input.sectionRolled,
    baseElevationMm: input.baseElevationMm,
    createdAt: t,
    updatedAt: t,
  };
}

export function addFloorBeamsToProject(project: Project, beams: readonly FloorBeamEntity[]): Project {
  return touchProjectMeta({
    ...project,
    floorBeams: [...project.floorBeams, ...beams],
  });
}

export function replaceFloorBeamInProject(project: Project, beamId: string, next: FloorBeamEntity): Project {
  const t = new Date().toISOString();
  return touchProjectMeta({
    ...project,
    floorBeams: project.floorBeams.map((b) =>
      b.id === beamId
        ? {
            ...next,
            updatedAt: t,
          }
        : b,
    ),
  });
}
