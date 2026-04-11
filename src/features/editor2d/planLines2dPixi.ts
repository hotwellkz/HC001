import type { PlanLine } from "@/core/domain/planLine";
import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";
import { Graphics } from "pixi.js";

const LINE_NORMAL = 0x94a3b8;
const LINE_CONTEXT = 0x64748b;
const LINE_SELECTED = 0xe7b65c;

export type PlanLine2dAppearance = "active" | "context";

export function drawPlanLines2d(
  g: Graphics,
  lines: readonly PlanLine[],
  t: ViewportTransform,
  selectedIds: ReadonlySet<string>,
  appearance: PlanLine2dAppearance,
  clear: boolean,
): void {
  if (clear) {
    g.clear();
  }
  const stroke = appearance === "context" ? LINE_CONTEXT : LINE_NORMAL;
  const width = appearance === "context" ? 1 : 1.15;
  const alpha = appearance === "context" ? 0.55 : 0.88;
  for (const ln of lines) {
    const sel = selectedIds.has(ln.id);
    const c = sel ? LINE_SELECTED : stroke;
    const a = sel ? 0.95 : alpha;
    const w = sel ? width + 0.35 : width;
    const s0 = worldToScreen(ln.start.x, ln.start.y, t);
    const s1 = worldToScreen(ln.end.x, ln.end.y, t);
    g.moveTo(s0.x, s0.y);
    g.lineTo(s1.x, s1.y);
    g.stroke({ width: w, color: c, alpha: a, cap: "round" });
  }
}
