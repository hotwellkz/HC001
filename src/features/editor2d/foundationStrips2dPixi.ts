import { Graphics } from "pixi.js";

import type {
  FoundationStripEntity,
  FoundationStripFootprintPolyEntity,
  FoundationStripOrthoRingEntity,
} from "@/core/domain/foundationStrip";
import {
  foundationStripOrthoRingFootprintContoursFromEntityMm,
  foundationStripSegmentFootprintQuadMm,
} from "@/core/domain/foundationStripGeometry";

import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

import type { Draw2dLayerAppearance } from "./walls2dPixi";

const STRIP_FILL = 0x9a7b5c;
const STRIP_STROKE = 0x5c4a38;
const STRIP_CONTEXT_ALPHA = 0.55;
const STRIP_SELECTED_STROKE = 0xe7b65c;

export interface DrawFoundationStrips2dOptions {
  readonly appearance?: Draw2dLayerAppearance;
  readonly clear?: boolean;
}

function drawQuadMm(g: Graphics, quad: readonly { x: number; y: number }[], t: ViewportTransform, alpha: number) {
  if (quad.length < 3) {
    return;
  }
  const p0 = worldToScreen(quad[0]!.x, quad[0]!.y, t);
  g.moveTo(p0.x, p0.y);
  for (let i = 1; i < quad.length; i++) {
    const pi = worldToScreen(quad[i]!.x, quad[i]!.y, t);
    g.lineTo(pi.x, pi.y);
  }
  g.closePath();
  g.fill({ color: STRIP_FILL, alpha });
  g.stroke({ width: 1, color: STRIP_STROKE, alpha: Math.min(1, alpha + 0.25) });
}

function toScreenPoly(
  poly: readonly { x: number; y: number }[],
  t: ViewportTransform,
): { x: number; y: number }[] {
  return poly.map((p) => worldToScreen(p.x, p.y, t));
}

function drawOrthoRingMm(
  g: Graphics,
  ring: FoundationStripOrthoRingEntity,
  t: ViewportTransform,
  alpha: number,
  selected: boolean,
): void {
  const { outer, inner } = foundationStripOrthoRingFootprintContoursFromEntityMm(ring);
  const o = toScreenPoly(outer, t);
  const i = toScreenPoly(inner, t);
  g.beginPath();
  g.poly(o, true);
  g.fill({ color: STRIP_FILL, alpha });
  g.poly(i, true);
  g.cut();
  const strokeAlpha = Math.min(1, alpha + 0.25);
  g.beginPath();
  g.poly(o, true);
  g.stroke({ width: 1, color: STRIP_STROKE, alpha: strokeAlpha });
  g.beginPath();
  g.poly(i, true);
  g.stroke({ width: 1, color: STRIP_STROKE, alpha: strokeAlpha });
  if (selected) {
    g.beginPath();
    g.poly(o, true);
    g.stroke({ width: 2, color: STRIP_SELECTED_STROKE, alpha: 0.95 });
    g.beginPath();
    g.poly(i, true);
    g.stroke({ width: 2, color: STRIP_SELECTED_STROKE, alpha: 0.95 });
  }
}

function drawFootprintPolyMm(
  g: Graphics,
  fp: FoundationStripFootprintPolyEntity,
  t: ViewportTransform,
  alpha: number,
  selected: boolean,
): void {
  const o = toScreenPoly(fp.outerRingMm, t);
  const strokeAlpha = Math.min(1, alpha + 0.25);
  g.beginPath();
  g.poly(o, true);
  g.fill({ color: STRIP_FILL, alpha });
  for (const h of fp.holeRingsMm) {
    const hi = toScreenPoly(h, t);
    g.poly(hi, true);
    g.cut();
  }
  g.beginPath();
  g.poly(o, true);
  g.stroke({ width: 1, color: STRIP_STROKE, alpha: strokeAlpha });
  for (const h of fp.holeRingsMm) {
    g.beginPath();
    g.poly(toScreenPoly(h, t), true);
    g.stroke({ width: 1, color: STRIP_STROKE, alpha: strokeAlpha });
  }
  if (selected) {
    g.beginPath();
    g.poly(o, true);
    g.stroke({ width: 2, color: STRIP_SELECTED_STROKE, alpha: 0.95 });
    for (const h of fp.holeRingsMm) {
      g.beginPath();
      g.poly(toScreenPoly(h, t), true);
      g.stroke({ width: 2, color: STRIP_SELECTED_STROKE, alpha: 0.95 });
    }
  }
}

export function drawFoundationStrips2d(
  g: Graphics,
  strips: readonly FoundationStripEntity[],
  t: ViewportTransform,
  selected: ReadonlySet<string>,
  opts?: DrawFoundationStrips2dOptions,
): void {
  const appearance = opts?.appearance ?? "active";
  const clear = opts?.clear !== false;
  if (clear) {
    g.clear();
  }
  const baseAlpha = appearance === "context" ? STRIP_CONTEXT_ALPHA : 0.92;

  for (const s of strips) {
    const sel = selected.has(s.id);
    const alpha = sel ? Math.min(1, baseAlpha + 0.06) : baseAlpha;
    if (s.kind === "ortho_ring") {
      drawOrthoRingMm(g, s, t, alpha, sel);
      continue;
    }
    if (s.kind === "footprint_poly") {
      drawFootprintPolyMm(g, s, t, alpha, sel);
      continue;
    }
    const quad = foundationStripSegmentFootprintQuadMm(
      s.axisStart,
      s.axisEnd,
      s.outwardNormalX,
      s.outwardNormalY,
      s.sideOutMm,
      s.sideInMm,
    );
    drawQuadMm(g, quad, t, alpha);
    if (sel) {
      for (let i = 0; i < quad.length; i++) {
        const a = worldToScreen(quad[i]!.x, quad[i]!.y, t);
        const b = worldToScreen(quad[(i + 1) % quad.length]!.x, quad[(i + 1) % quad.length]!.y, t);
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke({ width: 2, color: STRIP_SELECTED_STROKE, alpha: 0.95 });
      }
    }
  }
}
