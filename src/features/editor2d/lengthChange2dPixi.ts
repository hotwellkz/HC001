import type { Wall } from "@/core/domain/wall";
import type { WallEndSide } from "@/core/domain/wallJoint";
import { Graphics } from "pixi.js";

import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

const HOVER = 0xf59e0b;
const ACTIVE = 0x38bdf8;
const LINE = 0x64748b;
const MARK_FIXED = 0x94a3b8;
function endpoint(w: Wall, end: WallEndSide): { x: number; y: number } {
  return end === "start" ? w.start : w.end;
}

/** Подсветка торца при наведении (режим выбора стороны). */
export function drawLengthChangeEndHover(
  g: Graphics,
  wall: Wall,
  end: WallEndSide,
  t: ViewportTransform,
): void {
  g.clear();
  const p = endpoint(wall, end);
  const s = worldToScreen(p.x, p.y, t);
  g.circle(s.x, s.y, 8);
  g.fill({ color: HOVER, alpha: 0.88 });
  g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.45 });
}

/** Превью: ось, неподвижный маркер, двигаемый торец, «тень» стены по превью. */
export function drawLengthChangeDragOverlay(
  g: Graphics,
  wall: Wall,
  movingEnd: WallEndSide,
  fixedMm: { readonly x: number; readonly y: number },
  previewMovingMm: { readonly x: number; readonly y: number },
  t: ViewportTransform,
): void {
  g.clear();
  const a = worldToScreen(fixedMm.x, fixedMm.y, t);
  const b = worldToScreen(previewMovingMm.x, previewMovingMm.y, t);
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.stroke({ width: 1.25, color: LINE, alpha: 0.85 });

  const cross = 6;
  g.moveTo(a.x - cross, a.y);
  g.lineTo(a.x + cross, a.y);
  g.moveTo(a.x, a.y - cross);
  g.lineTo(a.x, a.y + cross);
  g.stroke({ width: 1, color: MARK_FIXED, alpha: 0.9 });

  g.circle(a.x, a.y, 3.5);
  g.fill({ color: MARK_FIXED, alpha: 0.85 });
  g.stroke({ width: 1, color: 0xffffff, alpha: 0.4 });

  g.circle(b.x, b.y, 7);
  g.fill({ color: ACTIVE, alpha: 0.82 });
  g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.45 });

  const orig = endpoint(wall, movingEnd);
  const o = worldToScreen(orig.x, orig.y, t);
  g.circle(o.x, o.y, 3);
  g.stroke({ width: 1, color: 0xf97316, alpha: 0.65 });
}
