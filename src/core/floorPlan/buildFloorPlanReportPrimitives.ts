/**
 * Примитивы отчёта «план этажа» из той же геометрии, что и 2D-план (walls2dPixi).
 * Мир: мм, Y вверх — как в домене; compileReport переводит в координаты листа.
 */

import { getProfileById } from "@/core/domain/profileOps";
import type { Project } from "@/core/domain/project";
import type { Opening } from "@/core/domain/opening";
import type { Wall } from "@/core/domain/wall";
import { resolveWallProfileLayerStripsForWallVisualization } from "@/core/domain/wallProfileLayers";
import { openingCenterOnWallMm } from "@/core/domain/openingPlacement";
import { layerIdsForSnapGeometry } from "@/core/geometry/snap2dPrimitives";
import type { ReportPrimitive } from "@/core/reports/types";
import { fillColor2dForMaterialType, plan2dLayerFillAlpha } from "@/features/editor2d/materials2d";
import { openingSlotCornersMm } from "@/features/editor2d/openingPlanGeometry2d";
import { openingPlanLabelRotationRad } from "@/features/editor2d/openingPlanLabelOrientation2d";
import { quadCornersAlongWallMm } from "@/features/editor2d/wallPlanGeometry2d";
import { exteriorNormalForWallLabelMm } from "@/features/editor2d/wallLabelExteriorNormalMm";
import { wallCenterlinePointAtAlongMm } from "@/features/editor2d/doorSwingSymbolMm";
import type { ViewportTransform } from "@/core/geometry/viewportTransform";

const WALL_NORMAL = 0x5aa7ff;
const OPENING_SLOT_FILL = 0x5aa7ff;
const OPENING_SLOT_EMPTY = 0x8b939e;
const DOOR_ARC = 0x1f2937;

const SEAM_STROKE_MM = 0.22;
const WALL_EDGE_STROKE_MM = 0.2;
const OPENING_STROKE_MM = 0.35;
const DOOR_LINE_STROKE_MM = 0.32;
const DOOR_ARC_STROKE_MM = 0.26;

/**
 * Зазор от внешней грани стены до центра подписи проёма в отчёте (мм).
 * Раньше фактически ~14 мм — двухстрочная маркировка и габариты (W/H) залезали на полосу стены.
 */
const REPORT_OPENING_LABEL_CLEARANCE_BEYOND_FACE_MM = 46;

/** Нейтральный viewport — только для openingPlanLabelRotationRad (масштаб 1 мм/px). */
const NEUTRAL_VT: ViewportTransform = {
  centerX: 0,
  centerY: 0,
  zoomPixelsPerMm: 1,
  panXMm: 0,
  panYMm: 0,
};

function pixiRgbToRgba(color: number, alpha: number): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

function wallStrokeAndFillColor(wall: Wall, project: Project): { stroke: number; fill: number } {
  const profile = wall.profileId ? getProfileById(project, wall.profileId) : undefined;
  const mt = profile?.layers[0]?.materialType;
  if (!mt) {
    return { stroke: WALL_NORMAL, fill: WALL_NORMAL };
  }
  const fill = fillColor2dForMaterialType(mt);
  return { stroke: fill, fill };
}

function doorOrderMap(project: Project): ReadonlyMap<string, number> {
  const doors = project.openings
    .filter((o): o is typeof o & { wallId: string; offsetFromStartMm: number } => {
      return o.kind === "door" && o.wallId != null && o.offsetFromStartMm != null;
    })
    .sort((a, b) => {
      if (a.wallId !== b.wallId) {
        return a.wallId.localeCompare(b.wallId);
      }
      if (a.offsetFromStartMm !== b.offsetFromStartMm) {
        return a.offsetFromStartMm - b.offsetFromStartMm;
      }
      return a.id.localeCompare(b.id);
    });
  const out = new Map<string, number>();
  for (let i = 0; i < doors.length; i++) {
    out.set(doors[i]!.id, i + 1);
  }
  return out;
}

function windowOrderMap(project: Project): ReadonlyMap<string, number> {
  const windows = project.openings
    .filter((o): o is typeof o & { wallId: string; offsetFromStartMm: number } => {
      return o.kind === "window" && o.wallId != null && o.offsetFromStartMm != null;
    })
    .sort((a, b) => {
      if (a.wallId !== b.wallId) {
        return a.wallId.localeCompare(b.wallId);
      }
      if (a.offsetFromStartMm !== b.offsetFromStartMm) {
        return a.offsetFromStartMm - b.offsetFromStartMm;
      }
      return a.id.localeCompare(b.id);
    });
  const out = new Map<string, number>();
  for (let i = 0; i < windows.length; i++) {
    out.set(windows[i]!.id, i + 1);
  }
  return out;
}

