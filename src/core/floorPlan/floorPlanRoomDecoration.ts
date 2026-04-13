import type { ReportPrimitive } from "@/core/reports/types";

import type { FloorPlanRoomLoop } from "./floorPlanRoomsFromWalls";
import type { Point2D } from "@/core/geometry/types";

const TICK_MM = 10;
const DIM_STROKE_MM = 0.16;
const LABEL_FS_MM = 4.85;

function labelGapForText(label: string): number {
  return Math.min(40, 5 + label.length * 2);
}

function horizontalDimension(
  x1: number,
  yObj: number,
  x2: number,
  dimY: number,
  label: string,
  labelYOffset: number,
): ReportPrimitive {
  const gap = labelGapForText(label);
  return {
    kind: "dimensionLine",
    anchor1Xmm: x1,
    anchor1Ymm: yObj,
    anchor2Xmm: x2,
    anchor2Ymm: yObj,
    dimLineX1mm: x1,
    dimLineY1mm: dimY,
    dimLineX2mm: x2,
    dimLineY2mm: dimY,
    labelXmm: (x1 + x2) / 2,
    labelYmm: dimY + labelYOffset,
    label,
    tickMm: TICK_MM,
    centerGapMm: gap,
    strokeMm: DIM_STROKE_MM,
    labelFontSizeMm: LABEL_FS_MM,
  };
}

function verticalDimension(
  xObj: number,
  y1: number,
  y2: number,
  dimX: number,
  label: string,
  labelXOffset: number,
): ReportPrimitive {
  const gap = labelGapForText(label);
  return {
    kind: "dimensionLine",
    anchor1Xmm: xObj,
    anchor1Ymm: y1,
    anchor2Xmm: xObj,
    anchor2Ymm: y2,
    dimLineX1mm: dimX,
    dimLineY1mm: y1,
    dimLineX2mm: dimX,
    dimLineY2mm: y2,
    labelXmm: dimX + labelXOffset,
    labelYmm: (y1 + y2) / 2,
    label,
    tickMm: TICK_MM,
    centerGapMm: gap,
    strokeMm: DIM_STROKE_MM,
    labelFontSizeMm: LABEL_FS_MM,
    labelRotationDeg: -90,
  };
}

function hslToRgba(h: number, s: number, l: number, a: number): string {
  const ss = s / 100;
  const ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  const r = Math.round((rp + m) * 255);
  const g = Math.round((gp + m) * 255);
  const b = Math.round((bp + m) * 255);
  return `rgba(${r},${g},${b},${a})`;
}

function ringsAdjacent(a: readonly { x: number; y: number }[], b: readonly { x: number; y: number }[], tolMm: number): boolean {
  const t2 = tolMm * tolMm;
  for (const pa of a) {
    for (const pb of b) {
      const dx = pa.x - pb.x;
      const dy = pa.y - pb.y;
      if (dx * dx + dy * dy < t2) {
        return true;
      }
    }
  }
  return false;
}

function distPointToSegmentSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) {
    const dx = px - bx;
    const dy = py - by;
    return dx * dx + dy * dy;
  }
  const t = c1 / c2;
  const projx = ax + t * vx;
  const projy = ay + t * vy;
  const dx = px - projx;
  const dy = py - projy;
  return dx * dx + dy * dy;
}

function minDistPointToRingMm(p: Point2D, ring: readonly Point2D[]): number {
  let m = Infinity;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    m = Math.min(m, Math.sqrt(distPointToSegmentSq(p.x, p.y, a.x, a.y, b.x, b.y)));
  }
  return m;
}

