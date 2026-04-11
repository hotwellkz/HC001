import { ExtrudeGeometry, Shape } from "three";

import { getLayerById } from "@/core/domain/layerOps";
import type { Project } from "@/core/domain/project";
import type { SlabEntity } from "@/core/domain/slab";
import type { Point2D } from "@/core/geometry/types";

const MM_TO_M = 0.001;

function planMmToShapeXZ(p: Point2D): { readonly x: number; readonly y: number } {
  return { x: p.x * MM_TO_M, y: p.y * MM_TO_M };
}

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
  const mapped = planLoop.map(planMmToShapeXZ);
  const ccw = ensureCCW(mapped);
  const s = new Shape();
  s.moveTo(ccw[0]!.x, ccw[0]!.y);
  for (let i = 1; i < ccw.length; i++) {
    s.lineTo(ccw[i]!.x, ccw[i]!.y);
  }
  s.closePath();
  return s;
}

export interface SlabExtrudeBuilt {
  readonly geometry: ExtrudeGeometry;
  /** Нижняя грань после rotation.x = -π/2 (мировая Y), м. */
  readonly bottomM: number;
}

/**
 * Верх плиты — levelMm от нуля проекта; низ — levelMm − depthMm.
 * Совпадает с логикой ленты: ExtrudeGeometry вниз, меш поднят так, что «верх» shape на levelMm.
 */
export function buildSlabExtrudeGeometry(entity: SlabEntity, _project: Project): SlabExtrudeBuilt | null {
  const layer = getLayerById(_project, entity.layerId);
  if (layer?.isVisible === false) {
    return null;
  }
  const depthMm = entity.depthMm;
  if (!(depthMm > 0)) {
    return null;
  }
  const topMm = entity.levelMm;
  const bottomMm = topMm - depthMm;
  const depthM = depthMm * MM_TO_M;
  const bottomM = bottomMm * MM_TO_M;

  const sh = shapeFromPlanLoopCCW(entity.pointsMm);
  if (!sh) {
    return null;
  }
  const geometry = new ExtrudeGeometry(sh, { depth: depthM, bevelEnabled: false });
  return { geometry, bottomM };
}

export function selectSlabsForScene3d(project: Project): readonly SlabEntity[] {
  return project.slabs.filter((sl) => {
    const layer = getLayerById(project, sl.layerId);
    if (layer?.isVisible === false) {
      return false;
    }
    return true;
  });
}

/** Максимальный размах контура плиты по осям XY (мм) — для тайлинга текстуры сверху. */
export function slabFootprintMaxSpanMm(pointsMm: readonly Point2D[]): number {
  if (pointsMm.length === 0) {
    return 1000;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pointsMm) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return Math.max(maxX - minX, maxY - minY, 100);
}
