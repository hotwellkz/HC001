import {
  DIMENSION_FONT_SIZE_WALL_DETAIL_VERTICAL_OPENING_PX,
  DIMENSION_TICK_HALF_PX,
  measureDimensionLabelTextWidthPx,
} from "@/shared/dimensionStyle";

/** Внутренний отступ оси от линии контура проёма (мм). */
export const WALL_DETAIL_OPENING_V_DIM_INSET_MM = 10;

/** Зазор от вертикали стыка OSB внутри проёма (мм). */
const SEAM_CLEAR_MM = 8;

/** Полуразмер подписи панели (П3, П5…) в мм листа — консервативно. */
const PANEL_LABEL_HALF_W_MM = 30;
const PANEL_LABEL_HALF_H_MM = 14;

/** Вынести наружу только если внутри не нашли место (мм за правым краем). */
const OUTSIDE_FALLBACK_OFFSET_MM = 22;

const STEP_MM = 7;

export type VerticalDimLabelSide = "left" | "right";

export interface OpeningInsideVdimSegmentInput {
  readonly y0Mm: number;
  readonly y1Mm: number;
  readonly text: string;
}

/** Прямоугольник в координатах листа (y вниз), мм. */
export interface SheetRectMm {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

export interface OpeningInsideVdimLayoutInput {
  readonly openingId: string;
  readonly x0: number;
  readonly x1: number;
  readonly segments: readonly OpeningInsideVdimSegmentInput[];
}

export interface InsideOpeningVerticalDimPlacementMm {
  readonly xLineMm: number;
  readonly labelSide: VerticalDimLabelSide;
  /** true — ось ушла за правый край проёма (крайний случай). */
  readonly isOutsideOpening: boolean;
}

function spanY(y0: number, y1: number): { y0: number; y1: number } {
  return { y0: Math.min(y0, y1), y1: Math.max(y0, y1) };
}

function rectsOverlap2d(a: SheetRectMm, b: SheetRectMm, eps = 0.5): boolean {
  const x0 = Math.max(a.x0, b.x0);
  const x1 = Math.min(a.x1, b.x1);
  const y0 = Math.max(a.y0, b.y0);
  const y1 = Math.min(a.y1, b.y1);
  return x1 - x0 > eps && y1 - y0 > eps;
}

function labelStripXMm(
  xLineMm: number,
  labelSide: VerticalDimLabelSide,
  text: string,
  zoom: number,
  labelGapPx: number,
  fontPx: number,
): { x0: number; x1: number } {
  const z = Math.max(zoom, 1e-6);
  const tw = measureDimensionLabelTextWidthPx(text, fontPx) / z;
  const gap = (DIMENSION_TICK_HALF_PX + labelGapPx) / z;
  const fat = (fontPx * 0.65) / z;
  const pad = 3 / z;
  if (labelSide === "left") {
    return { x0: xLineMm - gap - tw - fat - pad, x1: xLineMm + 4 / z };
  }
  return { x0: xLineMm - 4 / z, x1: xLineMm + gap + tw + fat + pad };
}

function verticalBandHitsLumber(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  lumber: readonly SheetRectMm[],
): boolean {
  const band: SheetRectMm = { x0, x1, y0, y1 };
  for (const r of lumber) {
    if (rectsOverlap2d(band, r)) {
      return true;
    }
  }
  return false;
}

function hitsSeam(x: number, seamXs: readonly number[], openingX0: number, openingX1: number): boolean {
  const lo = Math.min(openingX0, openingX1);
  const hi = Math.max(openingX0, openingX1);
  for (const cx of seamXs) {
    if (cx <= lo || cx >= hi) {
      continue;
    }
    if (Math.abs(x - cx) < SEAM_CLEAR_MM) {
      return true;
    }
  }
  return false;
}

function hitsPanelLabel(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  labels: readonly SheetRectMm[],
): boolean {
  const band: SheetRectMm = { x0, x1, y0, y1 };
  for (const r of labels) {
    if (rectsOverlap2d(band, r)) {
      return true;
    }
  }
  return false;
}

function candidateOk(
  x: number,
  x0: number,
  x1: number,
  segments: readonly OpeningInsideVdimSegmentInput[],
  labelSide: VerticalDimLabelSide,
  lumber: readonly SheetRectMm[],
  panelLabels: readonly SheetRectMm[],
  seamXs: readonly number[],
  zoom: number,
  labelGapPx: number,
  fontPx: number,
  lineHalfMm: number,
): boolean {
  if (hitsSeam(x, seamXs, x0, x1)) {
    return false;
  }
  for (const seg of segments) {
    const { y0, y1 } = spanY(seg.y0Mm, seg.y1Mm);
    if (verticalBandHitsLumber(x - lineHalfMm, x + lineHalfMm, y0, y1, lumber)) {
      return false;
    }
    const strip = labelStripXMm(x, labelSide, seg.text, zoom, labelGapPx, fontPx);
    if (verticalBandHitsLumber(strip.x0, strip.x1, y0, y1, lumber)) {
      return false;
    }
    if (hitsPanelLabel(strip.x0, strip.x1, y0, y1, panelLabels)) {
      return false;
    }
  }
  return true;
}

function buildInteriorCandidates(x0: number, x1: number): number[] {
  const w = x1 - x0;
  const inset = w < 140 ? Math.min(WALL_DETAIL_OPENING_V_DIM_INSET_MM, w * 0.12) : WALL_DETAIL_OPENING_V_DIM_INSET_MM;
  const minX = x0 + inset;
  const maxX = x1 - inset;
  if (maxX - minX < 4) {
    return [(x0 + x1) / 2];
  }
  const out: number[] = [];
  for (let xr = x1 - inset; xr >= minX; xr -= STEP_MM) {
    out.push(xr);
  }
  for (let xl = x0 + inset; xl <= maxX; xl += STEP_MM) {
    out.push(xl);
  }
  out.push((x0 + x1) / 2);
  const seen = new Set<number>();
  return out.filter((v) => {
    const k = Math.round(v * 10) / 10;
    if (seen.has(k)) {
      return false;
    }
    seen.add(k);
    return true;
  });
}

/**
 * Ось вертикальных размеров проёма — внутри светового проёма у края, подпись почти вплотную к линии;
 * учёт каркаса, подписей панелей и стыков; наружу — только если внутри нет варианта.
 */
export function computeInsideOpeningVerticalDimPlacementMm(
  input: OpeningInsideVdimLayoutInput,
  lumberRectsSheet: readonly SheetRectMm[],
  panelLabelRectsSheet: readonly SheetRectMm[],
  verticalSeamXsInOpening: readonly number[],
  zoom: number,
  labelGapPx: number,
  fontPx: number = DIMENSION_FONT_SIZE_WALL_DETAIL_VERTICAL_OPENING_PX,
): InsideOpeningVerticalDimPlacementMm {
  const { x0, x1, segments } = input;
  if (segments.length === 0) {
    return {
      xLineMm: (x0 + x1) / 2,
      labelSide: "left",
      isOutsideOpening: false,
    };
  }

  const z = Math.max(zoom, 1e-6);
  const lineHalfMm = Math.max(2, 2 / z);

  for (const x of buildInteriorCandidates(x0, x1)) {
    const labelSide: VerticalDimLabelSide = x >= (x0 + x1) / 2 ? "left" : "right";
    if (candidateOk(x, x0, x1, segments, labelSide, lumberRectsSheet, panelLabelRectsSheet, verticalSeamXsInOpening, zoom, labelGapPx, fontPx, lineHalfMm)) {
      return { xLineMm: x, labelSide, isOutsideOpening: false };
    }
  }

  const xOut = x1 + OUTSIDE_FALLBACK_OFFSET_MM;
  const labelSide: VerticalDimLabelSide = "left";
  if (
    candidateOk(xOut, x0, x1, segments, labelSide, lumberRectsSheet, panelLabelRectsSheet, verticalSeamXsInOpening, zoom, labelGapPx, fontPx, lineHalfMm)
  ) {
    return { xLineMm: xOut, labelSide, isOutsideOpening: true };
  }

  return { xLineMm: xOut, labelSide, isOutsideOpening: true };
}

/** Прямоугольники деталей каркаса на листе (как в `WallDetailWorkspace`). */
export function lumberElevationRectsSheetMm(
  pieces: readonly { x0: number; x1: number; b0: number; b1: number }[],
  wallTopMm: number,
  wallHeightMm: number,
): SheetRectMm[] {
  const H = wallHeightMm;
  const out: SheetRectMm[] = [];
  for (const p of pieces) {
    const y0 = wallTopMm + H - p.b1;
    const y1 = wallTopMm + H - p.b0;
    out.push({
      x0: Math.min(p.x0, p.x1),
      x1: Math.max(p.x0, p.x1),
      y0: Math.min(y0, y1),
      y1: Math.max(y0, y1),
    });
  }
  return out;
}

/** Оценочные bbox подписей панелей (П3, П5…) по центру полосы SIP. */
export function sipPanelMarkRectsSheetMm(
  slices: readonly {
    drawX0: number;
    drawX1: number;
    drawY0: number;
    drawY1: number;
  }[],
): SheetRectMm[] {
  const out: SheetRectMm[] = [];
  for (const sl of slices) {
    const cx = (sl.drawX0 + sl.drawX1) / 2;
    const cy = (sl.drawY0 + sl.drawY1) / 2;
    out.push({
      x0: cx - PANEL_LABEL_HALF_W_MM,
      x1: cx + PANEL_LABEL_HALF_W_MM,
      y0: cy - PANEL_LABEL_HALF_H_MM,
      y1: cy + PANEL_LABEL_HALF_H_MM,
    });
  }
  return out;
}

/** Вертикали стыков, пересекающие интервал проёма по X (для анти-наложения оси). */
export function seamCentersInOpeningSpanMm(seamXs: readonly number[], openingX0: number, openingX1: number): number[] {
  const lo = Math.min(openingX0, openingX1);
  const hi = Math.max(openingX0, openingX1);
  return seamXs.filter((cx) => cx > lo + 2 && cx < hi - 2);
}
