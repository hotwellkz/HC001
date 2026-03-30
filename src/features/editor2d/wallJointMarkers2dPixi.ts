import type { Wall } from "@/core/domain/wall";
import type { WallEndSide } from "@/core/domain/wallJoint";
import { Graphics } from "pixi.js";

import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

export type JointHoverState =
  | { readonly kind: "end"; readonly wallId: string; readonly end: WallEndSide }
  | { readonly kind: "segment"; readonly wallId: string; readonly pointMm: { readonly x: number; readonly y: number } }
  | null;

const FIRST = 0x22c55e;
const HOVER = 0xf59e0b;
const SEG = 0x38bdf8;

function wallById(walls: readonly Wall[], id: string): Wall | undefined {
  return walls.find((w) => w.id === id);
}

function endpoint(w: Wall, end: WallEndSide): { x: number; y: number } {
  return end === "start" ? w.start : w.end;
}

/**
 * Маркеры выбора узла: первый торец (зелёный), hover (янтарь), сегмент T (голубая точка).
 */
export function drawWallJointPickOverlay(
  g: Graphics,
  walls: readonly Wall[],
  t: ViewportTransform,
  first: { readonly wallId: string; readonly end: WallEndSide } | undefined,
  hover: JointHoverState,
): void {
  g.clear();
  if (first) {
    const w = wallById(walls, first.wallId);
    if (w) {
      const p = endpoint(w, first.end);
      const s = worldToScreen(p.x, p.y, t);
      g.circle(s.x, s.y, 9);
      g.fill({ color: FIRST, alpha: 0.95 });
      g.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
    }
  }
  if (!hover) {
    return;
  }
  if (hover.kind === "end") {
    const w = wallById(walls, hover.wallId);
    if (w) {
      const p = endpoint(w, hover.end);
      const s = worldToScreen(p.x, p.y, t);
      g.circle(s.x, s.y, 8);
      g.fill({ color: HOVER, alpha: 0.9 });
      g.stroke({ width: 2, color: 0xffffff, alpha: 0.45 });
    }
    return;
  }
  const s = worldToScreen(hover.pointMm.x, hover.pointMm.y, t);
  g.circle(s.x, s.y, 7);
  g.fill({ color: SEG, alpha: 0.92 });
  g.stroke({ width: 2, color: 0xffffff, alpha: 0.45 });
}
