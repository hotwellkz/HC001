/**
 * Отчёт «Стены — Стартовая доска»: только SIP-стены, только нижняя обвязка (lower_plate) из расчёта.
 * ГКЛ / frame не включаются.
 */

import type { Project } from "@/core/domain/project";
import type { Profile } from "@/core/domain/profile";
import { getProfileById } from "@/core/domain/profileOps";
import { buildWallCalculationForWall, SipWallLayoutError } from "@/core/domain/sipWallLayout";
import {
  DEFAULT_WALL_CALC_STAGE3_OPTIONS,
  type LumberPiece,
  type WallCalculationResult,
} from "@/core/domain/wallCalculation";
import type { Wall } from "@/core/domain/wall";
import { boardCoreNormalOffsetsMm } from "@/core/domain/wallLumberBoard2dOffsets";
import { clampAlongWallRangeMm } from "@/core/domain/wallLumberPlan2dGeometry";
import { resolveWallCalculationModel } from "@/core/domain/wallManufacturing";
import { layerIdsForSnapGeometry } from "@/core/geometry/snap2dPrimitives";
import type { Point2D } from "@/core/geometry/types";
import { openingPlanLabelRotationRad } from "@/features/editor2d/openingPlanLabelOrientation2d";
import { quadCornersAlongWallMm } from "@/features/editor2d/wallPlanGeometry2d";
import type { ViewportTransform } from "@/core/geometry/viewportTransform";

import {
  buildStartingBoardPlanDimensionPrimitives,
  type StartingBoardSegmentEnd,
} from "../dimensionRules/sipStartingBoardDimensions";
import type { ReportPrimitive } from "../types";

const NEUTRAL_VT: ViewportTransform = {
  centerX: 0,
  centerY: 0,
  zoomPixelsPerMm: 1,
  panXMm: 0,
  panYMm: 0,
};

const FILL_RGBA = "rgba(225, 236, 248, 0.92)";
const EDGE_STROKE_MM = 0.26;
const LABEL_FS_MM = 3.35;
const LEADER_STROKE_MM = 0.18;
/** Если сегмент короче — подпись выносим с выноской. */
const MIN_INLINE_LABEL_LEN_MM = 420;

export interface SipStartingBoardPlanBuild {
  readonly primitives: readonly ReportPrimitive[];
  readonly worldBounds: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } | null;
  readonly messages: readonly string[];
  /** Сколько SIP-стен не удалось разложить (ошибка расчёта). */
  readonly missingCalculationWallCount: number;
  /** Хотя бы для одной стены расчёт выполнен на лету (нет записи в project.wallCalculations). */
  readonly usedFallbackCalculation: boolean;
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

function boundsUnionPoint(
  b: { minX: number; minY: number; maxX: number; maxY: number } | null,
  x: number,
  y: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!b) {
    return { minX: x, minY: y, maxX: x, maxY: y };
  }
  return {
    minX: Math.min(b.minX, x),
    minY: Math.min(b.minY, y),
    maxX: Math.max(b.maxX, x),
    maxY: Math.max(b.maxY, y),
  };
}

function boundsUnionCorners(
  b: ReturnType<typeof boundsUnionPoint> | null,
  corners: readonly Point2D[],
): ReturnType<typeof boundsUnionPoint> | null {
  let out = b;
  for (const c of corners) {
    out = boundsUnionPoint(out, c.x, c.y);
  }
  return out;
}

function formatStartingBoardLabel(piece: LumberPiece): string {
  const a = Math.round(piece.sectionThicknessMm);
  const b = Math.round(piece.sectionDepthMm);
  const c = Math.round(piece.lengthMm);
  return `${a}x${b}x${c}`;
}

function labelRotationDegFromWall(dx: number, dy: number): number {
  const rad = openingPlanLabelRotationRad(dx, dy, NEUTRAL_VT);
  return (rad * 180) / Math.PI;
}

function quadCentroid(corners: readonly Point2D[]): Point2D {
  let sx = 0;
  let sy = 0;
  for (const c of corners) {
    sx += c.x;
    sy += c.y;
  }
  return { x: sx / corners.length, y: sy / corners.length };
}

function getWallCalculationForReport(
  project: Project,
  wall: Wall,
  profile: Profile,
): { readonly calc: WallCalculationResult; readonly fromProject: boolean } | null {
  const existing = project.wallCalculations.find((c) => c.wallId === wall.id);
  if (existing) {
    return { calc: existing, fromProject: true };
  }
  try {
    const calc = buildWallCalculationForWall(wall, profile, {
      openings: project.openings,
      wallJoints: project.wallJoints,
      skipAutoOpeningFramingForOpeningIds: new Set(project.openingFramingPieces.map((p) => p.openingId)),
      options: DEFAULT_WALL_CALC_STAGE3_OPTIONS,
    });
    return { calc, fromProject: false };
  } catch (e) {
    if (e instanceof SipWallLayoutError) {
      return null;
    }
    return null;
  }
}

/**
 * Геометрия нижней обвязки SIP в плане: вдоль оси стены, полоса по глубине сечения (как в 3D lumberSpecs).
 */
