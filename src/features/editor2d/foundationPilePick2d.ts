import type { FoundationPileEntity } from "@/core/domain/foundationPile";

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
