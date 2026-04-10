import type { Point2D } from "../geometry/types";
import type { SnapKind } from "../geometry/snap2d";

export type Ruler2dPhase = "pickFirst" | "stretching" | "done";

export interface Ruler2dSession {
  readonly phase: Ruler2dPhase;
  readonly firstMm: Point2D | null;
  readonly secondMm: Point2D | null;
  readonly previewEndMm: Point2D | null;
  readonly lastSnapKind: SnapKind | null;
  readonly angleSnapLockedDeg: number | null;
}

export function initialRuler2dSession(): Ruler2dSession {
  return {
    phase: "pickFirst",
    firstMm: null,
    secondMm: null,
    previewEndMm: null,
    lastSnapKind: null,
    angleSnapLockedDeg: null,
  };
}
