import { snapWorldToGridAlignedToOrigin } from "../domain/projectOriginPlan";
import { floorBeamCenterlineEndpointsMm, floorBeamPlanQuadCornersMm } from "../domain/floorBeamGeometry";
import type { Project } from "../domain/project";
import { getProfileById } from "../domain/profileOps";
import {
  foundationStripOrthoRingFootprintContoursFromEntityMm,
  foundationStripSegmentFootprintQuadMm,
} from "../domain/foundationStripGeometry";
import { resolveWallProfileLayerStripsMm } from "../domain/wallProfileLayers";
import type { Point2D } from "./types";
import type { ViewportTransform } from "./viewportTransform";
import { worldToScreen } from "./viewportTransform";

/** Пороги в экранных пикселях (стабильны при zoom). */
export const SNAP_VERTEX_PX = 14;
export const SNAP_EDGE_PX = 10;
export const SNAP_GRID_PX = 8;

/** Слияние близких вершин плана (мм), чтобы не дублировать кандидатов на одном углу. */
const SNAP_VERTEX_MERGE_EPS_MM = 0.5;

export type SnapKind = "vertex" | "edge" | "grid" | "none";

export interface SnapSettings2d {
  readonly snapToVertex: boolean;
  readonly snapToEdge: boolean;
  readonly snapToGrid: boolean;
}

export interface SnapResult2d {
  readonly point: Point2D;
  readonly kind: SnapKind;
  /** Стена, к кромке которой привязались (edge). */
  readonly wallId?: string;
  /** Линия чертежа (edge). */
  readonly planLineId?: string;
}

/** Слои, по геометрии которых разрешена привязка: активный + видимые контекстные. */
export function layerIdsForSnapGeometry(project: Project): ReadonlySet<string> {
  const ids = new Set<string>([project.activeLayerId]);
  for (const id of project.visibleLayerIds) {
    ids.add(id);
  }
  return ids;
}

function screenDistancePx(a: Point2D, b: Point2D, t: ViewportTransform): number {
  const sa = worldToScreen(a.x, a.y, t);
  const sb = worldToScreen(b.x, b.y, t);
  return Math.hypot(sb.x - sa.x, sb.y - sa.y);
}

/** Ближайшая точка на отрезке [a,b] и параметр t∈[0,1]. */
export function closestPointOnSegment(
  p: Point2D,
  a: Point2D,
  b: Point2D,
): { readonly point: Point2D; readonly t: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-18) {
    return { point: { x: a.x, y: a.y }, t: 0 };
  }
  let u = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  u = Math.max(0, Math.min(1, u));
  return {
    point: { x: a.x + u * abx, y: a.y + u * aby },
    t: u,
  };
}

const ENDPOINT_EPS = 1e-5;

/** Четыре угла полосы стены в плане (мм) — та же геометрия, что и в 2D-отрисовке. */
export function wallStripQuadCornersMm(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  offStartMm: number,
  offEndMm: number,
): Point2D[] | null {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return null;
  }
  const px = -dy / len;
  const py = dx / len;
  return [
    { x: sx + px * offStartMm, y: sy + py * offStartMm },
    { x: ex + px * offStartMm, y: ey + py * offStartMm },
    { x: ex + px * offEndMm, y: ey + py * offEndMm },
    { x: sx + px * offEndMm, y: sy + py * offEndMm },
  ];
}

function dedupeVerticesMm(points: readonly Point2D[], epsMm: number): Point2D[] {
  const out: Point2D[] = [];
  for (const p of points) {
    if (!out.some((q) => Math.hypot(p.x - q.x, p.y - q.y) <= epsMm)) {
      out.push({ x: p.x, y: p.y });
    }
  }
  return out;
}

/**
 * Кандидаты для привязки «к углам»: вершины контуров полос профиля в плане + концы осевой линии + origin.
 * Не использовать только start/end оси — иначе теряются наружные/внутренние углы толстой стены.
 */
