import { Graphics } from "pixi.js";

import type { FoundationPileEntity } from "@/core/domain/foundationPile";

import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

import type { Draw2dLayerAppearance } from "./walls2dPixi";

const PILE_FILL_OUTER = 0x8a9098;
const PILE_STROKE_OUTER = 0x5a5f66;
const PILE_FILL_INNER = 0xa8aeb6;
const PILE_STROKE_INNER = 0x6a7078;
const PILE_SELECTED = 0xe7b65c;
const PILE_CONTEXT_ALPHA = 0.55;

export interface DrawFoundationPiles2dOptions {
  readonly appearance?: Draw2dLayerAppearance;
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
  const baseAlpha = appearance === "context" ? PILE_CONTEXT_ALPHA : 0.9;

  for (const p of piles) {
    const sel = selected.has(p.id);
    const alpha = sel ? Math.min(1, baseAlpha + 0.05) : baseAlpha;
    const outer = squareCornersMm(p.centerX, p.centerY, p.capSizeMm);
    const same = Math.abs(p.capSizeMm - p.sizeMm) < 0.5;
    if (same) {
      drawSquareMm(g, outer, t, PILE_FILL_OUTER, sel ? PILE_SELECTED : PILE_STROKE_OUTER, alpha, sel ? 2 : 1);
    } else {
      drawSquareMm(g, outer, t, PILE_FILL_OUTER, sel ? PILE_SELECTED : PILE_STROKE_OUTER, alpha * 0.92, sel ? 2 : 1);
      const inner = squareCornersMm(p.centerX, p.centerY, p.sizeMm);
      drawSquareMm(g, inner, t, PILE_FILL_INNER, sel ? PILE_SELECTED : PILE_STROKE_INNER, alpha, sel ? 1.5 : 1);
    }
  }
}
