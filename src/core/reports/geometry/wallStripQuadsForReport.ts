import type { Project } from "../../domain/project";
import type { Wall } from "../../domain/wall";
import { getProfileById } from "../../domain/profileOps";
import { resolveWallProfileLayerStripsForWallVisualization } from "../../domain/wallProfileLayers";
import { wallStripQuadCornersMm } from "../../geometry/snap2dPrimitives";
import type { Point2D } from "../../geometry/types";

/**
 * Полосы стены в плане (мм) — та же логика, что у привязок/2D: профиль по слоям или одна полоса по толщине.
 */
export function wallStripQuadsMmForReport(w: Wall, project: Project): Point2D[][] {
  const sx = w.start.x;
  const sy = w.start.y;
  const ex = w.end.x;
  const ey = w.end.y;
  const T = w.thicknessMm;
  if (!Number.isFinite(T) || T <= 0) {
    return [];
  }
  const quads: Point2D[][] = [];
  const profile = w.profileId ? getProfileById(project, w.profileId) : undefined;
  const strips = profile ? resolveWallProfileLayerStripsForWallVisualization(T, profile) : null;
  if (strips && strips.length > 0) {
    let acc = -T / 2;
    for (const strip of strips) {
      const off0 = acc;
      const off1 = acc + strip.thicknessMm;
      const q = wallStripQuadCornersMm(sx, sy, ex, ey, off0, off1);
      if (q) {
        quads.push(q);
      }
      acc = off1;
    }
  } else {
    const q = wallStripQuadCornersMm(sx, sy, ex, ey, -T / 2, T / 2);
    if (q) {
      quads.push(q);
    }
  }
  return quads;
}