/** Точка подписи внутри контура: отступ от границы, без наложения на стены. */
function safeRoomLabelPointMm(r: FloorPlanRoomLoop): Point2D {
  const { bbox, ringMm, centroid: c0 } = r;
  const cxBox = (bbox.minX + bbox.maxX) / 2;
  const cyBox = (bbox.minY + bbox.maxY) / 2;
  const spanX = bbox.maxX - bbox.minX;
  const spanY = bbox.maxY - bbox.minY;
  const minClear = Math.max(160, Math.min(spanX, spanY) * 0.055);
  let p = { x: c0.x, y: c0.y };
  for (let k = 0; k < 18; k++) {
    if (minDistPointToRingMm(p, ringMm) >= minClear) {
      return p;
    }
    p = {
      x: 0.7 * p.x + 0.3 * cxBox,
      y: 0.7 * p.y + 0.3 * cyBox,
    };
  }
  return { x: cxBox, y: cyBox };
}

function assignPastelFills(rooms: readonly FloorPlanRoomLoop[]): readonly string[] {
  const n = rooms.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (ringsAdjacent(rooms[i]!.ringMm, rooms[j]!.ringMm, 180)) {
        adj[i]!.push(j);
        adj[j]!.push(i);
      }
    }
  }
  const colorIdx: number[] = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const taken = new Set<number>();
    for (const j of adj[i]!) {
      if (colorIdx[j]! >= 0) {
        taken.add(colorIdx[j]!);
      }
    }
    let c = 0;
    while (taken.has(c)) {
      c++;
    }
    colorIdx[i] = c;
  }
  return colorIdx.map((ci) => hslToRgba((ci * 47 + 19) % 360, 38, 91, 0.38));
}

export interface FloorPlanRoomDecorLayers {
  /** Под стенами: пастельные заливки. */
  readonly fills: readonly ReportPrimitive[];
  /** Над планом: площади помещений, внутренние размеры. */
  readonly abovePlan: readonly ReportPrimitive[];
}

/**
 * Заливки помещений; подпись площади и два внутренних размера по bbox контура (без нумерации комнат).
 */
export function buildFloorPlanRoomDecorLayers(rooms: readonly FloorPlanRoomLoop[]): FloorPlanRoomDecorLayers {
  if (rooms.length === 0) {
    return { fills: [], abovePlan: [] };
  }
  const fillColors = assignPastelFills(rooms);
  const fills: ReportPrimitive[] = [];
  const dims: ReportPrimitive[] = [];
  const labels: ReportPrimitive[] = [];

  for (let ri = 0; ri < rooms.length; ri++) {
    const r = rooms[ri]!;
    const fill = fillColors[ri] ?? hslToRgba(210, 40, 92, 0.35);
    fills.push({
      kind: "polyline",
      pointsMm: [...r.ringMm],
      closed: true,
      strokeMm: 0,
      fill,
    });

    const areaM2 = r.areaMm2 / 1_000_000;
    const areaStr = areaM2 >= 10 ? areaM2.toFixed(1) : areaM2.toFixed(2);
    const lp = safeRoomLabelPointMm(r);
    const { minX, minY, maxX, maxY } = r.bbox;
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const sm = Math.min(spanX, spanY);
    const fsArea = sm < 2400 ? 3.35 : sm < 4000 ? 4.0 : 4.65;

    labels.push({
      kind: "text",
      xMm: lp.x,
      yMm: lp.y,
      text: `${areaStr} м²`,
      fontSizeMm: fsArea,
      anchor: "middle",
    });

    const inset = Math.min(380, Math.min(spanX, spanY) * 0.11) + (ri % 3) * 55;
    const wMm = Math.round(spanX);
    const hMm = Math.round(spanY);

    const yHorizObj = minY + inset * 0.45;
    const yDimLine = minY + inset;
    dims.push(horizontalDimension(minX, yHorizObj, maxX, yDimLine, `${wMm}`, -22));

    const xVertObj = minX + inset * 0.42;
    const xDimLine = minX + inset;
    dims.push(verticalDimension(xVertObj, minY, maxY, xDimLine, `${hMm}`, -26));
  }

  /** Сначала размеры, затем подписи — текст поверх линий. */
  return { fills, abovePlan: [...dims, ...labels] };
}
