import type { LinearProfilePlacementMode } from "../geometry/linearPlacementGeometry";
import type { Point2D } from "../geometry/types";
import { getProfileById } from "./profileOps";
import type { Project } from "./project";
import { createFloorBeamEntity, addFloorBeamsToProject } from "./floorBeamOps";
import { isProfileUsableForFloorBeam } from "./floorBeamSection";
import type { FloorBeamPlacementDraft, FloorBeamPlacementSession } from "./floorBeamPlacement";

export interface FloorBeamPlacementCommitOk {
  readonly project: Project;
  readonly createdFloorBeamIds: readonly string[];
}

export interface FloorBeamPlacementCommitErr {
  readonly error: string;
}

export type FloorBeamPlacementCommitResult = FloorBeamPlacementCommitOk | FloorBeamPlacementCommitErr;

export function commitFloorBeamPlacementSecondPoint(
  project: Project,
  session: FloorBeamPlacementSession,
  draft: FloorBeamPlacementDraft,
  placementMode: LinearProfilePlacementMode,
  secondPointSnapped: Point2D,
): FloorBeamPlacementCommitResult {
  const first = session.firstPointMm;
  if (!first) {
    return { error: "Нет первой точки." };
  }
  const profile = getProfileById(project, draft.profileId);
  if (!profile) {
    return { error: "Профиль не найден." };
  }
  if (!isProfileUsableForFloorBeam(profile)) {
    return { error: "Профиль не подходит для балки перекрытия." };
  }
  if (!(draft.planThicknessMm > 0)) {
    return { error: "Нулевая толщина сечения в плане." };
  }

  const beam = createFloorBeamEntity({
    layerId: project.activeLayerId,
    profileId: draft.profileId,
    refStartMm: first,
    refEndMm: secondPointSnapped,
    linearPlacementMode: placementMode,
    sectionRolled: draft.sectionRolled,
    baseElevationMm: draft.baseElevationMm,
  });
  if (!beam) {
    return { error: "Слишком короткий сегмент — выберите вторую точку дальше." };
  }
  const next = addFloorBeamsToProject(project, [beam]);
  return { project: next, createdFloorBeamIds: [beam.id] };
}
