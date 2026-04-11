import type { Point2D } from "../geometry/types";
import type { SnapKind } from "../geometry/snap2d";

export type Line2dPhase = "pickFirst" | "stretching";

export interface Line2dSession {
  readonly phase: Line2dPhase;
  readonly firstMm: Point2D | null;
  readonly previewEndMm: Point2D | null;
  readonly lastSnapKind: SnapKind | null;
  readonly angleSnapLockedDeg: number | null;
  readonly shiftDirectionLockUnit: Point2D | null;
  readonly shiftLockReferenceMm: Point2D | null;
}

export function initialLine2dSession(): Line2dSession {
  return {
    phase: "pickFirst",
    firstMm: null,
    previewEndMm: null,
    lastSnapKind: null,
    angleSnapLockedDeg: null,
    shiftDirectionLockUnit: null,
    shiftLockReferenceMm: null,
  };
}
