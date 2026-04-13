import type { ReportPrimDimensionLine, ReportPrimitive } from "../types";

const TICK_MM = 10;
const OUTER_ROW_MM = 520;
const DIM_STROKE_MM = 0.16;
const LABEL_FS_MM = 5.2;
const OFF_H = -38;
const OFF_V = -36;

function labelGapForText(label: string): number {
  return Math.min(44, 6 + label.length * 2.1);
}

function horizontalDimension(
  x1: number,
  yObj: number,
  x2: number,
  dimY: number,
  label: string,
  labelYOffset: number,
): ReportPrimDimensionLine {
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
): ReportPrimDimensionLine {
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
  };
}

export interface WallPlanOutlineBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Общие габариты по контуру объединения стен (внешний bbox). */
export function buildWallPlanOutlineDimensionPrimitives(outline: WallPlanOutlineBounds): readonly ReportPrimitive[] {
  const { minX, minY, maxX, maxY } = outline;
  const w = Math.round(maxX - minX);
  const h = Math.round(maxY - minY);
  const yOuter = minY - OUTER_ROW_MM;
  const xOuter = minX - OUTER_ROW_MM;
  return [
    horizontalDimension(minX, minY, maxX, yOuter, `${w}`, OFF_H),
    verticalDimension(minX, minY, maxY, xOuter, `${h}`, OFF_V),
  ];
}
