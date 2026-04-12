import { Graphics } from "pixi.js";

import type { Point2D } from "@/core/geometry/types";
import type { ViewportTransform } from "@/core/geometry/viewportTransform";
import { worldToScreen } from "@/core/geometry/viewportTransform";

const PREVIEW_STROKE = 0x94a3b8;
const PREVIEW_FILL = 0x94a3b8;

export type FloorInsulationSpatialSessionPaint =
  | {
      readonly kind: "rect";
      readonly firstMm: Point2D | null;
      readonly previewEndMm: Point2D | null;
    }
  | {
      readonly kind: "polygon";
      readonly verticesMm: readonly Point2D[];
      readonly previewEndMm: Point2D | null;
    };

/**
 * Рамка области утепления: прямоугольник или полилиния + курсор-вершина.
 */
export function drawFloorInsulationSessionPreview2d(
  g: Graphics,
  sess: FloorInsulationSpatialSessionPaint | null,
  t: ViewportTransform,
): void {
  g.clear();
  if (!sess) {
    return;
  }
  if (sess.kind === "rect") {
    const { firstMm, previewEndMm } = sess;
    if (firstMm != null && previewEndMm != null) {
      const x0 = Math.min(firstMm.x, previewEndMm.x);
      const x1 = Math.max(firstMm.x, previewEndMm.x);
      const y0 = Math.min(firstMm.y, previewEndMm.y);
      const y1 = Math.max(firstMm.y, previewEndMm.y);
      const p00 = worldToScreen(x0, y0, t);
      const p11 = worldToScreen(x1, y1, t);
      const rw = p11.x - p00.x;
      const rh = p11.y - p00.y;
      g.rect(p00.x, p00.y, rw, rh);
      g.fill({ color: PREVIEW_FILL, alpha: 0.1 });
      g.stroke({ width: 1.25, color: PREVIEW_STROKE, alpha: 0.78, cap: "round" });
    } else if (firstMm != null) {
      const c = worldToScreen(firstMm.x, firstMm.y, t);
      g.circle(c.x, c.y, 4);
      g.fill({ color: PREVIEW_STROKE, alpha: 0.85 });
    }
    return;
  }

  const { verticesMm, previewEndMm } = sess;
  const strokePoly: Point2D[] = [...verticesMm];
  if (previewEndMm != null) {
    strokePoly.push(previewEndMm);
  }
  if (strokePoly.length >= 2) {
    const s0 = worldToScreen(strokePoly[0]!.x, strokePoly[0]!.y, t);
    g.moveTo(s0.x, s0.y);
    for (let i = 1; i < strokePoly.length; i++) {
      const si = worldToScreen(strokePoly[i]!.x, strokePoly[i]!.y, t);
      g.lineTo(si.x, si.y);
    }
    g.stroke({ width: 1.25, color: PREVIEW_STROKE, alpha: 0.82, cap: "round", join: "round" });
  } else if (strokePoly.length === 1) {
    const c = worldToScreen(strokePoly[0]!.x, strokePoly[0]!.y, t);
    g.circle(c.x, c.y, 4);
    g.fill({ color: PREVIEW_STROKE, alpha: 0.85 });
  }

  for (const v of verticesMm) {
    const sc = worldToScreen(v.x, v.y, t);
    g.circle(sc.x, sc.y, 3.2);
    g.fill({ color: PREVIEW_STROKE, alpha: 0.9 });
  }
}
