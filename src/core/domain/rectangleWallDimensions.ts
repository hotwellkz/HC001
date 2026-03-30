import type { Point2D } from "../geometry/types";
import { newEntityId } from "./ids";
import type { Dimension } from "./dimension";
import type { Project } from "./project";
import { touchProjectMeta } from "./projectFactory";
import type { Wall } from "./wall";

/** Отступ размерной линии от наружного контура коробки (мм). */
export const DEFAULT_RECT_OVERALL_DIM_OFFSET_MM = 420;
/** Небольшой вынос засечек за опорные точки (мм). */
export const DEFAULT_RECT_OVERALL_DIM_EXTENSION_OVERSHOOT_MM = 72;

function quadCornersForWallBandMm(w: Wall): Point2D[] {
  const sx = w.start.x;
  const sy = w.start.y;
  const ex = w.end.x;
  const ey = w.end.y;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return [];
  }
  const px = -dy / len;
  const py = dx / len;
  const off0 = -w.thicknessMm / 2;
  const off1 = w.thicknessMm / 2;
  return [
    { x: sx + px * off0, y: sy + py * off0 },
    { x: ex + px * off0, y: ey + py * off0 },
    { x: ex + px * off1, y: ey + py * off1 },
    { x: sx + px * off1, y: sy + py * off1 },
  ];
}

/**
 * Ось-ориентированный внешний габарит объединения полос стен (фактический контур в плане),
 * не по осям и не по внутреннему прямоугольнику.
 */
export function outerAxisAlignedBoundingBoxOfWallsMm(
  walls: readonly Wall[],
): { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let any = false;
  for (const w of walls) {
    for (const c of quadCornersForWallBandMm(w)) {
      any = true;
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x);
      maxY = Math.max(maxY, c.y);
    }
  }
  if (!any || !Number.isFinite(minX)) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

function buildRectangleOverallPair(
  bbox: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number },
  placementGroupId: string,
  wallIds: readonly string[],
  layerId: string,
): readonly Dimension[] {
  const offsetMm = DEFAULT_RECT_OVERALL_DIM_OFFSET_MM;
  const extensionOvershootMm = DEFAULT_RECT_OVERALL_DIM_EXTENSION_OVERSHOOT_MM;
  const wMm = Math.round(bbox.maxX - bbox.minX);
  const hMm = Math.round(bbox.maxY - bbox.minY);

  const hDim: Dimension = {
    id: newEntityId(),
    kind: "rectangle_outer_horizontal",
    placementGroupId,
    wallIds: [...wallIds],
    layerId,
    a: { x: bbox.minX, y: bbox.minY },
    b: { x: bbox.maxX, y: bbox.minY },
    offsetMm,
    extensionOvershootMm,
    textValueMm: wMm,
  };
  const vDim: Dimension = {
    id: newEntityId(),
    kind: "rectangle_outer_vertical",
    placementGroupId,
    wallIds: [...wallIds],
    layerId,
    a: { x: bbox.maxX, y: bbox.minY },
    b: { x: bbox.maxX, y: bbox.maxY },
    offsetMm,
    extensionOvershootMm,
    textValueMm: hMm,
  };
  return [hDim, vDim];
}

/**
 * Добавляет два габаритных размера коробки после создания 4 стен прямоугольником.
 */
export function appendRectangleOverallDimensions(
  project: Project,
  walls: readonly Wall[],
  placementGroupId: string,
): Project {
  if (walls.length !== 4 || !placementGroupId) {
    return project;
  }
  const layerId = walls[0]?.layerId;
  if (!layerId) {
    return project;
  }
  const bbox = outerAxisAlignedBoundingBoxOfWallsMm(walls);
  if (!bbox) {
    return project;
  }
  const wallIds = walls.map((w) => w.id);
  const pair = buildRectangleOverallPair(bbox, placementGroupId, wallIds, layerId);
  return touchProjectMeta({
    ...project,
    dimensions: [...project.dimensions, ...pair],
  });
}

function isRectangleOverallDimension(d: Dimension): boolean {
  return d.kind === "rectangle_outer_horizontal" || d.kind === "rectangle_outer_vertical";
}

/**
 * Обновляет или удаляет автогабариты для групп прямоугольника при изменении стен.
 */
export function syncRectangleOverallDimensions(project: Project): Project {
  const rectGroupIds = new Set<string>();
  for (const d of project.dimensions) {
    if (d.placementGroupId && isRectangleOverallDimension(d)) {
      rectGroupIds.add(d.placementGroupId);
    }
  }
  if (rectGroupIds.size === 0) {
    return project;
  }

  const kept = project.dimensions.filter((d) => !isRectangleOverallDimension(d));
  const rebuilt: Dimension[] = [];

  for (const gid of rectGroupIds) {
    const walls = project.walls.filter((w) => w.placementGroupId === gid);
    const prevH = project.dimensions.find((d) => d.placementGroupId === gid && d.kind === "rectangle_outer_horizontal");
    const prevV = project.dimensions.find((d) => d.placementGroupId === gid && d.kind === "rectangle_outer_vertical");
    const offsetMm = prevH?.offsetMm ?? prevV?.offsetMm ?? DEFAULT_RECT_OVERALL_DIM_OFFSET_MM;
    const extensionOvershootMm =
      prevH?.extensionOvershootMm ?? prevV?.extensionOvershootMm ?? DEFAULT_RECT_OVERALL_DIM_EXTENSION_OVERSHOOT_MM;

    if (walls.length !== 4) {
      continue;
    }
    const bbox = outerAxisAlignedBoundingBoxOfWallsMm(walls);
    if (!bbox) {
      continue;
    }
    const wallIds = walls.map((w) => w.id);
    const layerId = walls[0]!.layerId;
    const wMm = Math.round(bbox.maxX - bbox.minX);
    const hMm = Math.round(bbox.maxY - bbox.minY);

    rebuilt.push(
      {
        id: prevH?.id ?? newEntityId(),
        kind: "rectangle_outer_horizontal",
        placementGroupId: gid,
        wallIds: [...wallIds],
        layerId,
        a: { x: bbox.minX, y: bbox.minY },
        b: { x: bbox.maxX, y: bbox.minY },
        offsetMm,
        extensionOvershootMm,
        textValueMm: wMm,
      },
      {
        id: prevV?.id ?? newEntityId(),
        kind: "rectangle_outer_vertical",
        placementGroupId: gid,
        wallIds: [...wallIds],
        layerId,
        a: { x: bbox.maxX, y: bbox.minY },
        b: { x: bbox.maxX, y: bbox.maxY },
        offsetMm,
        extensionOvershootMm,
        textValueMm: hMm,
      },
    );
  }

  return touchProjectMeta({
    ...project,
    dimensions: [...kept, ...rebuilt],
  });
}