export function collectWallPlanVertexSnapCandidatesMm(project: Project, layerIds: ReadonlySet<string>): Point2D[] {
  const raw: Point2D[] = [];
  const walls = project.walls.filter((w) => layerIds.has(w.layerId));
  for (const w of walls) {
    const sx = w.start.x;
    const sy = w.start.y;
    const ex = w.end.x;
    const ey = w.end.y;
    const T = w.thicknessMm;
    if (!Number.isFinite(T) || T <= 0) {
      continue;
    }
    raw.push({ x: sx, y: sy }, { x: ex, y: ey });
    const profile = w.profileId ? getProfileById(project, w.profileId) : undefined;
    const strips = profile ? resolveWallProfileLayerStripsMm(T, profile) : null;
    if (strips && strips.length > 0) {
      let acc = -T / 2;
      for (const strip of strips) {
        const off0 = acc;
        const off1 = acc + strip.thicknessMm;
        const q = wallStripQuadCornersMm(sx, sy, ex, ey, off0, off1);
        if (q) {
          raw.push(...q);
        }
        acc = off1;
      }
    } else {
      const q = wallStripQuadCornersMm(sx, sy, ex, ey, -T / 2, T / 2);
      if (q) {
        raw.push(...q);
      }
    }
  }
  if (project.projectOrigin) {
    const o = project.projectOrigin;
    raw.push({ x: o.x, y: o.y });
  }
  return dedupeVerticesMm(raw, SNAP_VERTEX_MERGE_EPS_MM);
}

/** Углы ленты фундамента, углы и центры свай (по слоям привязки). */
export function collectFoundationPlanVertexSnapCandidatesMm(
  project: Project,
  layerIds: ReadonlySet<string>,
  excludeFoundationPileId?: string,
): Point2D[] {
  const raw: Point2D[] = [];
  for (const fs of project.foundationStrips) {
    if (!layerIds.has(fs.layerId)) {
      continue;
    }
    if (fs.kind === "ortho_ring") {
      const { outer, inner } = foundationStripOrthoRingFootprintContoursFromEntityMm(fs);
      raw.push(...outer, ...inner);
      continue;
    }
    if (fs.kind === "footprint_poly") {
      raw.push(...fs.outerRingMm);
      for (const h of fs.holeRingsMm) {
        raw.push(...h);
      }
      continue;
    }
    const q = foundationStripSegmentFootprintQuadMm(
      fs.axisStart,
      fs.axisEnd,
      fs.outwardNormalX,
      fs.outwardNormalY,
      fs.sideOutMm,
      fs.sideInMm,
    );
    raw.push(...q);
  }
  for (const p of project.foundationPiles) {
    if (!layerIds.has(p.layerId)) {
      continue;
    }
    if (excludeFoundationPileId != null && p.id === excludeFoundationPileId) {
      continue;
    }
    const h = Math.max(p.capSizeMm, p.sizeMm) / 2;
    raw.push(
      { x: p.centerX - h, y: p.centerY - h },
      { x: p.centerX + h, y: p.centerY - h },
      { x: p.centerX + h, y: p.centerY + h },
      { x: p.centerX - h, y: p.centerY + h },
      { x: p.centerX, y: p.centerY },
    );
  }
  return dedupeVerticesMm(raw, SNAP_VERTEX_MERGE_EPS_MM);
}

function collectFloorBeamPlanVertexSnapCandidatesMm(
  project: Project,
  layerIds: ReadonlySet<string>,
  excludeFloorBeamId?: string,
): Point2D[] {
  const raw: Point2D[] = [];
  for (const b of project.floorBeams) {
    if (!layerIds.has(b.layerId)) {
      continue;
    }
    if (excludeFloorBeamId != null && b.id === excludeFloorBeamId) {
      continue;
    }
    const q = floorBeamPlanQuadCornersMm(project, b);
    if (q) {
      raw.push(...q);
    }
    const cl = floorBeamCenterlineEndpointsMm(project, b);
    if (cl) {
      raw.push({ x: cl.cs.x, y: cl.cs.y }, { x: cl.ce.x, y: cl.ce.y });
    }
  }
  return dedupeVerticesMm(raw, SNAP_VERTEX_MERGE_EPS_MM);
}

