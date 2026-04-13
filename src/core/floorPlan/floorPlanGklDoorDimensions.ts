import { openingCenterOnWallMm } from "@/core/domain/openingPlacement";
import type { Project } from "@/core/domain/project";
import type { Wall } from "@/core/domain/wall";
import { wallLengthMm } from "@/core/domain/wallCalculationGeometry";
import type { Point2D } from "@/core/geometry/types";
import type { ReportPrimitive } from "@/core/reports/types";
import { wallCenterlinePointAtAlongMm } from "@/features/editor2d/doorSwingSymbolMm";

import type { FloorPlanRoomLoop } from "./floorPlanRoomsFromWalls";
import { isGklPartitionWall } from "./floorPlanGklPartitionWall";

const TICK_MM = 10;
const DIM_STROKE_MM = 0.16;
const LABEL_FS_MM = 4.4;
const OFFSET_FROM_WALL_MM = 210;

function labelGapForText(label: string): number {
  return Math.min(36, 4 + label.length * 1.8);
}

function pointInRingMm(p: Point2D, ring: readonly Point2D[]): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i]!.x;
    const yi = ring[i]!.y;
    const xj = ring[j]!.x;
    const yj = ring[j]!.y;
    const inter = (yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (inter) {
      inside = !inside;
    }
  }
  return inside;
}

function roomForPoint(rooms: readonly FloorPlanRoomLoop[], p: Point2D): FloorPlanRoomLoop | null {
  for (const r of rooms) {
    if (pointInRingMm(p, r.ringMm)) {
      return r;
    }
  }
  return null;
}

function alignedDimensionPrimitive(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  ox: number,
  oy: number,
  label: string,
  labelRotationDeg: number,
): ReportPrimitive {
  const gap = labelGapForText(label);
  return {
    kind: "dimensionLine",
    anchor1Xmm: ax1,
    anchor1Ymm: ay1,
    anchor2Xmm: ax2,
    anchor2Ymm: ay2,
    dimLineX1mm: ax1 + ox,
    dimLineY1mm: ay1 + oy,
    dimLineX2mm: ax2 + ox,
    dimLineY2mm: ay2 + oy,
    labelXmm: (ax1 + ax2) / 2 + ox,
    labelYmm: (ay1 + ay2) / 2 + oy,
    label,
    tickMm: TICK_MM,
    centerGapMm: gap,
    strokeMm: DIM_STROKE_MM,
    labelFontSizeMm: LABEL_FS_MM,
    labelRotationDeg,
  };
}

/**
 * Привязка двери к ближайшему углу сегмента перегородки ГКЛ (мм по оси стены).
 */
export function buildGklPartitionDoorPositionDimensions(
  project: Project,
  walls: readonly Wall[],
  rooms: readonly FloorPlanRoomLoop[],
): ReportPrimitive[] {
  if (rooms.length === 0) {
    return [];
  }
  const wallById = new Map(walls.map((w) => [w.id, w] as const));
  const out: ReportPrimitive[] = [];

  for (const o of project.openings) {
    if (o.kind !== "door" || o.wallId == null || o.offsetFromStartMm == null) {
      continue;
    }
    const wall = wallById.get(o.wallId);
    if (!wall) {
      continue;
    }
    if (!isGklPartitionWall(project, wall)) {
      continue;
    }

    const L = wallLengthMm(wall);
    if (L < 1e-6) {
      continue;
    }
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const ux = dx / L;
    const uy = dy / L;
    const nx = -uy;
    const ny = ux;

    const doorCenter = openingCenterOnWallMm(wall, o);
    /** Точка чуть в сторону помещения: центр проёма на оси часто на границе полигона. */
    let roomSide: (typeof rooms)[number] | null = null;
    let nnx = nx;
    let nny = ny;
    for (const sign of [1, -1] as const) {
      const sx = nx * sign;
      const sy = ny * sign;
      const tp = { x: doorCenter.x + sx * 95, y: doorCenter.y + sy * 95 };
      roomSide = roomForPoint(rooms, tp);
      if (roomSide) {
        nnx = sx;
        nny = sy;
        break;
      }
    }
    if (!roomSide) {
      roomSide = roomForPoint(rooms, doorCenter);
    }
    if (!roomSide) {
      continue;
    }

    const ox = nnx * OFFSET_FROM_WALL_MM;
    const oy = nny * OFFSET_FROM_WALL_MM;

    const o0 = o.offsetFromStartMm;
    const w = o.widthMm;
    const fromStart = o0;
    const fromEnd = L - o0 - w;
    const rotDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    if (fromStart <= fromEnd) {
      const pA = wall.start;
      const pB = wallCenterlinePointAtAlongMm(wall, o0);
      if (!pB) {
        continue;
      }
      const label = `${Math.round(fromStart)}`;
      out.push(alignedDimensionPrimitive(pA.x, pA.y, pB.x, pB.y, ox, oy, label, rotDeg));
    } else {
      const pA = wall.end;
      const pB = wallCenterlinePointAtAlongMm(wall, o0 + w);
      if (!pB) {
        continue;
      }
      const label = `${Math.round(fromEnd)}`;
      out.push(alignedDimensionPrimitive(pA.x, pA.y, pB.x, pB.y, ox, oy, label, rotDeg));
    }
  }

  return out;
}
