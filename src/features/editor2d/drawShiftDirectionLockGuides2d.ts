import type { Graphics } from "pixi.js";

import type { Point2D } from "@/core/geometry/types";
import type { ViewportTransform } from "@/core/geometry/viewportTransform";
import { screenToWorld, worldToScreen } from "./viewportTransforms";

const GUIDE_COLOR = 0x38bdf8;
const PROJ_COLOR = 0x94a3b8;

function strokeDashedScreenLine(
  g: Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  dashPx: number,
  gapPx: number,
  stroke: { readonly width: number; readonly color: number; readonly alpha: number },
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = Math.hypot(dx, dy);
  if (L < 0.5) {
    return;
  }
  const ux = dx / L;
  const uy = dy / L;
  let pos = 0;
  let on = true;
  while (pos < L) {
    const chunk = on ? dashPx : gapPx;
    const next = Math.min(L, pos + chunk);
    if (on) {
      const ax = x0 + ux * pos;
      const ay = y0 + uy * pos;
      const bx = x0 + ux * next;
      const by = y0 + uy * next;
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke(stroke);
    }
    pos = next;
    on = !on;
  }
}

/**
 * Направляющая вдоль зафиксированного луча + пунктир от опорной точки Q к превью на оси.
 */
export function drawShiftDirectionLockGuides2d(
  g: Graphics,
  originMm: Point2D,
  unit: Point2D,
  viewportWidthPx: number,
  viewportHeightPx: number,
  t: ViewportTransform,
  opts?: { readonly referenceMm?: Point2D | null; readonly previewEndMm?: Point2D | null },
): void {
  const corners = [
    screenToWorld(0, 0, t),
    screenToWorld(viewportWidthPx, 0, t),
    screenToWorld(viewportWidthPx, viewportHeightPx, t),
    screenToWorld(0, viewportHeightPx, t),
  ];
  const ux = unit.x;
  const uy = unit.y;
  let maxT = 500;
  for (const c of corners) {
    const tt = (c.x - originMm.x) * ux + (c.y - originMm.y) * uy;
    if (tt > maxT) {
      maxT = tt;
    }
  }
  maxT = Math.max(maxT, 1) * 1.18;
  const endMm = { x: originMm.x + ux * maxT, y: originMm.y + uy * maxT };
  const sa = worldToScreen(originMm.x, originMm.y, t);
  const sb = worldToScreen(endMm.x, endMm.y, t);
  strokeDashedScreenLine(g, sa.x, sa.y, sb.x, sb.y, 11, 7, { width: 1.1, color: GUIDE_COLOR, alpha: 0.78 });

  const Q = opts?.referenceMm;
  const P = opts?.previewEndMm;
  if (Q && P && Math.hypot(Q.x - P.x, Q.y - P.y) > 0.8) {
    const sQ = worldToScreen(Q.x, Q.y, t);
    const sP = worldToScreen(P.x, P.y, t);
    strokeDashedScreenLine(g, sQ.x, sQ.y, sP.x, sP.y, 5, 5, { width: 1, color: PROJ_COLOR, alpha: 0.62 });
  }
}
