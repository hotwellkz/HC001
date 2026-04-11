import type { Point2D } from "@/core/geometry/types";
import { closestPointOnSegment } from "@/core/geometry/snap2d";
import type { FoundationStripEntity } from "@/core/domain/foundationStrip";
import {
  distanceToFoundationStripOrthoRingMm,
  foundationStripSegmentFootprintQuadMm,
} from "@/core/domain/foundationStripGeometry";
import { distanceToFoundationStripFootprintPolyMm } from "@/core/domain/foundationStripMerge";

function pointInConvexQuad(p: Point2D, quad: readonly Point2D[]): boolean {
  if (quad.length < 3) {
    return false;
  }
  let sign = 0;
  for (let i = 0; i < quad.length; i++) {
    const a = quad[i]!;
    const b = quad[(i + 1) % quad.length]!;
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) < 1e-9) {
      continue;
    }
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) {
      sign = s;
    } else if (s !== sign) {
      return false;
    }
  }
  return sign !== 0;
}

function minDistPointToPolygonBoundaryMm(p: Point2D, poly: readonly Point2D[]): number {
  let best = Infinity;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const { point: q } = closestPointOnSegment(p, a, b);
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < best) {
      best = d;
    }
  }
  return best;
}

export function pickClosestFoundationStripAlongPoint(
  worldMm: Point2D,
  strips: readonly FoundationStripEntity[],
  toleranceMm: number,
): { stripId: string } | null {
  let best: { stripId: string; d: number } | null = null;
  for (const s of strips) {
    let d: number;
    if (s.kind === "ortho_ring") {
      d = distanceToFoundationStripOrthoRingMm(worldMm, s);
    } else if (s.kind === "footprint_poly") {
      d = distanceToFoundationStripFootprintPolyMm(worldMm, s);
    } else {
      const quad = foundationStripSegmentFootprintQuadMm(
        s.axisStart,
        s.axisEnd,
        s.outwardNormalX,
        s.outwardNormalY,
        s.sideOutMm,
        s.sideInMm,
      );
      const inside = pointInConvexQuad(worldMm, quad);
      d = inside ? 0 : minDistPointToPolygonBoundaryMm(worldMm, quad);
    }
    if (d <= toleranceMm && (!best || d < best.d)) {
      best = { stripId: s.id, d };
    }
  }
  return best ? { stripId: best.stripId } : null;
}
