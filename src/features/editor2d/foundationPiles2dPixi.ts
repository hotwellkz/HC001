import { Graphics } from "pixi.js";

import type { FoundationPileEntity } from "@/core/domain/foundationPile";

import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

import type { Draw2dLayerAppearance } from "./walls2dPixi";

const PILE_FILL_OUTER = 0x8a9098;
const PILE_STROKE_OUTER = 0x5a5f66;
const PILE_FILL_INNER = 0xa8aeb6;
const PILE_STROKE_INNER = 0x6a7078;
const PILE_SELECTED_STROKE = 0xc9a227;
const PILE_GHOST_ALPHA = 0.38;
const PILE_MARKER_FILL = 0xffffff;
const PILE_MARKER_STROKE = 0x6a7078;
const PILE_CONTEXT_ALPHA = 0.55;

export interface DrawFoundationPiles2dOptions {
  readonly appearance?: Draw2dLayerAppearance | "ghost";
  /** Маркеры центра и углов для выделенных свай (мм → пиксели через zoom). */
  readonly anchorMarkersZoomPxPerMm?: number;
  readonly clear?: boolean;
}

function squareCornersMm(cx: number, cy: number, sizeMm: number): { x: number; y: number }[] {
  const h = sizeMm / 2;
  return [
    { x: cx - h, y: cy - h },
    { x: cx + h, y: cy - h },
    { x: cx + h, y: cy + h },
    { x: cx - h, y: cy + h },
  ];
}

function drawAnchorMarkersMm(
  g: Graphics,
  cx: number,
  cy: number,
  halfMm: number,
  t: ViewportTransform,
  zoomPxPerMm: number,
): void {
  const rPx = Math.max(2.2, Math.min(4.2, 3.4 * Math.sqrt(Math.max(0.02, zoomPxPerMm / 0.08))));
  const pts: { x: number; y: number }[] = [
    { x: cx, y: cy },
    { x: cx - halfMm, y: cy - halfMm },
    { x: cx + halfMm, y: cy - halfMm },
    { x: cx + halfMm, y: cy + halfMm },
    { x: cx - halfMm, y: cy + halfMm },
  ];
  for (const p of pts) {
    const s = worldToScreen(p.x, p.y, t);
    g.circle(s.x, s.y, rPx);
    g.fill({ color: PILE_MARKER_FILL, alpha: 0.92 });
    g.stroke({ width: 1, color: PILE_MARKER_STROKE, alpha: 0.85 });
  }
}


function drawSquareMm(
  g: Graphics,
  corners: readonly { x: number; y: number }[],
  t: ViewportTransform,
  fill: number,
  stroke: number,
  fillAlpha: number,
  strokeWidth: number,
): void {
  if (corners.length < 3) {
    return;
  }
  const p0 = worldToScreen(corners[0]!.x, corners[0]!.y, t);
  g.moveTo(p0.x, p0.y);
  for (let i = 1; i < corners.length; i++) {
    const pi = worldToScreen(corners[i]!.x, corners[i]!.y, t);
    g.lineTo(pi.x, pi.y);
  }
  g.closePath();
  g.fill({ color: fill, alpha: fillAlpha });
  g.stroke({ width: strokeWidth, color: stroke, alpha: Math.min(1, fillAlpha + 0.2) });
}

export function drawFoundationPiles2d(
  g: Graphics,
  piles: readonly FoundationPileEntity[],
  t: ViewportTransform,
  selected: ReadonlySet<string>,
  opts?: DrawFoundationPiles2dOptions,
): void {
  const appearance = opts?.appearance ?? "active";
  const clear = opts?.clear !== false;
  if (clear) {
    g.clear();
  }
  const baseAlpha =
    appearance === "context" ? PILE_CONTEXT_ALPHA : appearance === "ghost" ? PILE_GHOST_ALPHA : 0.9;
  const markerZoom = opts?.anchorMarkersZoomPxPerMm;

  for (const p of piles) {
    const sel = selected.has(p.id);
    const alpha = appearance === "ghost" ? baseAlpha : sel ? Math.min(1, baseAlpha + 0.04) : baseAlpha;
    const strokeW = appearance === "ghost" ? 1 : sel ? 1.35 : 1;
    const outer = squareCornersMm(p.centerX, p.centerY, p.capSizeMm);
    const same = Math.abs(p.capSizeMm - p.sizeMm) < 0.5;
    const strokeCol = sel && appearance !== "ghost" ? PILE_SELECTED_STROKE : PILE_STROKE_OUTER;
    const strokeInnerCol = sel && appearance !== "ghost" ? PILE_SELECTED_STROKE : PILE_STROKE_INNER;
    if (same) {
      drawSquareMm(g, outer, t, PILE_FILL_OUTER, strokeCol, alpha, strokeW);
    } else {
      drawSquareMm(g, outer, t, PILE_FILL_OUTER, strokeCol, alpha * 0.92, strokeW);
      const inner = squareCornersMm(p.centerX, p.centerY, p.sizeMm);
      drawSquareMm(g, inner, t, PILE_FILL_INNER, strokeInnerCol, alpha, Math.min(strokeW, 1.2));
    }
    if (sel && appearance !== "ghost" && markerZoom != null && markerZoom > 0) {
      const half = Math.max(p.capSizeMm, p.sizeMm) / 2;
      drawAnchorMarkersMm(g, p.centerX, p.centerY, half, t, markerZoom);
    }
  }
}