export function buildSipStartingBoardPlanWorld(project: Project): SipStartingBoardPlanBuild {
  const layerIds = layerIdsForSnapGeometry(project);
  const walls = project.walls.filter((w) => layerIds.has(w.layerId));

  const primitives: ReportPrimitive[] = [];
  const messages: string[] = [];
  let worldBounds: ReturnType<typeof boundsUnionPoint> | null = null;

  let missingCalculationWallCount = 0;
  let usedFallbackCalculation = false;

  const segmentDimRows: StartingBoardSegmentEnd[] = [];
  const gapDimRows: (StartingBoardSegmentEnd & { readonly gapMm: number })[] = [];

  for (const wall of walls) {
    const profile = wall.profileId ? getProfileById(project, wall.profileId) : undefined;
    if (!profile) {
      continue;
    }
    if (resolveWallCalculationModel(profile) !== "sip") {
      continue;
    }

    const got = getWallCalculationForReport(project, wall, profile);
    if (!got) {
      missingCalculationWallCount += 1;
      messages.push(`SIP-стена ${wall.markLabel ?? wall.id.slice(0, 8)}: не удалось получить расчёт (раскладка).`);
      continue;
    }
    if (!got.fromProject) {
      usedFallbackCalculation = true;
    }

    const { calc } = got;
    const L = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    if (L < 1e-6) {
      continue;
    }

    const plates = calc.lumberPieces.filter((p) => p.role === "lower_plate" && p.orientation === "along_wall");
    if (plates.length === 0) {
      messages.push(`SIP-стена ${wall.markLabel ?? wall.id.slice(0, 8)}: в расчёте нет нижней обвязки.`);
      continue;
    }

    const coreOff = boardCoreNormalOffsetsMm(wall, calc, project);
    const coreMid = (coreOff.offStartMm + coreOff.offEndMm) / 2;

    const sorted = [...plates].sort((a, b) => a.startOffsetMm - b.startOffsetMm);

    const wallDx = wall.end.x - wall.start.x;
    const wallDy = wall.end.y - wall.start.y;
    const rotDeg = labelRotationDegFromWall(wallDx, wallDy);
    const lenWall = Math.hypot(wallDx, wallDy);
    const nx = -wallDy / lenWall;
    const ny = wallDx / lenWall;

    for (let pi = 0; pi < sorted.length; pi++) {
      const piece = sorted[pi]!;
      const span = clampAlongWallRangeMm(piece.startOffsetMm, piece.endOffsetMm, L);
      if (!span) {
        continue;
      }
      const halfD = piece.sectionDepthMm / 2;
      const n0 = coreMid - halfD;
      const n1 = coreMid + halfD;
      const seg = wallSegmentEndpoints(wall, span.lo, span.hi, L);
      const corners = quadCornersAlongWallMm(seg.sx, seg.sy, seg.ex, seg.ey, n0, n1);
      if (!corners || corners.length < 4) {
        continue;
      }

      primitives.push({
        kind: "polyline",
        pointsMm: [...corners],
        closed: true,
        strokeMm: EDGE_STROKE_MM,
        fill: FILL_RGBA,
      });

      worldBounds = boundsUnionCorners(worldBounds, corners);

      const startMid: Point2D = { x: (corners[0]!.x + corners[3]!.x) / 2, y: (corners[0]!.y + corners[3]!.y) / 2 };
      const endMid: Point2D = { x: (corners[1]!.x + corners[2]!.x) / 2, y: (corners[1]!.y + corners[2]!.y) / 2 };
      const segLen = Math.hypot(endMid.x - startMid.x, endMid.y - startMid.y);

      segmentDimRows.push({
        ax: startMid.x,
        ay: startMid.y,
        bx: endMid.x,
        by: endMid.y,
        wallId: wall.id,
        lengthMm: piece.lengthMm,
      });

      const labelText = formatStartingBoardLabel(piece);
      const c = quadCentroid(corners);

      if (segLen >= MIN_INLINE_LABEL_LEN_MM) {
        primitives.push({
          kind: "text",
          xMm: c.x,
          yMm: c.y,
          text: labelText,
          fontSizeMm: LABEL_FS_MM,
          anchor: "middle",
          rotationDeg: rotDeg,
        });
      } else {
        const outDist = 115;
        const lx = c.x + nx * outDist;
        const ly = c.y + ny * outDist;
        primitives.push({
          kind: "line",
          x1Mm: c.x,
          y1Mm: c.y,
          x2Mm: lx,
          y2Mm: ly,
          strokeMm: LEADER_STROKE_MM,
          muted: true,
        });
        primitives.push({
          kind: "text",
          xMm: lx,
          yMm: ly,
          text: labelText,
          fontSizeMm: LABEL_FS_MM,
          anchor: "middle",
          rotationDeg: 0,
        });
      }

      if (pi < sorted.length - 1) {
        const next = sorted[pi + 1]!;
        const gap = next.startOffsetMm - piece.endOffsetMm;
        if (gap > 1.5) {
          const gSeg = wallSegmentEndpoints(wall, piece.endOffsetMm, next.startOffsetMm, L);
          gapDimRows.push({
            ax: gSeg.sx,
            ay: gSeg.sy,
            bx: gSeg.ex,
            by: gSeg.ey,
            wallId: wall.id,
            lengthMm: gap,
            gapMm: gap,
          });
        }
      }
    }
  }

  if (usedFallbackCalculation) {
    messages.push(
      "Для части стен использован расчёт «на лету» (нет сохранённого wallCalculations). Сохраните проект после пересчёта для совпадения со спецификацией.",
    );
  }

  if (worldBounds == null) {
    return {
      primitives: [],
      worldBounds: null,
      messages:
        messages.length > 0
          ? messages
          : ["Нет SIP-стен с нижней обвязкой: добавьте несущие SIP-стены или выполните расчёт стен."],
      missingCalculationWallCount,
      usedFallbackCalculation,
    };
  }

  const dims = buildStartingBoardPlanDimensionPrimitives(worldBounds, segmentDimRows, gapDimRows);
  primitives.push(...dims);

  return {
    primitives,
    worldBounds,
    messages,
    missingCalculationWallCount,
    usedFallbackCalculation,
  };
}
