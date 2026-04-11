import type { FoundationPileEntity } from "@/core/domain/foundationPile";
import type { Point2D } from "@/core/geometry/types";
import type { ViewportTransform } from "@/core/geometry/viewportTransform";
import { worldToScreen } from "@/core/geometry/viewportTransform";

/** Половина стороны квадрата сваи в плане для ручек и привязки (макс. из площадки и ствола). */
export function foundationPilePlanHalfMm(pile: FoundationPileEntity): number {
  return Math.max(pile.capSizeMm, pile.sizeMm) / 2;
}

export type FoundationPileHandleKind = "center" | "nw" | "ne" | "se" | "sw";

const HANDLE_ORDER: readonly FoundationPileHandleKind[] = ["center", "nw", "ne", "se", "sw"];

export function foundationPileHandleWorldMm(
  pile: FoundationPileEntity,
  kind: FoundationPileHandleKind,
): Point2D {
  const h = foundationPilePlanHalfMm(pile);
  const cx = pile.centerX;
  const cy = pile.centerY;
  switch (kind) {
    case "center":
      return { x: cx, y: cy };
    case "nw":
      return { x: cx - h, y: cy - h };
    case "ne":
      return { x: cx + h, y: cy - h };
    case "se":
      return { x: cx + h, y: cy + h };
    case "sw":
      return { x: cx - h, y: cy + h };
    default:
      return { x: cx, y: cy };
  }
}

/**
 * Ближайшая базовая точка сваи (центр или угол) к курсору в экранных пикселях.
 */
export function pickClosestFoundationPileHandle(
  worldMm: Point2D,
  pile: FoundationPileEntity,
  viewport: ViewportTransform,
  tolPx: number,
): { readonly kind: FoundationPileHandleKind; readonly pointMm: Point2D } | null {
  const s0 = worldToScreen(worldMm.x, worldMm.y, viewport);
  let best: { kind: FoundationPileHandleKind; pointMm: Point2D; d: number } | null = null;
  for (const kind of HANDLE_ORDER) {
    const p = foundationPileHandleWorldMm(pile, kind);
    const s = worldToScreen(p.x, p.y, viewport);
    const d = Math.hypot(s.x - s0.x, s.y - s0.y);
    if (d <= tolPx && (!best || d < best.d)) {
      best = { kind, pointMm: p, d };
    }
  }
  return best ? { kind: best.kind, pointMm: best.pointMm } : null;
}

/**
 * Попадание в сваю по плану: расстояние от точки до центра не больше половины большего из размеров + допуск.
 */
export function pickClosestFoundationPileAtPoint(
  worldMm: { readonly x: number; readonly y: number },
  piles: readonly FoundationPileEntity[],
  tolAlongMm: number,
): { readonly pileId: string } | null {
  let best: { pileId: string; d: number } | null = null;
  for (const p of piles) {
    const half = Math.max(p.capSizeMm, p.sizeMm) / 2;
    const lim = half + tolAlongMm;
    const dx = worldMm.x - p.centerX;
    const dy = worldMm.y - p.centerY;
    const d = Math.hypot(dx, dy);
    if (d <= lim && (!best || d < best.d)) {
      best = { pileId: p.id, d };
    }
  }
  return best ? { pileId: best.pileId } : null;
}