/**
 * Унифицированная привязка: приоритет vertex → edge → grid; пороги в px.
 * Без viewport vertex/edge/grid по пикселям не считаются — возвращается raw.
 */
export function resolveSnap2d(input: {
  readonly rawWorldMm: Point2D;
  readonly viewport: ViewportTransform | null;
  readonly project: Project;
  readonly snapSettings: SnapSettings2d;
  readonly gridStepMm: number;
  /** Исключить сваю из кандидатов привязки (перенос/копия этой сваи). */
  readonly excludeFoundationPileId?: string;
  /** Исключить балку из кандидатов привязки (перенос этой балки). */
  readonly excludeFloorBeamId?: string;
}): SnapResult2d {
  const { rawWorldMm, viewport, project, snapSettings, gridStepMm, excludeFoundationPileId, excludeFloorBeamId } =
    input;
  const raw = rawWorldMm;

  if (!viewport) {
    return { point: { x: raw.x, y: raw.y }, kind: "none" };
  }

  const layerIds = layerIdsForSnapGeometry(project);
  const walls = project.walls.filter((w) => layerIds.has(w.layerId));
  const planLines = project.planLines.filter((l) => layerIds.has(l.layerId));

  /** Лучший кандидат в категории: минимальная экранная дистанция. */
  let bestVertex: { readonly point: Point2D; readonly dist: number } | null = null;

  if (snapSettings.snapToVertex) {
    const vertexCandidates = dedupeVerticesMm(
      [
        ...collectWallPlanVertexSnapCandidatesMm(project, layerIds),
        ...collectFoundationPlanVertexSnapCandidatesMm(project, layerIds, excludeFoundationPileId),
        ...collectFloorBeamPlanVertexSnapCandidatesMm(project, layerIds, excludeFloorBeamId),
      ],
      SNAP_VERTEX_MERGE_EPS_MM,
    );
    for (const pt of vertexCandidates) {
      const d = screenDistancePx(raw, pt, viewport);
      if (d <= SNAP_VERTEX_PX && (!bestVertex || d < bestVertex.dist)) {
        bestVertex = { point: { x: pt.x, y: pt.y }, dist: d };
      }
    }
    for (const pl of planLines) {
      for (const pt of [pl.start, pl.end]) {
        const d = screenDistancePx(raw, pt, viewport);
        if (d <= SNAP_VERTEX_PX && (!bestVertex || d < bestVertex.dist)) {
          bestVertex = { point: { x: pt.x, y: pt.y }, dist: d };
        }
      }
    }
    if (bestVertex) {
      return { point: bestVertex.point, kind: "vertex" };
    }
  }

  let bestEdge: {
    readonly point: Point2D;
    readonly dist: number;
    readonly wallId?: string;
    readonly planLineId?: string;
  } | null = null;

  if (snapSettings.snapToEdge) {
    for (const w of walls) {
      const { point: q, t } = closestPointOnSegment(raw, w.start, w.end);
      if (t <= ENDPOINT_EPS || t >= 1 - ENDPOINT_EPS) {
        continue;
      }
      const d = screenDistancePx(raw, q, viewport);
      if (d <= SNAP_EDGE_PX && (!bestEdge || d < bestEdge.dist)) {
        bestEdge = { point: { x: q.x, y: q.y }, dist: d, wallId: w.id };
      }
    }
    for (const pl of planLines) {
      const { point: q, t } = closestPointOnSegment(raw, pl.start, pl.end);
      if (t <= ENDPOINT_EPS || t >= 1 - ENDPOINT_EPS) {
        continue;
      }
      const d = screenDistancePx(raw, q, viewport);
      if (d <= SNAP_EDGE_PX && (!bestEdge || d < bestEdge.dist)) {
        bestEdge = { point: { x: q.x, y: q.y }, dist: d, planLineId: pl.id };
      }
    }
    for (const fs of project.foundationStrips) {
      if (!layerIds.has(fs.layerId)) {
        continue;
      }
      const quads =
        fs.kind === "ortho_ring"
          ? (() => {
              const { outer, inner } = foundationStripOrthoRingFootprintContoursFromEntityMm(fs);
              return [outer, inner] as const;
            })()
          : fs.kind === "footprint_poly"
            ? [fs.outerRingMm, ...fs.holeRingsMm]
            : [
                foundationStripSegmentFootprintQuadMm(
                  fs.axisStart,
                  fs.axisEnd,
                  fs.outwardNormalX,
                  fs.outwardNormalY,
                  fs.sideOutMm,
                  fs.sideInMm,
                ),
              ];
      for (const qd of quads) {
        for (let i = 0; i < qd.length; i++) {
          const a = qd[i]!;
          const b = qd[(i + 1) % qd.length]!;
          const { point: q, t } = closestPointOnSegment(raw, a, b);
          if (t <= ENDPOINT_EPS || t >= 1 - ENDPOINT_EPS) {
            continue;
          }
          const d = screenDistancePx(raw, q, viewport);
          if (d <= SNAP_EDGE_PX && (!bestEdge || d < bestEdge.dist)) {
            bestEdge = { point: { x: q.x, y: q.y }, dist: d };
          }
        }
      }
    }
    for (const pile of project.foundationPiles) {
      if (!layerIds.has(pile.layerId)) {
        continue;
      }
      if (excludeFoundationPileId != null && pile.id === excludeFoundationPileId) {
        continue;
      }
      const h = pile.capSizeMm / 2;
      const c = { x: pile.centerX, y: pile.centerY };
      const quad: Point2D[] = [
        { x: c.x - h, y: c.y - h },
        { x: c.x + h, y: c.y - h },
        { x: c.x + h, y: c.y + h },
        { x: c.x - h, y: c.y + h },
      ];
      for (let i = 0; i < 4; i++) {
        const a = quad[i]!;
        const b = quad[(i + 1) % 4]!;
        const { point: q, t } = closestPointOnSegment(raw, a, b);
        if (t <= ENDPOINT_EPS || t >= 1 - ENDPOINT_EPS) {
          continue;
        }
        const d = screenDistancePx(raw, q, viewport);
        if (d <= SNAP_EDGE_PX && (!bestEdge || d < bestEdge.dist)) {
          bestEdge = { point: { x: q.x, y: q.y }, dist: d };
        }
      }
    }
    for (const beam of project.floorBeams) {
      if (!layerIds.has(beam.layerId)) {
        continue;
      }
      if (excludeFloorBeamId != null && beam.id === excludeFloorBeamId) {
        continue;
      }
      const q = floorBeamPlanQuadCornersMm(project, beam);
      if (!q || q.length < 4) {
        continue;
      }
      for (let i = 0; i < 4; i += 1) {
        const a = q[i]!;
        const b = q[(i + 1) % 4]!;
        const { point: qq, t } = closestPointOnSegment(raw, a, b);
        if (t <= ENDPOINT_EPS || t >= 1 - ENDPOINT_EPS) {
          continue;
        }
        const d = screenDistancePx(raw, qq, viewport);
        if (d <= SNAP_EDGE_PX && (!bestEdge || d < bestEdge.dist)) {
          bestEdge = { point: { x: qq.x, y: qq.y }, dist: d };
        }
      }
    }
    if (bestEdge) {
      return {
        point: bestEdge.point,
        kind: "edge",
        wallId: bestEdge.wallId,
        planLineId: bestEdge.planLineId,
      };
    }
  }

  if (snapSettings.snapToGrid && Number.isFinite(gridStepMm) && gridStepMm > 0) {
    const g = snapWorldToGridAlignedToOrigin(raw, gridStepMm, project.projectOrigin);
    const d = screenDistancePx(raw, g, viewport);
    if (d <= SNAP_GRID_PX) {
      return { point: g, kind: "grid" };
    }
  }

  return { point: { x: raw.x, y: raw.y }, kind: "none" };
}
