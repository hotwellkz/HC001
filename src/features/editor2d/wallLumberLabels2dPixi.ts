import { Container, Text } from "pixi.js";

import type { Project } from "@/core/domain/project";
import type { Wall } from "@/core/domain/wall";
import { shouldShowLumberPieceLabels2d } from "@/core/domain/wallCalculationPlan2dLabelPolicy";
import { isLumberRoleLabeledInPlan2d } from "@/core/domain/wallCalculationPlan2dPolicy";
import { clampAlongWallRangeMm } from "@/core/domain/wallLumberPlan2dGeometry";
import { lumberRoleToMarkCode, type LumberPiece } from "@/core/domain/wallCalculation";

import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

const MIN_ZOOM_DETAIL = 0.095;
const MIN_SEG_PX = 18;

export function clearWallLumberLabelContainer(container: Container): void {
  for (const c of [...container.children]) {
    c.destroy({ children: true });
  }
  container.removeChildren();
}

function wallSegmentEndpoints(
  wall: Wall,
  s0: number,
  s1: number,
  lengthMm: number,
): { readonly sx: number; readonly sy: number; readonly ex: number; readonly ey: number } {
  const t0 = s0 / lengthMm;
  const t1 = s1 / lengthMm;
  return {
    sx: wall.start.x + (wall.end.x - wall.start.x) * t0,
    sy: wall.start.y + (wall.end.y - wall.start.y) * t0,
    ex: wall.start.x + (wall.end.x - wall.start.x) * t1,
    ey: wall.start.y + (wall.end.y - wall.start.y) * t1,
  };
}

function anchorForPiece(
  wall: Wall,
  piece: LumberPiece,
  lengthMm: number,
  t: ViewportTransform,
): { readonly cx: number; readonly cy: number; readonly ang: number; readonly spanPx: number } {
  const along = clampAlongWallRangeMm(piece.startOffsetMm, piece.endOffsetMm, lengthMm);
  if (!along) {
    return { cx: 0, cy: 0, ang: 0, spanPx: 0 };
  }
  const seg = wallSegmentEndpoints(wall, along.lo, along.hi, lengthMm);
  const mx = (seg.sx + seg.ex) / 2;
  const my = (seg.sy + seg.ey) / 2;
  const a = worldToScreen(seg.sx, seg.sy, t);
  const b = worldToScreen(seg.ex, seg.ey, t);
  const spanPx = Math.hypot(b.x - a.x, b.y - a.y);
  const c = worldToScreen(mx, my, t);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  return { cx: c.x, cy: c.y, ang, spanPx };
}

/**
 * Подписи марок и длин досок на расчётном слое (Pixi).
 * В обычном режиме выключены — только settings.editor2d.debugLumberPieceLabels2d.
 */
export function appendWallLumberLabels2d(
  container: Container,
  project: Project,
  visibleWallIds: ReadonlySet<string>,
  t: ViewportTransform,
): void {
  clearWallLumberLabelContainer(container);
  if (!shouldShowLumberPieceLabels2d(project.settings.editor2d.debugLumberPieceLabels2d)) {
    return;
  }

  const wallById = new Map(project.walls.map((w) => [w.id, w]));
  const detail = t.zoomPixelsPerMm >= MIN_ZOOM_DETAIL;
  const fsBase = Math.max(8, Math.min(11, 7 + t.zoomPixelsPerMm * 40));

  for (const calc of project.wallCalculations) {
    const wall = wallById.get(calc.wallId);
    if (!wall || !visibleWallIds.has(wall.id)) {
      continue;
    }
    const L = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    if (L < 1e-6) {
      continue;
    }

    for (const piece of calc.lumberPieces) {
      if (!isLumberRoleLabeledInPlan2d(piece.role)) {
        continue;
      }
      const { cx, cy, ang, spanPx } = anchorForPiece(wall, piece, L, t);
      if (spanPx < 1e-6) {
        continue;
      }
      const lenStr = String(Math.round(piece.lengthMm));
      let text: string;
      if (!detail || spanPx < MIN_SEG_PX) {
        const short = `${lumberRoleToMarkCode(piece.role)}-${piece.sequenceNumber}`;
        text = spanPx < MIN_SEG_PX * 0.85 ? lenStr : `${short}\n${lenStr}`;
      } else {
        text = `${piece.pieceMark}\n${lenStr}`;
      }

      const txt = new Text({
        text,
        style: {
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: fsBase,
          fill: 0xe8ecf2,
          fontWeight: "600",
          align: "center",
          lineHeight: fsBase * 1.15,
        },
      });
      txt.anchor.set(0.5);
      txt.x = cx;
      txt.y = cy;
      if (piece.orientation === "along_wall" && spanPx >= MIN_SEG_PX) {
        txt.rotation = ang;
      } else {
        txt.rotation = 0;
      }
      txt.alpha = 0.92;
      container.addChild(txt);
    }
  }
}
