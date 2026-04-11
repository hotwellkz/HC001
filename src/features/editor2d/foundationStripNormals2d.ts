import { layerIdsForSnapGeometry, closestPointOnSegment, type SnapKind } from "@/core/geometry/snap2d";
import type { Point2D } from "@/core/geometry/types";
import type { Project } from "@/core/domain/project";
import type { Wall } from "@/core/domain/wall";
import {
  centroidOfWallMidpoints,
  exteriorNormalForWallLabelMm,
  outwardNormalTowardWallFromCenterMm,
} from "@/features/editor2d/wallLabelExteriorNormalMm";

const PARALLEL_DOT_TOL = 0.985;

function wallsForStripReference(project: Project): Wall[] {
  const layerIds = layerIdsForSnapGeometry(project);
  return project.walls.filter((w) => layerIds.has(w.layerId));
}

/** Какая стена задаёт ориентацию ленты по результату snap (ребро или ближайший конец к вершине). */
export function referenceWallIdFromSnapForFoundationStrip(
  project: Project,
  snap: { readonly kind: SnapKind; readonly point: Point2D; readonly wallId?: string },
): string | undefined {
  if (snap.kind === "edge" && snap.wallId) {
    return snap.wallId;
  }
  if (snap.kind !== "vertex") {
    return undefined;
  }
  const layerIds = layerIdsForSnapGeometry(project);
  const walls = project.walls.filter((w) => layerIds.has(w.layerId));
  const eps = 2;
  const p = snap.point;
  for (const w of walls) {
    if (Math.hypot(p.x - w.start.x, p.y - w.start.y) <= eps) {
      return w.id;
    }
    if (Math.hypot(p.x - w.end.x, p.y - w.end.y) <= eps) {
      return w.id;
    }
  }
  return undefined;
}

function distancePointToSegmentSq(p: Point2D, a: Point2D, b: Point2D): number {
  const { point: q } = closestPointOnSegment(p, a, b);
  const dx = p.x - q.x;
  const dy = p.y - q.y;
  return dx * dx + dy * dy;
}

/**
 * Нормаль «наружу» перпендикулярно оси ленты: по ближайшей параллельной стене (видимый/активный слой)
 * или по центроиду контура — как подписи стен.
 */
export function pickOutwardNormalForStripAxisMm(
  project: Project,
  axisStart: Point2D,
  axisEnd: Point2D,
  hintedWallId?: string,
): { nx: number; ny: number } {
  const dx = axisEnd.x - axisStart.x;
  const dy = axisEnd.y - axisStart.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return { nx: 0, ny: 1 };
  }
  const ux = dx / len;
  const uy = dy / len;
  const n1 = { nx: -uy, ny: ux };
  const n2 = { nx: uy, ny: -ux };

  const walls = wallsForStripReference(project);
  const mid = { x: (axisStart.x + axisEnd.x) / 2, y: (axisStart.y + axisEnd.y) / 2 };

  let refWall: Wall | null = null;
  if (hintedWallId) {
    refWall = walls.find((w) => w.id === hintedWallId) ?? null;
  }
  if (!refWall) {
    let best: { w: Wall; d: number } | null = null;
    for (const w of walls) {
      const wx = w.end.x - w.start.x;
      const wy = w.end.y - w.start.y;
      const wl = Math.hypot(wx, wy);
      if (wl < 1e-9) {
        continue;
      }
      const wux = wx / wl;
      const wuy = wy / wl;
      const parallel = Math.abs(ux * wux + uy * wuy);
      if (parallel < PARALLEL_DOT_TOL) {
        continue;
      }
      const d = distancePointToSegmentSq(mid, w.start, w.end);
      if (!best || d < best.d) {
        best = { w, d };
      }
    }
    refWall = best?.w ?? null;
  }

  if (refWall) {
    const ext = exteriorNormalForWallLabelMm(refWall, walls, walls);
    const d1 = ext.nx * n1.nx + ext.ny * n1.ny;
    const d2 = ext.nx * n2.nx + ext.ny * n2.ny;
    return d1 >= d2 ? n1 : n2;
  }

  const center = centroidOfWallMidpoints(walls.length > 0 ? walls : []);
  const pseudo: Wall = {
    id: "_axis",
    layerId: "",
    start: axisStart,
    end: axisEnd,
    thicknessMm: 1,
    heightMm: 1,
  };
  return outwardNormalTowardWallFromCenterMm(pseudo, center);
}
