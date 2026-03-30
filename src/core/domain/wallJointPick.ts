import type { Point2D } from "../geometry/types";
import type { Wall } from "./wall";
import type { WallEndSide } from "./wallJoint";
import { closestPointOnSegment } from "./wallJointGeometry";

export interface WallEndPickHit {
  readonly wallId: string;
  readonly end: WallEndSide;
  readonly pointMm: Point2D;
  readonly distMm: number;
}

export interface WallSegmentPickHit {
  readonly wallId: string;
  readonly pointMm: Point2D;
  readonly t: number;
}

function distPointPoint(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Ближайший торец стены к точке (если в пределах toleranceMm).
 */
export function pickNearestWallEnd(
  worldMm: Point2D,
  walls: readonly Wall[],
  toleranceMm: number,
): WallEndPickHit | null {
  let best: WallEndPickHit | null = null;
  for (const w of walls) {
    for (const end of ["start", "end"] as const) {
      const p = end === "start" ? w.start : w.end;
      const d = distPointPoint(worldMm, p);
      if (d <= toleranceMm && (!best || d < best.distMm)) {
        best = { wallId: w.id, end, pointMm: p, distMm: d };
      }
    }
  }
  return best;
}

/**
 * Клик по сегменту стены (ось), не у торцов — для T-стыка.
 * endMarginMm — зона у торцов, где считаем «торец», а не сторона.
 */
export function pickWallSegmentInterior(
  worldMm: Point2D,
  walls: readonly Wall[],
  toleranceMm: number,
  endMarginMm: number,
): WallSegmentPickHit | null {
  let best: WallSegmentPickHit | null = null;
  let bestDist = Infinity;
  const a = { x: 0, y: 0 };
  const b = { x: 0, y: 0 };
  for (const w of walls) {
    a.x = w.start.x;
    a.y = w.start.y;
    b.x = w.end.x;
    b.y = w.end.y;
    const { point: p, t } = closestPointOnSegment(a, b, worldMm);
    const dx = worldMm.x - p.x;
    const dy = worldMm.y - p.y;
    const d = Math.hypot(dx, dy);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const marginT = len > 1e-6 ? endMarginMm / len : 0;
    if (t < marginT || t > 1 - marginT) {
      continue;
    }
    if (d <= toleranceMm && d < bestDist) {
      bestDist = d;
      best = { wallId: w.id, pointMm: p, t };
    }
  }
  return best;
}
