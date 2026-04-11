import { Graphics } from "pixi.js";

import type { SlabEntity } from "@/core/domain/slab";
import type { ViewportTransform } from "@/core/geometry/viewportTransform";
import { worldToScreen } from "@/core/geometry/viewportTransform";

const STROKE = 0x6b7280;
const STROKE_ALPHA = 0.92;
const STROKE_WIDTH = 1.25;

const SEL_STROKE = 0x3b82f6;
const SEL_ALPHA = 0.95;
const VERT_MARK = 0x60a5fa;
const CLOSE_HIGHLIGHT = 0x22c55e;

export function drawSlabs2d(
  g: Graphics,
  slabs: readonly SlabEntity[],
  t: ViewportTransform,
  selectedIds: ReadonlySet<string>,
  opts?: { readonly clear?: boolean },
): void {
  if (opts?.clear !== false) {
    g.clear();
  }
  for (const s of slabs) {
    const pts = s.pointsMm;
    if (pts.length < 2) {
      continue;
    }
    const sel = selectedIds.has(s.id);
    const col = sel ? SEL_STROKE : STROKE;
    const al = sel ? SEL_ALPHA : STROKE_ALPHA;
    const w = sel ? 1.35 : STROKE_WIDTH;
    const p0 = worldToScreen(pts[0]!.x, pts[0]!.y, t);
    g.moveTo(p0.x, p0.y);
    for (let i = 1; i < pts.length; i++) {
      const p = worldToScreen(pts[i]!.x, pts[i]!.y, t);
      g.lineTo(p.x, p.y);
    }
    if (pts.length >= 3) {
      g.closePath();
    }
    g.stroke({ width: w, color: col, alpha: al, cap: "round", join: "round" });
    if (sel && pts.length >= 3) {
      const markR = 3.2;
      for (const q of pts) {
        const sc = worldToScreen(q.x, q.y, t);
        g.circle(sc.x, sc.y, markR);
        g.stroke({ width: 1, color: VERT_MARK, alpha: 0.85 });
      }
    }
  }
}

/** Предпросмотр контура плиты (открытая ломаная или замкнутый). */
export function drawSlabPlacementPreview2d(
  g: Graphics,
  verticesMm: readonly { readonly x: number; readonly y: number }[],
  previewMm: { readonly x: number; readonly y: number } | null,
  t: ViewportTransform,
  opts?: {
    readonly highlightFirstMm?: { readonly x: number; readonly y: number } | null;
    readonly firstHighlightActive?: boolean;
  },
): void {
  g.clear();
  if (verticesMm.length === 0 && !previewMm) {
    return;
  }
  const dashCol = 0x0ea5e9;
  const all = previewMm ? [...verticesMm, previewMm] : [...verticesMm];
  if (all.length >= 2) {
    const a0 = worldToScreen(all[0]!.x, all[0]!.y, t);
    g.moveTo(a0.x, a0.y);
    for (let i = 1; i < all.length; i++) {
      const p = worldToScreen(all[i]!.x, all[i]!.y, t);
      g.lineTo(p.x, p.y);
    }
    g.stroke({ width: 1.35, color: dashCol, alpha: 0.88, cap: "round", join: "round" });
  }
  if (verticesMm.length >= 3 && previewMm) {
    const f = verticesMm[0]!;
    const pLast = previewMm;
    const s0 = worldToScreen(f.x, f.y, t);
    const s1 = worldToScreen(pLast.x, pLast.y, t);
    g.moveTo(s0.x, s0.y);
    g.lineTo(s1.x, s1.y);
    g.stroke({ width: 1, color: 0x94a3b8, alpha: 0.55, cap: "round" });
  }
  const hf = opts?.highlightFirstMm;
  if (hf && opts?.firstHighlightActive) {
    const sc = worldToScreen(hf.x, hf.y, t);
    g.circle(sc.x, sc.y, 6);
    g.stroke({ width: 2, color: CLOSE_HIGHLIGHT, alpha: 0.9 });
  }
}
