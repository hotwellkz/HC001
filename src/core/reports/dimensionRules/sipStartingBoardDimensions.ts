import type { ReportPrimDimensionLine, ReportPrimitive } from "../types";

const TICK_MM = 10;
const DIM_STROKE_MM = 0.14;
const LABEL_FS_MM = 5.35;
/** Базовый отступ размерной линии от оси сегмента (мм, мир). */
const BASE_OFFSET_MM = 210;
/** Шаг между параллельными рядами размеров вдоль одной стены. */
const ROW_STEP_MM = 112;
/** Смещение подписи от линии размера (вдоль внешней нормали к размерной линии). */
const LABEL_ALONG_NORMAL_MM = -16;

function labelGapForText(label: string): number {
  return Math.min(44, 6 + label.length * 2.05);
}

/**
 * Размер вдоль отрезка (мир, мм): линия размера параллельна [A,B], выносные перпендикулярны.
 */
export function parallelSegmentDimension(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  offsetMm: number,
  label: string,
): ReportPrimDimensionLine {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return {
      kind: "dimensionLine",
      anchor1Xmm: ax,
      anchor1Ymm: ay,
      anchor2Xmm: bx,
      anchor2Ymm: by,
      dimLineX1mm: ax,
      dimLineY1mm: ay,
      dimLineX2mm: bx,
      dimLineY2mm: by,
      labelXmm: ax,
      labelYmm: ay,
      label,
      tickMm: TICK_MM,
      strokeMm: DIM_STROKE_MM,
      labelFontSizeMm: LABEL_FS_MM,
    };
  }
  const ux = dx / len;
  const uy = dy / len;
  /** Левая нормаль к направлению стены — для смещения размерной линии. */
  const nx = -uy;
  const ny = ux;
  const d1x = ax + nx * offsetMm;
  const d1y = ay + ny * offsetMm;
  const d2x = bx + nx * offsetMm;
  const d2y = by + ny * offsetMm;
  const mxl = (d1x + d2x) / 2;
  const myl = (d1y + d2y) / 2;
  const labelX = mxl + nx * LABEL_ALONG_NORMAL_MM;
  const labelY = myl + ny * LABEL_ALONG_NORMAL_MM;
  return {
    kind: "dimensionLine",
    anchor1Xmm: ax,
    anchor1Ymm: ay,
    anchor2Xmm: bx,
    anchor2Ymm: by,
    dimLineX1mm: d1x,
    dimLineY1mm: d1y,
    dimLineX2mm: d2x,
    dimLineY2mm: d2y,
    labelXmm: labelX,
    labelYmm: labelY,
    label,
    tickMm: TICK_MM,
    centerGapMm: labelGapForText(label),
    strokeMm: DIM_STROKE_MM,
    labelFontSizeMm: LABEL_FS_MM,
  };
}

export interface StartingBoardSegmentEnd {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly wallId: string;
  readonly lengthMm: number;
}

/**
 * Габарит по контуру всех стартовых досок + размеры сегментов и зазоров вдоль оси стены.
 */
export function buildStartingBoardPlanDimensionPrimitives(
  outline: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number },
  segmentEnds: readonly StartingBoardSegmentEnd[],
  gapEnds: readonly (StartingBoardSegmentEnd & { readonly gapMm: number })[],
): readonly ReportPrimitive[] {
  const { minX, minY, maxX, maxY } = outline;
  const w = Math.round(maxX - minX);
  const h = Math.round(maxY - minY);
  const OUTER_ROW = 500;
  const yOuter = minY - OUTER_ROW;
  const xOuter = minX - OUTER_ROW;
  const outlineDims: ReportPrimitive[] = [
    {
      kind: "dimensionLine",
      anchor1Xmm: minX,
      anchor1Ymm: minY,
      anchor2Xmm: maxX,
      anchor2Ymm: minY,
      dimLineX1mm: minX,
      dimLineY1mm: yOuter,
      dimLineX2mm: maxX,
      dimLineY2mm: yOuter,
      labelXmm: (minX + maxX) / 2,
      labelYmm: yOuter - 38,
      label: `${w}`,
      tickMm: TICK_MM,
      centerGapMm: labelGapForText(`${w}`),
      strokeMm: DIM_STROKE_MM,
      labelFontSizeMm: LABEL_FS_MM,
    },
    {
      kind: "dimensionLine",
      anchor1Xmm: minX,
      anchor1Ymm: minY,
      anchor2Xmm: minX,
      anchor2Ymm: maxY,
      dimLineX1mm: xOuter,
      dimLineY1mm: minY,
      dimLineX2mm: xOuter,
      dimLineY2mm: maxY,
      labelXmm: xOuter - 36,
      labelYmm: (minY + maxY) / 2,
      label: `${h}`,
      tickMm: TICK_MM,
      centerGapMm: labelGapForText(`${h}`),
      strokeMm: DIM_STROKE_MM,
      labelFontSizeMm: LABEL_FS_MM,
    },
  ];

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const rowByWall = new Map<string, number>();

  const segDims: ReportPrimitive[] = [];
  for (const s of segmentEnds) {
    const mx = (s.ax + s.bx) / 2;
    const my = (s.ay + s.by) / 2;
    const vx = mx - cx;
    const vy = my - cy;
    const dx = s.bx - s.ax;
    const dy = s.by - s.ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      continue;
    }
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const dot = vx * nx + vy * ny;
    const side = dot >= 0 ? 1 : -1;
    const row = rowByWall.get(s.wallId) ?? 0;
    rowByWall.set(s.wallId, row + 1);
    const offset = side * (BASE_OFFSET_MM + row * ROW_STEP_MM);
    segDims.push(parallelSegmentDimension(s.ax, s.ay, s.bx, s.by, offset, `${Math.round(s.lengthMm)}`));
  }

  const gapDims: ReportPrimitive[] = [];
  for (const g of gapEnds) {
    const mx = (g.ax + g.bx) / 2;
    const my = (g.ay + g.by) / 2;
    const vx = mx - cx;
    const vy = my - cy;
    const dx = g.bx - g.ax;
    const dy = g.by - g.ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      continue;
    }
    const nx = -dy / len;
    const ny = dx / len;
    const dot = vx * nx + vy * ny;
    const side = dot >= 0 ? 1 : -1;
    const row = rowByWall.get(g.wallId) ?? 0;
    rowByWall.set(g.wallId, row + 1);
    const offset = side * (BASE_OFFSET_MM + row * ROW_STEP_MM);
    gapDims.push(parallelSegmentDimension(g.ax, g.ay, g.bx, g.by, offset, `${Math.round(g.gapMm)}`));
  }

  return [...outlineDims, ...segDims, ...gapDims];
}
