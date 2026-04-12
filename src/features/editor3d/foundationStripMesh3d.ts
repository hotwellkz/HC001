import { ExtrudeGeometry, Path, Shape } from "three";

import type { FoundationStripEntity } from "@/core/domain/foundationStrip";
import {
  foundationStripOrthoRingFootprintContoursFromEntityMm,
  foundationStripSegmentFootprintQuadMm,
} from "@/core/domain/foundationStripGeometry";
import { getLayerById } from "@/core/domain/layerOps";
import { computedLayerBaseMm } from "@/core/domain/layerVerticalStack";
import type { Project } from "@/core/domain/project";
import type { Point2D } from "@/core/geometry/types";

import { slabFootprintMaxSpanMm } from "./slabMesh3d";
import { isProjectLayerVisibleIn3d } from "./view3dVisibility";

const MM_TO_M = 0.001;

/**
 * План XY (мм) → ось Shape перед экструзией (м).
 * У меша `rotation.x = -π/2`: локальная (vx, vy, 0) → (vx, 0, -vy) в мировых XZ,
 * то есть world Z = -vy. Как у стен/свай: cz = -planY·MM_TO_M → vy = planY·MM_TO_M (без минуса в Shape).
 */
function planMmToShapeXZ(p: Point2D): { readonly x: number; readonly y: number } {
  return { x: p.x * MM_TO_M, y: p.y * MM_TO_M };
}

function polygonSignedArea(pts: readonly { readonly x: number; readonly y: number }[]): number {
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
  return polygonSignedArea(copy) >= 0 ? copy : copy.reverse();
}

function ensureCW(pts: readonly { readonly x: number; readonly y: number }[]): { x: number; y: number }[] {
  const copy = pts.map((p) => ({ x: p.x, y: p.y }));
  return polygonSignedArea(copy) <= 0 ? copy : copy.reverse();
}

function shapeFromPlanLoopCCW(planLoop: readonly Point2D[]): Shape {
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

function pathFromPlanLoopHole(planLoop: readonly Point2D[]): Path {
  const mapped = planLoop.map(planMmToShapeXZ);
  const cw = ensureCW(mapped);
  const p = new Path();
  p.moveTo(cw[0]!.x, cw[0]!.y);
  for (let i = 1; i < cw.length; i++) {
    p.lineTo(cw[i]!.x, cw[i]!.y);
  }
  p.closePath();
  return p;
}

/**
 * Ленты на слоях, видимых в 3D (как стены: скрытый слой не попадает в сцену).
 */
export function selectFoundationStripsForScene3d(project: Project): readonly FoundationStripEntity[] {
  return project.foundationStrips.filter((fs) => {
    const layer = getLayerById(project, fs.layerId);
    if (layer?.isVisible === false) {
      return false;
    }
    if (!isProjectLayerVisibleIn3d(fs.layerId, project)) {
      return false;
    }
    return true;
  });
}

export interface FoundationStripExtrudeBuilt {
  readonly geometry: ExtrudeGeometry;
  /** Нижняя грань после rotation.x = -π/2 (мировая Y). */
  readonly bottomM: number;
}

/**
 * Экструзия контура ленты вниз на depthMm; верх — уровень слоя (elevationMm), низ — минус глубина.
 */
export function buildFoundationStripExtrudeGeometry(
  entity: FoundationStripEntity,
  project: Project,
): FoundationStripExtrudeBuilt | null {
  const layer = getLayerById(project, entity.layerId);
  if (layer?.isVisible === false) {
    return null;
  }
  const topMm = computedLayerBaseMm(project, entity.layerId);
  const depthMm = entity.depthMm;
  if (!(depthMm > 0)) {
    return null;
  }
  const bottomMm = topMm - depthMm;
  const depthM = depthMm * MM_TO_M;
  const bottomM = bottomMm * MM_TO_M;

  let shape: Shape;
  if (entity.kind === "ortho_ring") {
    const { outer, inner } = foundationStripOrthoRingFootprintContoursFromEntityMm(entity);
    shape = shapeFromPlanLoopCCW(outer);
    shape.holes.push(pathFromPlanLoopHole(inner));
  } else if (entity.kind === "footprint_poly") {
    shape = shapeFromPlanLoopCCW(entity.outerRingMm);
    for (const h of entity.holeRingsMm) {
      shape.holes.push(pathFromPlanLoopHole(h));
    }
  } else {
    const quad = foundationStripSegmentFootprintQuadMm(
      entity.axisStart,
      entity.axisEnd,
      entity.outwardNormalX,
      entity.outwardNormalY,
      entity.sideOutMm,
      entity.sideInMm,
    );
    if (quad.length < 3) {
      return null;
    }
    shape = shapeFromPlanLoopCCW(quad);
  }

  const geometry = new ExtrudeGeometry(shape, { depth: depthM, bevelEnabled: false });
  return { geometry, bottomM };
}

/** Оценка размаха контура ленты в плане (мм) для тайлинга текстуры. */
export function foundationStripFootprintMaxSpanMm(entity: FoundationStripEntity): number {
  if (entity.kind === "ortho_ring") {
    return Math.max(
      Math.abs(entity.axisXmaxMm - entity.axisXminMm),
      Math.abs(entity.axisYmaxMm - entity.axisYminMm),
      100,
    );
  }
  if (entity.kind === "footprint_poly") {
    return slabFootprintMaxSpanMm(entity.outerRingMm);
  }
  const len = Math.hypot(entity.axisEnd.x - entity.axisStart.x, entity.axisEnd.y - entity.axisStart.y);
  return Math.max(len, entity.sideInMm + entity.sideOutMm, 100);
}
