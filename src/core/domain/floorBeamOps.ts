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

export function translateFloorBeamsInProject(
  project: Project,
  beamIds: ReadonlySet<string>,
  dxMm: number,
  dyMm: number,
): Project {
  if (!Number.isFinite(dxMm) || !Number.isFinite(dyMm) || (Math.abs(dxMm) < 1e-9 && Math.abs(dyMm) < 1e-9)) {
    return project;
  }
  const t = new Date().toISOString();
  const floorBeams = project.floorBeams.map((b) =>
    beamIds.has(b.id)
      ? {
          ...b,
          refStartMm: { x: b.refStartMm.x + dxMm, y: b.refStartMm.y + dyMm },
          refEndMm: { x: b.refEndMm.x + dxMm, y: b.refEndMm.y + dyMm },
          updatedAt: t,
        }
      : b,
  );
  return touchProjectMeta({ ...project, floorBeams });
}

export function duplicateFloorBeamInProject(
  project: Project,
  sourceBeamId: string,
): { readonly project: Project; readonly newBeamId: string } | { readonly error: string } {
  const beam = project.floorBeams.find((b) => b.id === sourceBeamId);
  if (!beam) {
    return { error: "Балка не найдена." };
  }
  const t = new Date().toISOString();
  const dup: FloorBeamEntity = {
    ...beam,
    id: newEntityId(),
    refStartMm: { x: beam.refStartMm.x, y: beam.refStartMm.y },
    refEndMm: { x: beam.refEndMm.x, y: beam.refEndMm.y },
    createdAt: t,
    updatedAt: t,
  };
  return {
    project: touchProjectMeta({ ...project, floorBeams: [...project.floorBeams, dup] }),
    newBeamId: dup.id,
  };
}
