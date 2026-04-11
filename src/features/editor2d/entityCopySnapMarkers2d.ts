import { Graphics } from "pixi.js";
import type { EntityCopySessionSnapMarker } from "@/core/domain/entityCopySession";
import type { ViewportTransform } from "@/core/geometry/viewportTransform";
import { worldToScreen } from "@/core/geometry/viewportTransform";

/**
 * Маркеры опор в экранных координатах (как остальные overlay слоя 2D).
 */
export function drawEntityCopySnapMarkers2d(
  g: Graphics,
  markers: readonly EntityCopySessionSnapMarker[],
  t: ViewportTransform,
): void {
  g.clear();
  for (const m of markers) {
    const sc = worldToScreen(m.world.x, m.world.y, t);
    const r = m.active ? 6.5 : 4.5;
    const w = m.active ? 2.35 : 1.5;
    const alpha = m.active ? 0.98 : 0.62;
    const col = m.active ? 0x2dd4bf : 0x94a3b8;

    switch (m.visual) {
      case "vertex": {
        g.rect(sc.x - r, sc.y - r, r * 2, r * 2);
        g.stroke({ width: w, color: col, alpha });
        break;
      }
      case "edgeMid": {
        const k = 1.15;
        g.moveTo(sc.x, sc.y - r * k);
        g.lineTo(sc.x + r * k, sc.y);
        g.lineTo(sc.x, sc.y + r * k);
        g.lineTo(sc.x - r * k, sc.y);
        g.closePath();
        g.stroke({ width: w, color: col, alpha });
        break;
      }
      case "center":
      case "key": {
        const c = 7;
        g.moveTo(sc.x - c, sc.y);
        g.lineTo(sc.x + c, sc.y);
        g.moveTo(sc.x, sc.y - c);
        g.lineTo(sc.x, sc.y + c);
        g.stroke({ width: w, color: col, alpha });
        g.circle(sc.x, sc.y, m.active ? 3.2 : 2.2);
        g.stroke({ width: w * 0.85, color: col, alpha: alpha * 0.9 });
        break;
      }
      case "intersection": {
        g.circle(sc.x, sc.y, r * 0.85);
        g.stroke({ width: w, color: 0xfbbf24, alpha: alpha * 0.95 });
        break;
      }
      default:
        break;
    }
  }
}
