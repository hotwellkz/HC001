import type { FloorInsulationPiece } from "@/core/domain/floorInsulation";
import type { Point2D } from "@/core/geometry/types";

function pointInRing(p: Point2D, ring: readonly Point2D[]): boolean {
  const n = ring.length;
  if (n < 3) {
    return false;
  }
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i]!.x;
    const yi = ring[i]!.y;
    const xj = ring[j]!.x;
    const yj = ring[j]!.y;
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-30) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

function ringAreaAbs(ring: readonly Point2D[]): number {
  if (ring.length < 3) {
    return Infinity;
  }
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p0 = ring[i]!;
    const p1 = ring[(i + 1) % ring.length]!;
    a += p0.x * p1.y - p1.x * p0.y;
  }
  return Math.abs(a / 2);
}

export function pickFloorInsulationPieceAtPoint(
  worldMm: Point2D,
  pieces: readonly FloorInsulationPiece[],
  _tolMm: number,
): { readonly pieceId: string } | null {
  void _tolMm;
  let bestId: string | null = null;
  let bestArea = Infinity;
  for (const p of pieces) {
    const ring = p.outlineRingMm;
    if (ring.length < 3) {
      continue;
    }
    if (!pointInRing(worldMm, ring)) {
      continue;
    }
    const a = ringAreaAbs(ring);
    if (a < bestArea || (a === bestArea && p.id < (bestId ?? ""))) {
      bestArea = a;
      bestId = p.id;
    }
  }
  return bestId ? { pieceId: bestId } : null;
}