function openingLabelWorldMm(
  wall: Wall,
  opening: Opening,
  allWalls: readonly Wall[],
  zoomPixelsPerMm: number,
): { x: number; y: number } {
  const center = openingCenterOnWallMm(wall, opening);
  const { nx, ny } = exteriorNormalForWallLabelMm(wall, allWalls, allWalls);
  const halfT = wall.thicknessMm / 2;
  const outsetMm = halfT + REPORT_OPENING_LABEL_CLEARANCE_BEYOND_FACE_MM / Math.max(0.01, zoomPixelsPerMm);
  return { x: center.x + nx * outsetMm, y: center.y + ny * outsetMm };
}

function labelRotationDegFromWall(dx: number, dy: number): number {
  const rad = openingPlanLabelRotationRad(dx, dy, NEUTRAL_VT);
  return (rad * 180) / Math.PI;
}

function pushDoorSwingPrimitives(
  out: ReportPrimitive[],
  wall: Wall,
  leftAlongMm: number,
  widthMm: number,
  swing: "in_right" | "in_left" | "out_right" | "out_left",
): void {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return;
  }
  const ux = dx / len;
  const uy = dy / len;
  const hingeAtStart = swing.endsWith("left");
  const inward = swing.startsWith("in");
  const sideSign = inward ? -1 : 1;
  const leafLenMm = Math.max(120, widthMm);
  const hingeAlong = hingeAtStart ? leftAlongMm : leftAlongMm + widthMm;
  const closedAlongDir = hingeAtStart ? 1 : -1;

  const hingePt = wallCenterlinePointAtAlongMm(wall, hingeAlong);
  if (!hingePt) {
    return;
  }
  const hx = hingePt.x;
  const hy = hingePt.y;
  const cdx = ux * closedAlongDir;
  const cdy = uy * closedAlongDir;
  const cex = hx + cdx * leafLenMm;
  const cey = hy + cdy * leafLenMm;
  const odx = sideSign > 0 ? -cdy : cdy;
  const ody = sideSign > 0 ? cdx : -cdx;
  const oex = hx + odx * leafLenMm;
  const oey = hy + ody * leafLenMm;

  const leafColor = pixiRgbToRgba(DOOR_ARC, 0.96);

  out.push({
    kind: "line",
    x1Mm: hx,
    y1Mm: hy,
    x2Mm: oex,
    y2Mm: oey,
    strokeMm: DOOR_LINE_STROKE_MM,
  });

  const hingeR = 2.1;
  const circlePts: { x: number; y: number }[] = [];
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    circlePts.push({ x: hx + hingeR * Math.cos(a), y: hy + hingeR * Math.sin(a) });
  }
  out.push({
    kind: "polyline",
    pointsMm: circlePts,
    closed: true,
    strokeMm: 0,
    fill: leafColor,
  });

  const turn = sideSign > 0 ? Math.PI / 2 : -Math.PI / 2;
  const steps = 20;
  const arcPts: { x: number; y: number }[] = [];
  arcPts.push({ x: cex, y: cey });
  for (let i = 1; i <= steps; i++) {
    const a = (turn * i) / steps;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const vx = cdx * leafLenMm;
    const vy = cdy * leafLenMm;
    const rx = vx * ca - vy * sa;
    const ry = vx * sa + vy * ca;
    arcPts.push({ x: hx + rx, y: hy + ry });
  }
  out.push({
    kind: "polyline",
    pointsMm: arcPts,
    closed: false,
    strokeMm: DOOR_ARC_STROKE_MM,
    muted: true,
  });
}

export interface FloorPlanReportBuild {
  readonly primitives: readonly ReportPrimitive[];
  readonly messages: readonly string[];
}

/**
 * Стены, проёмы и подписи Д-n / OK_n — та же геометрия и порядок, что на 2D-плане для видимых слоёв.
 */
