import type { SlabEntity } from "@/core/domain/slab";
import type { Point2D } from "@/core/geometry/types";

function dist2(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function closestPointOnSegmentMm(p: Point2D, a: Point2D, b: Point2D): Point2D {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-18) {
    return { x: a.x, y: a.y };
  }
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + abx * t, y: a.y + aby * t };
}

export function closestPointOnSlabBoundaryMm(slab: SlabEntity, p: Point2D): Point2D {
  const pts = slab.pointsMm;
  const n = pts.length;
  if (n === 0) {
    return { x: p.x, y: p.y };
  }
  if (n === 1) {
    return { x: pts[0]!.x, y: pts[0]!.y };
  }
  let best = closestPointOnSegmentMm(p, pts[0]!, pts[1]!);
  let bestD = dist2(p, best);
  for (let i = 1; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    const q = closestPointOnSegmentMm(p, a, b);
    const d = dist2(p, q);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

/** Ray casting; на границе может дать произвольно — для pick используем вместе с расстоянием до контура. */
export function pointInSlabPolygonEvenOdd(p: Point2D, slab: SlabEntity): boolean {
  const pts = slab.pointsMm;
  const n = pts.length;
  if (n < 3) {
    return false;
  }
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = pts[i]!;
    const pj = pts[j]!;
    const intersect =
      pi.y > p.y !== pj.y > p.y &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y + 1e-30) + pi.x;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

export function pickClosestSlabAtPoint(
  worldMm: Point2D,
  slabs: readonly SlabEntity[],
  tolMm: number,
): { readonly slabId: string } | null {
  const tol2 = tolMm * tolMm;
  let bestId: string | null = null;
  let bestD = tol2;
  for (const s of slabs) {
    if (s.pointsMm.length < 3) {
      continue;
    }
    const onB = closestPointOnSlabBoundaryMm(s, worldMm);
    const dEdge = dist2(worldMm, onB);
    const inside = pointInSlabPolygonEvenOdd(worldMm, s);
    const d = inside ? 0 : dEdge;
    if (d < bestD - 1e-9) {
      bestD = d;
      bestId = s.id;
    }
  }
  return bestId ? { slabId: bestId } : null;
}
