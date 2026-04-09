import { Graphics } from "pixi.js";

import type { Project } from "@/core/domain/project";
import type { Wall } from "@/core/domain/wall";
import { normalizeLumberRole, type LumberRole } from "@/core/domain/wallCalculation";
import { boardCoreNormalOffsetsMm } from "@/core/domain/wallLumberBoard2dOffsets";
import { clampAlongWallRangeMm } from "@/core/domain/wallLumberPlan2dGeometry";
import { isLumberRoleDrawnInPlan2d } from "@/core/domain/wallCalculationPlan2dPolicy";

import { quadCornersAlongWallMm } from "./wallPlanGeometry2d";
import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

/** SIP-панели (расчётные зоны пенопласта) — только полоса core, без OSB. */
const SIP_FILL = 0x2d6a3e;
const SIP_ALPHA = 0.28;
const LUMBER_FILL = 0x6b4a1a;
const LUMBER_ALPHA = 0.55;
/** Обвязка в плане: ширина по нормали = полоса core. */
const PLATE_FILL = 0x5a4a2a;
const PLATE_ALPHA = 0.52;
const OPENING_STUD_FILL = 0x7a4a3a;
const OPENING_HEADER_FILL = 0x5a4a6a;
const TEE_CORNER_FILL = 0x6a6a3a;

function lumberFillForRole(role: LumberRole): { readonly color: number; readonly alpha: number } {
  const r = normalizeLumberRole(role);
  if (r === "upper_plate" || r === "lower_plate") {
    return { color: PLATE_FILL, alpha: PLATE_ALPHA };
  }
  if (r === "opening_left_stud" || r === "opening_right_stud") {
    return { color: OPENING_STUD_FILL, alpha: LUMBER_ALPHA };
  }
  if (r === "opening_header" || r === "opening_sill") {
    return { color: OPENING_HEADER_FILL, alpha: LUMBER_ALPHA };
  }
  if (r === "tee_joint_board" || r === "corner_joint_board") {
    return { color: TEE_CORNER_FILL, alpha: LUMBER_ALPHA };
  }
  return { color: LUMBER_FILL, alpha: LUMBER_ALPHA };
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

function fillQuadMm(
  g: Graphics,
  corners: readonly { readonly x: number; readonly y: number }[],
  t: ViewportTransform,
  color: number,
  alpha: number,
): void {
  if (corners.length < 4) {
    return;
  }
  const s0 = worldToScreen(corners[0]!.x, corners[0]!.y, t);
  g.moveTo(s0.x, s0.y);
  for (let i = 1; i < 4; i++) {
    const si = worldToScreen(corners[i]!.x, corners[i]!.y, t);
    g.lineTo(si.x, si.y);
  }
  g.closePath();
  g.fill({ color, alpha });
}

/**
 * Расчётная SIP-раскладка: зелёный fill — только core; детали по ролям; обвязка отдельным тоном.
 */
export function drawWallCalculationOverlay2d(
  g: Graphics,
  project: Project,
  visibleWallIds: ReadonlySet<string>,
  t: ViewportTransform,
): void {
  g.clear();
  const wallById = new Map(project.walls.map((w) => [w.id, w]));
  for (const calc of project.wallCalculations) {
    const wall = wallById.get(calc.wallId);
    if (!wall || !visibleWallIds.has(wall.id)) {
      continue;
    }
    const L = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    if (L < 1e-6) {
      continue;
    }
    const coreOff = boardCoreNormalOffsetsMm(wall, calc, project);

    for (const r of calc.sipRegions) {
      const span = clampAlongWallRangeMm(r.startOffsetMm, r.endOffsetMm, L);
      if (!span) {
        continue;
      }
      const seg = wallSegmentEndpoints(wall, span.lo, span.hi, L);
      const corners = quadCornersAlongWallMm(
        seg.sx,
        seg.sy,
        seg.ex,
        seg.ey,
        coreOff.offStartMm,
        coreOff.offEndMm,
      );
      if (corners) {
        fillQuadMm(g, corners, t, SIP_FILL, SIP_ALPHA);
      }
    }

    for (const piece of calc.lumberPieces) {
      if (!isLumberRoleDrawnInPlan2d(piece.role)) {
        continue;
      }
      /** В 2D после расчёта показываем только вертикальные элементы каркаса. */
      if (piece.orientation !== "across_wall") {
        continue;
      }
      const along = clampAlongWallRangeMm(piece.startOffsetMm, piece.endOffsetMm, L);
      if (!along) {
        continue;
      }
      const seg = wallSegmentEndpoints(wall, along.lo, along.hi, L);
      const corners = quadCornersAlongWallMm(
        seg.sx,
        seg.sy,
        seg.ex,
        seg.ey,
        coreOff.offStartMm,
        coreOff.offEndMm,
      );
      if (corners) {
        const { color, alpha } = lumberFillForRole(piece.role);
        fillQuadMm(g, corners, t, color, alpha);
      }
    }
  }
}
