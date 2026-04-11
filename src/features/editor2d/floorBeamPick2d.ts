import type { EntityCopySnapVisualKind } from "@/core/domain/entityCopySnapSystem";
import { snapTaggedPointsForFloorBeamEntity } from "@/core/domain/entityCopySnapSystem";
import type { Project } from "@/core/domain/project";
import type { FloorBeamEntity } from "@/core/domain/floorBeam";
import { floorBeamPlanQuadCornersMm } from "@/core/domain/floorBeamGeometry";
import type { Point2D } from "@/core/geometry/types";
import type { ViewportTransform } from "@/core/geometry/viewportTransform";
import { worldToScreen } from "@/core/geometry/viewportTransform";
import { resolveSnap2d, type SnapKind, type SnapSettings2d } from "@/core/geometry/snap2d";

/** Точка в многоугольнике (мм), ось Y вверх. */
function pointInPolygonMm(px: number, py: number, poly: readonly Point2D[]): boolean {
  if (poly.length < 3) {
    return false;
  }
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i]!.x;
    const yi = poly[i]!.y;
    const xj = poly[j]!.x;
    const yj = poly[j]!.y;
    const dy = yj - yi;
    if (Math.abs(dy) < 1e-12) {
      continue;
    }
    const intersect = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / dy + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

/** Ближайшая балка под курсором (внутри контура или у ребра в пределах tolMm). */
export function pickFloorBeamAtPlanPoint(
  project: Project,
  beams: readonly FloorBeamEntity[],
  worldMm: Point2D,
  tolMm: number,
): FloorBeamEntity | null {
  let insideBest: { beam: FloorBeamEntity; d: number } | null = null;
  for (const beam of beams) {
    const q = floorBeamPlanQuadCornersMm(project, beam);
    if (!q || q.length !== 4) {
      continue;
    }
    if (pointInPolygonMm(worldMm.x, worldMm.y, q)) {
      const cx = (q[0]!.x + q[1]!.x + q[2]!.x + q[3]!.x) / 4;
      const cy = (q[0]!.y + q[1]!.y + q[2]!.y + q[3]!.y) / 4;
      const d = Math.hypot(worldMm.x - cx, worldMm.y - cy);
      if (!insideBest || d < insideBest.d) {
        insideBest = { beam, d };
      }
    }
  }
  if (insideBest) {
    return insideBest.beam;
  }
  if (!(tolMm > 0)) {
    return null;
  }
  let edgeBest: { beam: FloorBeamEntity; d: number } | null = null;
  for (const beam of beams) {
    const cl = floorBeamPlanQuadCornersMm(project, beam);
    if (!cl || cl.length !== 4) {
      continue;
    }
    for (let i = 0; i < 4; i++) {
      const a = cl[i]!;
      const b = cl[(i + 1) % 4]!;
      const d = distancePointToSegmentMm(worldMm, a, b);
      if (d <= tolMm && (!edgeBest || d < edgeBest.d)) {
        edgeBest = { beam, d };
      }
    }
  }
  return edgeBest?.beam ?? null;
}

/**
 * Ближайшая опорная точка балки (как при копировании) к курсору в экранных пикселях.
 */
export function pickClosestFloorBeamHandle(
  worldMm: Point2D,
  project: Project,
  beam: FloorBeamEntity,
  viewport: ViewportTransform,
  tolPx: number,
): { readonly pointMm: Point2D } | null {
  const tagged = snapTaggedPointsForFloorBeamEntity(project, beam);
  if (tagged.length === 0) {
    return null;
  }
  const s0 = worldToScreen(worldMm.x, worldMm.y, viewport);
  let best: { pointMm: Point2D; d: number } | null = null;
  for (const p of tagged) {
    const s = worldToScreen(p.world.x, p.world.y, viewport);
    const d = Math.hypot(s.x - s0.x, s.y - s0.y);
    if (d <= tolPx && (!best || d < best.d)) {
      best = { pointMm: { x: p.world.x, y: p.world.y }, d };
    }
  }
  return best ? { pointMm: best.pointMm } : null;
}

function distancePointToSegmentMm(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = a.x + t * dx;
  const qy = a.y + t * dy;
  return Math.hypot(p.x - qx, p.y - qy);
}

function closestPointOnSegmentMm(p: Point2D, a: Point2D, b: Point2D): Point2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) {
    return { x: a.x, y: a.y };
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

function closestPointOnQuadBoundaryMm(p: Point2D, q: readonly Point2D[]): Point2D {
  if (q.length < 2) {
    return p;
  }
  let best = closestPointOnSegmentMm(p, q[0]!, q[1]!);
  let bestD = Math.hypot(p.x - best.x, p.y - best.y);
  for (let i = 1; i < q.length; i++) {
    const a = q[i]!;
    const b = q[(i + 1) % q.length]!;
    const c = closestPointOnSegmentMm(p, a, b);
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function snapKindForBeamTagVisual(visual: EntityCopySnapVisualKind): SnapKind {
  if (visual === "vertex") {
    return "vertex";
  }
  if (visual === "edgeMid") {
    return "edge";
  }
  return "grid";
}

/**
 * Привязка к характерным точкам контура/оси балки (те же tagged points, что у копирования сущностей),
 * плюс общий resolveSnap2d по плану. Используется в фазе выбора опорной точки переноса.
 */
export function snapFloorBeamMoveBasePoint(
  project: Project,
  beam: FloorBeamEntity,
  rawWorldMm: Point2D,
  viewport: ViewportTransform,
  snapSettings: SnapSettings2d,
  gridStepMm: number,
): { readonly point: Point2D; readonly kind: SnapKind } {
  const gen = resolveSnap2d({
    rawWorldMm,
    viewport,
    project,
    snapSettings,
    gridStepMm,
    excludeFloorBeamId: beam.id,
  });
  const tagged = snapTaggedPointsForFloorBeamEntity(project, beam);
  if (tagged.length === 0) {
    return { point: gen.point, kind: gen.kind };
  }
  const pxTol = Math.max(10, 14);
  const attachMm = Math.max(60, pxTol / Math.max(viewport.zoomPixelsPerMm, 1e-6));

  let bestTag: { readonly world: Point2D; readonly visual: EntityCopySnapVisualKind; readonly dMm: number } | null =
    null;
  for (const t of tagged) {
    const dMm = Math.hypot(t.world.x - gen.point.x, t.world.y - gen.point.y);
    if (!bestTag || dMm < bestTag.dMm) {
      bestTag = { world: t.world, visual: t.visual, dMm };
    }
  }
  if (bestTag && bestTag.dMm <= attachMm) {
    const k = snapKindForBeamTagVisual(bestTag.visual);
    return { point: bestTag.world, kind: gen.kind !== "none" ? gen.kind : k };
  }

  const q = floorBeamPlanQuadCornersMm(project, beam);
  if (q && q.length === 4) {
    const onB = closestPointOnQuadBoundaryMm(gen.point, q);
    return { point: onB, kind: gen.kind };
  }
  return { point: gen.point, kind: gen.kind };
}
