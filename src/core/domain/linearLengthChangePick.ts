import type { Point2D } from "../geometry/types";
import type { FloorBeamEntity } from "./floorBeam";
import { floorBeamCenterlineEndpointsMm } from "./floorBeamGeometry";
import type { Project } from "./project";
import type { Wall } from "./wall";
import type { WallEndSide } from "./wallJoint";

export type LinearLengthChangePickKind = "wall" | "floorBeam";

export interface LinearLengthEndPickHit {
  readonly kind: LinearLengthChangePickKind;
  readonly id: string;
  readonly end: WallEndSide;
  readonly pointMm: Point2D;
  readonly distMm: number;
}

function distPointPoint(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Торец линейного профильного объекта для инструмента «Изменение длины»:
 * стена — ось start/end; балка — видимые торцы (центральная ось контура в плане).
 */
export function pickNearestLinearProfileLengthEnd(
  worldMm: Point2D,
  project: Project,
  walls: readonly Wall[],
  floorBeams: readonly FloorBeamEntity[],
  toleranceMm: number,
): LinearLengthEndPickHit | null {
  let best: LinearLengthEndPickHit | null = null;

  for (const w of walls) {
    for (const end of ["start", "end"] as const) {
      const p = end === "start" ? w.start : w.end;
      const d = distPointPoint(worldMm, p);
      if (d <= toleranceMm && (!best || d < best.distMm)) {
        best = { kind: "wall", id: w.id, end, pointMm: p, distMm: d };
      }
    }
  }

  for (const beam of floorBeams) {
    const ends = floorBeamCenterlineEndpointsMm(project, beam);
    if (!ends) {
      continue;
    }
    const pairs: { readonly end: WallEndSide; readonly p: Point2D }[] = [
      { end: "start", p: ends.cs },
      { end: "end", p: ends.ce },
    ];
    for (const { end, p } of pairs) {
      const d = distPointPoint(worldMm, p);
      if (d <= toleranceMm && (!best || d < best.distMm)) {
        best = { kind: "floorBeam", id: beam.id, end, pointMm: p, distMm: d };
      }
    }
  }

  return best;
}