export function buildFloorPlanReportPrimitives(project: Project): FloorPlanReportBuild {
  const messages: string[] = [];
  const layerIds = layerIdsForSnapGeometry(project);
  const walls = project.walls.filter((w) => layerIds.has(w.layerId));
  const wallById = new Map(walls.map((w) => [w.id, w] as const));

  if (walls.length === 0) {
    return { primitives: [], messages: ["Нет стен на активном и видимых слоях плана этажа."] };
  }

  const out: ReportPrimitive[] = [];
  const fillAlpha = 0.92;

  for (const w of walls) {
    const profile = w.profileId ? getProfileById(project, w.profileId) : undefined;
    const strips =
      profile != null ? resolveWallProfileLayerStripsForWallVisualization(w.thicknessMm, profile) : null;

    const sx = w.start.x;
    const sy = w.start.y;
    const ex = w.end.x;
    const ey = w.end.y;

    if (strips != null && strips.length >= 1) {
      let acc = -w.thicknessMm / 2;
      for (const strip of strips) {
        const off0 = acc;
        const off1 = acc + strip.thicknessMm;
        acc = off1;
        const corners = quadCornersAlongWallMm(sx, sy, ex, ey, off0, off1);
        if (!corners) {
          continue;
        }
        const fillC = fillColor2dForMaterialType(strip.materialType);
        const fa = plan2dLayerFillAlpha(strip.materialType, fillAlpha);
        out.push({
          kind: "polyline",
          pointsMm: [...corners],
          closed: true,
          strokeMm: WALL_EDGE_STROKE_MM,
          fill: pixiRgbToRgba(fillC, fa),
        });
      }
      acc = -w.thicknessMm / 2;
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.hypot(dx, dy);
      if (len > 1e-6) {
        const px = -dy / len;
        const py = dx / len;
        for (let i = 0; i < strips.length - 1; i++) {
          acc += strips[i]!.thicknessMm;
          const off = acc;
          const x1 = sx + px * off;
          const y1 = sy + py * off;
          const x2 = ex + px * off;
          const y2 = ey + py * off;
          out.push({
            kind: "line",
            x1Mm: x1,
            y1Mm: y1,
            x2Mm: x2,
            y2Mm: y2,
            strokeMm: SEAM_STROKE_MM,
            muted: true,
          });
        }
      }
    } else {
      const a = worldLineWallSimple(w, project);
      out.push(...a);
    }
  }

  for (const o of project.openings) {
    const wall = wallById.get(o.wallId ?? "");
    if (!wall || o.offsetFromStartMm == null) {
      continue;
    }
    const corners = openingSlotCornersMm(wall, o.offsetFromStartMm, o.widthMm, 1);
    if (!corners) {
      continue;
    }
    const empty = o.isEmptyOpening === true;
    const fillCol = empty ? OPENING_SLOT_EMPTY : OPENING_SLOT_FILL;
    const fillA = empty ? 0.55 : 0.38;
    out.push({
      kind: "polyline",
      pointsMm: [...corners],
      closed: true,
      strokeMm: OPENING_STROKE_MM,
      fill: pixiRgbToRgba(fillCol, fillA),
    });

    if (empty) {
      const mid = {
        x: (corners[0]!.x + corners[2]!.x) / 2,
        y: (corners[0]!.y + corners[2]!.y) / 2,
      };
      out.push({
        kind: "line",
        x1Mm: mid.x - 40,
        y1Mm: mid.y - 40,
        x2Mm: mid.x + 40,
        y2Mm: mid.y + 40,
        strokeMm: 0.25,
        muted: true,
      });
    }
    if (!empty && o.kind === "door") {
      pushDoorSwingPrimitives(out, wall, o.offsetFromStartMm, o.widthMm, o.doorSwing ?? "in_right");
    }
  }

  const doorNum = doorOrderMap(project);
  const winNum = windowOrderMap(project);
  const allWalls = project.walls;
  const labelFs = 3.15;
  const lineGap = 1.05;

  for (const o of project.openings) {
    if (o.wallId == null || o.offsetFromStartMm == null) {
      continue;
    }
    const wall = allWalls.find((w) => w.id === o.wallId);
    if (!wall || !layerIds.has(wall.layerId)) {
      continue;
    }
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    if (Math.hypot(dx, dy) < 1e-9) {
      continue;
    }

    const pos = openingLabelWorldMm(wall, o, allWalls, 1);
    const rotDeg = labelRotationDegFromWall(dx, dy);
    const wMm = Math.round(o.widthMm);
    const hMm = Math.round(o.heightMm);

    if (o.kind === "door") {
      const num = doorNum.get(o.id) ?? 0;
      const line1 = `Д-${num}`;
      const line2 = `${wMm}/${hMm}`;
      out.push({
        kind: "textBlock",
        xMm: pos.x,
        yMm: pos.y,
        lines: [line1, line2],
        fontSizeMm: labelFs,
        lineHeightMm: labelFs + lineGap,
        anchor: "middle",
        rotationDeg: rotDeg,
      });
    } else if (o.kind === "window") {
      const num = winNum.get(o.id) ?? 0;
      const line1 = `OK_${num}`;
      const line2 = `${wMm}/${hMm}`;
      out.push({
        kind: "textBlock",
        xMm: pos.x,
        yMm: pos.y,
        lines: [line1, line2],
        fontSizeMm: labelFs,
        lineHeightMm: labelFs + lineGap,
        anchor: "middle",
        rotationDeg: rotDeg,
      });
    }
  }

  return { primitives: out, messages };
}

function worldLineWallSimple(wall: Wall, project: Project): ReportPrimitive[] {
  const corners = quadCornersAlongWallMm(
    wall.start.x,
    wall.start.y,
    wall.end.x,
    wall.end.y,
    -wall.thicknessMm / 2,
    wall.thicknessMm / 2,
  );
  if (!corners) {
    return [];
  }
  const { stroke: strokeCol } = wallStrokeAndFillColor(wall, project);
  return [
    {
      kind: "polyline",
      pointsMm: [...corners],
      closed: true,
      strokeMm: WALL_EDGE_STROKE_MM,
      fill: pixiRgbToRgba(strokeCol, 0.95),
    },
  ];
}
