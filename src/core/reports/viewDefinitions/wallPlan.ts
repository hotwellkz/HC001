import { buildFloorPlanReportPrimitives } from "../../floorPlan/buildFloorPlanReportPrimitives";
import { buildFloorPlanRoomDecorLayers } from "../../floorPlan/floorPlanRoomDecoration";
import {
  computeFloorPlanRoomLoops,
  diagnoseFloorPlanRoomDetection,
  formatFloorPlanRoomDetectionForConsole,
} from "../../floorPlan/floorPlanRoomsFromWalls";
import { buildGklPartitionDoorPositionDimensions } from "../../floorPlan/floorPlanGklDoorDimensions";
import type { Project } from "../../domain/project";
import { layerIdsForSnapGeometry } from "../../geometry/snap2dPrimitives";
import type { Point2D } from "../../geometry/types";
import { outerAxisAlignedBoundingBoxOfWallsMm } from "../../domain/rectangleWallDimensions";
import { buildWallPlanOutlineDimensionPrimitives } from "../dimensionRules/wallPlanDimensions";
import type { ReportPrimitive } from "../types";

export interface WallPlanWorldBuild {
  readonly primitives: readonly ReportPrimitive[];
  readonly worldBounds: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } | null;
  readonly messages: readonly string[];
  /** Устарело: раньше считалось по union комнат; оставлено для совместимости API. */
  readonly roomCount: number;
}

function expandBounds(
  b: { minX: number; minY: number; maxX: number; maxY: number } | null,
  p: Point2D,
): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!b) {
    return { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
  }
  return {
    minX: Math.min(b.minX, p.x),
    minY: Math.min(b.minY, p.y),
    maxX: Math.max(b.maxX, p.x),
    maxY: Math.max(b.maxY, p.y),
  };
}

function boundsFromPoints(points: readonly Point2D[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (points.length === 0) {
    return null;
  }
  let b = expandBounds(null, points[0]!);
  for (let i = 1; i < points.length; i++) {
    b = expandBounds(b, points[i]!);
  }
  return b;
}

function unionBounds(
  a: { minX: number; minY: number; maxX: number; maxY: number } | null,
  b: { minX: number; minY: number; maxX: number; maxY: number } | null,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

function boundsFromPrimitives(prims: readonly ReportPrimitive[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  let b: ReturnType<typeof boundsFromPoints> = null;
  for (const p of prims) {
    switch (p.kind) {
      case "line":
        b = unionBounds(b, boundsFromPoints([{ x: p.x1Mm, y: p.y1Mm }, { x: p.x2Mm, y: p.y2Mm }]));
        break;
      case "polyline":
        b = unionBounds(b, boundsFromPoints(p.pointsMm));
        break;
      case "text":
        b = unionBounds(b, expandBounds(null, { x: p.xMm, y: p.yMm }));
        break;
      case "textBlock": {
        const n = p.lines.length;
        const lh = p.lineHeightMm;
        const fs = p.fontSizeMm;
        const halfH = ((n - 1) * lh + fs) * 0.52;
        const halfW = Math.max(...p.lines.map((l) => l.length), 1) * fs * 0.42;
        b = unionBounds(b, {
          minX: p.xMm - halfW,
          minY: p.yMm - halfH,
          maxX: p.xMm + halfW,
          maxY: p.yMm + halfH,
        });
        break;
      }
      case "dimensionLine":
        b = unionBounds(
          b,
          boundsFromPoints([
            { x: p.anchor1Xmm, y: p.anchor1Ymm },
            { x: p.anchor2Xmm, y: p.anchor2Ymm },
            { x: p.labelXmm, y: p.labelYmm },
          ]),
        );
        break;
      default:
        break;
    }
  }
  return b;
}

/**
 * План этажа: та же 2D-геометрия, что на вкладке плана (полосы стен, проёмы, дуги дверей, подписи),
 * плюс габаритные размеры по внешнему bbox стен.
 */
export function buildWallPlanWorld(project: Project): WallPlanWorldBuild {
  const layerIds = layerIdsForSnapGeometry(project);
  const walls = project.walls.filter((w) => layerIds.has(w.layerId));

  const built = buildFloorPlanReportPrimitives(project);
  const mergedMessages = [...built.messages];

  if (walls.length === 0) {
    return {
      primitives: [],
      worldBounds: null,
      messages: mergedMessages,
      roomCount: 0,
    };
  }

  const roomLoops = computeFloorPlanRoomLoops(project, walls);
  if (
    import.meta.env.DEV &&
    typeof localStorage !== "undefined" &&
    localStorage.getItem("sipDebugFloorPlanRooms") === "1"
  ) {
    mergedMessages.push(formatFloorPlanRoomDetectionForConsole(diagnoseFloorPlanRoomDetection(project)));
  }
  if (roomLoops.length === 0) {
    mergedMessages.push(
      "Замкнутые помещения не найдены по контуру стен — заливки и внутренние размеры комнат не построены.",
    );
  }
  const roomDecor = buildFloorPlanRoomDecorLayers(roomLoops);
  const gklDoorDims = buildGklPartitionDoorPositionDimensions(project, walls, roomLoops);

  const ob = outerAxisAlignedBoundingBoxOfWallsMm(walls);
  const outlineDims = ob != null ? [...buildWallPlanOutlineDimensionPrimitives(ob)] : [];

  const primitives: ReportPrimitive[] = [
    ...roomDecor.fills,
    ...built.primitives,
    ...roomDecor.abovePlan,
    ...gklDoorDims,
    ...outlineDims,
  ];

  let worldBounds = boundsFromPrimitives(primitives);
  worldBounds = unionBounds(worldBounds, ob);

  return {
    primitives,
    worldBounds,
    messages: mergedMessages,
    roomCount: roomLoops.length,
  };
}
