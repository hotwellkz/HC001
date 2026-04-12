import { Graphics } from "pixi.js";

import type { FloorInsulationPiece } from "@/core/domain/floorInsulation";
import { isFloorInsulationPieceStale } from "@/core/domain/floorInsulationSpecification";
import type { Project } from "@/core/domain/project";
import type { ViewportTransform } from "@/core/geometry/viewportTransform";
import { worldToScreen } from "@/core/geometry/viewportTransform";

const FILL_DEFAULT = 0xcfd8e6;
const FILL_ALPHA = 0.2;
const STROKE = 0x94a3b8;
const STROKE_ALPHA = 0.55;
const STALE_STROKE = 0xf97316;
const STALE_ALPHA = 0.75;

export function drawFloorInsulation2d(
  g: Graphics,
  project: Project,
  pieces: readonly FloorInsulationPiece[],
  t: ViewportTransform,
  selectedIds: ReadonlySet<string>,
  opts?: { readonly clear?: boolean },
): void {
  if (opts?.clear !== false) {
    g.clear();
  }
  function fillFromSnapshot(hex: string | undefined): number {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
      return FILL_DEFAULT;
    }
    return parseInt(hex.slice(1), 16);
  }

  for (const p of pieces) {
    const ring = p.outlineRingMm;
    if (ring.length < 3) {
      continue;
    }
    const stale = isFloorInsulationPieceStale(p, project);
    const sel = selectedIds.has(p.id);
    const fillRgb = fillFromSnapshot(p.specSnapshot.fillColorHex2d);
    const p0 = worldToScreen(ring[0]!.x, ring[0]!.y, t);
    g.moveTo(p0.x, p0.y);
    for (let i = 1; i < ring.length; i++) {
      const q = worldToScreen(ring[i]!.x, ring[i]!.y, t);
      g.lineTo(q.x, q.y);
    }
    g.closePath();
    g.fill({ color: fillRgb, alpha: FILL_ALPHA + (sel ? 0.08 : 0) });
    g.stroke({
      width: sel ? 1.5 : 1.1,
      color: stale ? STALE_STROKE : STROKE,
      alpha: stale ? STALE_ALPHA : STROKE_ALPHA,
      cap: "round",
      join: "round",
    });
  }
}
