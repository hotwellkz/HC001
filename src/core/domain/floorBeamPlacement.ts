import type { SnapKind } from "../geometry/snap2d";
import type { Point2D } from "../geometry/types";
import type { Project } from "./project";

export type FloorBeamPlacementPhase =
  | "waitingOriginAndFirst"
  | "waitingFirstPoint"
  | "waitingSecondPoint";

export interface FloorBeamPlacementDraft {
  readonly profileId: string;
  readonly baseElevationMm: number;
  readonly sectionRolled: boolean;
  readonly planThicknessMm: number;
}

export interface FloorBeamPlacementSession {
  readonly phase: FloorBeamPlacementPhase;
  readonly draft: FloorBeamPlacementDraft;
  readonly firstPointMm: Point2D | null;
  readonly previewEndMm: Point2D | null;
  readonly lastSnapKind: SnapKind | null;
  readonly angleSnapLockedDeg: number | null;
  readonly shiftDirectionLockUnit: Point2D | null;
  readonly shiftLockReferenceMm: Point2D | null;
}

export function initialFloorBeamPlacementPhase(project: Project): FloorBeamPlacementPhase {
  return project.projectOrigin == null ? "waitingOriginAndFirst" : "waitingFirstPoint";
}

export function floorBeamPlacementHintMessage(phase: FloorBeamPlacementPhase): string {
  switch (phase) {
    case "waitingOriginAndFirst":
      return "Выберите первую точку";
    case "waitingFirstPoint":
      return "Выберите первую точку";
    case "waitingSecondPoint":
      return "Выберите вторую точку";
    default:
      return "";
  }
}
