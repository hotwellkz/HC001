import { closestPointOnSegment } from "../geometry/snap2d";
import type { Point2D } from "../geometry/types";
import type { FoundationStripEntity } from "./foundationStrip";
import {
  foundationStripOrthoRingFootprintContoursFromEntityMm,
  foundationStripSegmentFootprintQuadMm,
} from "./foundationStripGeometry";
import type { PlanLine } from "./planLine";
import type { Wall } from "./wall";
function closestPointOnClosedPolylineBoundaryMm(p: Point2D, ring: readonly Point2D[]): Point2D {
  const n = ring.length;
  if (n < 2) {
    return { x: p.x, y: p.y };
  }
  let best: Point2D | null = null;
  let bestD = Infinity;
  for (let i = 0; i < n; i += 1) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-9) {
      continue;
    }
    const { point: q } = closestPointOnSegment(p, a, b);
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best ?? { x: p.x, y: p.y };
}

function closestPointOnQuadBoundaryMm(p: Point2D, quad: readonly Point2D[]): Point2D {
  const n = quad.length;
  if (n < 2) {
    return { x: p.x, y: p.y };
  }
  let best: Point2D | null = null;
  let bestD = Infinity;
  for (let i = 0; i < n; i += 1) {
    const a = quad[i]!;
    const b = quad[(i + 1) % n]!;
    const { point: q } = closestPointOnSegment(p, a, b);
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best ?? { x: p.x, y: p.y };
}

/** Ближайшая точка на контуре ленты к курсору (мм). */
export function closestPointOnFoundationStripEntityMm(e: FoundationStripEntity, worldMm: Point2D): Point2D {
  if (e.kind === "segment") {
    const quad = foundationStripSegmentFootprintQuadMm(
      e.axisStart,
      e.axisEnd,
      e.outwardNormalX,
      e.outwardNormalY,
      e.sideOutMm,
      e.sideInMm,
    );
    return closestPointOnQuadBoundaryMm(worldMm, quad);
  }
  if (e.kind === "ortho_ring") {
    const { outer } = foundationStripOrthoRingFootprintContoursFromEntityMm(e);
    return closestPointOnQuadBoundaryMm(worldMm, outer);
  }
  return closestPointOnClosedPolylineBoundaryMm(worldMm, e.outerRingMm);
}

export function entityCopyAnchorOnWallMm(wall: Wall, worldMm: Point2D): Point2D {
  return closestPointOnSegment(worldMm, wall.start, wall.end).point;
}

export function entityCopyAnchorOnPlanLineMm(line: PlanLine, worldMm: Point2D): Point2D {
  return closestPointOnSegment(worldMm, line.start, line.end).point;
}
