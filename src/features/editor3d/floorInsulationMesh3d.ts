import { ExtrudeGeometry, Shape } from "three";

import type { FloorInsulationPiece } from "@/core/domain/floorInsulation";
import type { Point2D } from "@/core/geometry/types";

const MM_TO_M = 0.001;

function polygonSignedAreaShape(pts: readonly { readonly x: number; readonly y: number }[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i]!;
    const p1 = pts[(i + 1) % pts.length]!;
    a += p0.x * p1.y - p1.x * p0.y;
  }
  return a / 2;
}

function ensureCCW(pts: readonly { readonly x: number; readonly y: number }[]): { x: number; y: number }[] {
  const copy = pts.map((p) => ({ x: p.x, y: p.y }));
  return polygonSignedAreaShape(copy) >= 0 ? copy : copy.reverse();
}

function shapeFromPlanLoopCCW(planLoop: readonly Point2D[]): Shape | null {
  if (planLoop.length < 3) {
    return null;
  }
  const mapped = planLoop.map((p) => ({ x: p.x * MM_TO_M, y: p.y * MM_TO_M }));
  const ccw = ensureCCW(mapped);
  const s = new Shape();
  s.moveTo(ccw[0]!.x, ccw[0]!.y);
  for (let i = 1; i < ccw.length; i++) {
    s.lineTo(ccw[i]!.x, ccw[i]!.y);
  }
  s.closePath();
  return s;
}

export function buildFloorInsulationExtrudeGeometry(piece: FloorInsulationPiece): {
  readonly geometry: ExtrudeGeometry;
  readonly bottomM: number;
} | null {
  const depthMm = piece.thicknessMm;
  if (!(depthMm > 0)) {
    return null;
  }
  const bottomMm = piece.baseElevationMm;
  const depthM = depthMm * MM_TO_M;
  const bottomM = bottomMm * MM_TO_M;
  const sh = shapeFromPlanLoopCCW(piece.outlineRingMm);
  if (!sh) {
    return null;
  }
  const geometry = new ExtrudeGeometry(sh, { depth: depthM, bevelEnabled: false });
  return { geometry, bottomM };
}
