import { Graphics } from "pixi.js";

import type { RoofRafterEntity } from "@/core/domain/roofRafter";

import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

const COLOR = 0x6b5344;
const SEL = 0xe7b65c;

export function drawRoofRaftersPlan2d(
  g: Graphics,
  rafters: readonly RoofRafterEntity[],
  t: ViewportTransform,
  selectedIds: ReadonlySet<string>,
  opts?: { readonly clear?: boolean },
): void {
  if (opts?.clear !== false) {
    g.clear();
  }
  for (const r of rafters) {
    const sel = selectedIds.has(r.id);
    const a = worldToScreen(r.footPlanMm.x, r.footPlanMm.y, t);
    const b = worldToScreen(r.ridgePlanMm.x, r.ridgePlanMm.y, t);
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke({
      width: sel ? 2.5 : 1.25,
      color: sel ? SEL : COLOR,
      alpha: sel ? 0.95 : 0.72,
      cap: "round",
      join: "round",
    });
    const c = worldToScreen(r.footPlanMm.x, r.footPlanMm.y, t);
    g.circle(c.x, c.y, sel ? 4 : 2.5);
    g.fill({ color: sel ? SEL : COLOR, alpha: sel ? 0.9 : 0.55 });
  }
}
