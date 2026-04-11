import { getLayerById, sortLayersByOrder } from "./layerOps";
import type { Layer } from "./layer";
import type { Project } from "./project";
import type { SlabEntity } from "./slab";
import type { Wall } from "./wall";

/** Результат расчёта вертикального положения одного слоя в стеке (мм от нуля проекта). */
export interface LayerVerticalSlice {
  readonly computedBaseMm: number;
  readonly computedTopMm: number;
  /** Максимальный верх по геометрии слоя или null, если нет учитываемых объектов. */
  readonly geometryTopMm: number | null;
}

function layerLevelMode(layer: Layer): Layer["levelMode"] {
  return layer.levelMode === "relativeToBelow" ? "relativeToBelow" : "absolute";
}

function wallBottomForStackMm(wall: Wall, layerComputedBaseMm: number): number {
  if (wall.baseElevationMm != null && Number.isFinite(wall.baseElevationMm)) {
    return wall.baseElevationMm;
  }
  return layerComputedBaseMm;
}

/**
 * Максимальная отметка верха по объектам слоя (мм). Учитываются стены, плиты, ленты, сваи.
 * Для стен низ = baseElevationMm или расчётный низ слоя.
 */
export function maxGeometryTopMmForLayer(
  project: Project,
  layerId: string,
  layerComputedBaseMm: number,
): number | null {
  let maxTop = Number.NEGATIVE_INFINITY;
  let any = false;

  for (const w of project.walls) {
    if (w.layerId !== layerId) {
      continue;
    }
    any = true;
    const b = wallBottomForStackMm(w, layerComputedBaseMm);
    maxTop = Math.max(maxTop, b + w.heightMm);
  }

  for (const s of project.slabs) {
    if (s.layerId !== layerId) {
      continue;
    }
    any = true;
    maxTop = Math.max(maxTop, layerComputedBaseMm + s.levelMm);
  }

  for (const st of project.foundationStrips) {
    if (st.layerId !== layerId) {
      continue;
    }
    any = true;
    maxTop = Math.max(maxTop, layerComputedBaseMm);
  }

  for (const p of project.foundationPiles) {
    if (p.layerId !== layerId || p.pileKind === "screw") {
      continue;
    }
    any = true;
    maxTop = Math.max(maxTop, layerComputedBaseMm + p.levelMm);
  }

  return any ? maxTop : null;
}

/**
 * Упорядоченный список слоёв (снизу вверх по зданию) → расчётный низ/верх каждого.
 *
 * Формула для относительного режима: computedBase = top(слой ниже) + offsetFromBelowMm.
 * Верх: max(геометрия, computedBase + manualHeightMm).
 */
export function computeLayerVerticalStack(project: Project): ReadonlyMap<string, LayerVerticalSlice> {
  const sorted = sortLayersByOrder(project.layers);
  const map = new Map<string, LayerVerticalSlice>();

  for (let i = 0; i < sorted.length; i++) {
    const layer = sorted[i]!;
    const mode = layerLevelMode(layer);
    const offset = layer.offsetFromBelowMm;
    const manual = layer.manualHeightMm;
    const storedAbs = layer.elevationMm;

    let computedBaseMm: number;
    if (mode === "relativeToBelow" && i > 0) {
      const below = sorted[i - 1]!;
      const belowTop = map.get(below.id)!.computedTopMm;
      computedBaseMm = belowTop + offset;
    } else {
      computedBaseMm = storedAbs;
    }

    const geometryTopMm = maxGeometryTopMmForLayer(project, layer.id, computedBaseMm);
    const floorTop = computedBaseMm + manual;
    const computedTopMm = Math.max(geometryTopMm ?? Number.NEGATIVE_INFINITY, floorTop);

    map.set(layer.id, {
      computedBaseMm,
      computedTopMm,
      geometryTopMm,
    });
  }

  return map;
}

export function getLayerVerticalSlice(
  project: Project,
  layerId: string,
  stack?: ReadonlyMap<string, LayerVerticalSlice>,
): LayerVerticalSlice {
  const map = stack ?? computeLayerVerticalStack(project);
  const fallbackBase = getLayerById(project, layerId)?.elevationMm ?? 0;
  return (
    map.get(layerId) ?? {
      computedBaseMm: fallbackBase,
      computedTopMm: fallbackBase,
      geometryTopMm: null,
    }
  );
}

/** Низ стены в мировых мм: явный baseElevationMm или расчётный низ слоя. */
export function wallWorldBottomMmFromMap(
  wall: Wall,
  verticalById: ReadonlyMap<string, LayerVerticalSlice>,
  project: Project,
): number {
  if (wall.baseElevationMm != null && Number.isFinite(wall.baseElevationMm)) {
    return wall.baseElevationMm;
  }
  return verticalById.get(wall.layerId)?.computedBaseMm ?? getLayerById(project, wall.layerId)?.elevationMm ?? 0;
}

export function wallWorldBottomMm(wall: Wall, project: Project): number {
  return wallWorldBottomMmFromMap(wall, computeLayerVerticalStack(project), project);
}

/** Расчётный низ слоя для рендеринга (лента, сваи и т.д.). */
export function computedLayerBaseMm(project: Project, layerId: string): number {
  return getLayerVerticalSlice(project, layerId).computedBaseMm;
}

/**
 * Верх плиты в мировых мм: расчётный низ слоя + `slab.levelMm` (локальная отметка верха внутри слоя).
 * Аналогично сваям: `computedBaseMm + pile.levelMm`.
 */
export function slabWorldTopMm(
  slab: SlabEntity,
  project: Project,
  stack?: ReadonlyMap<string, LayerVerticalSlice>,
): number {
  const base = getLayerVerticalSlice(project, slab.layerId, stack).computedBaseMm;
  return base + slab.levelMm;
}

export function slabWorldBottomMm(
  slab: SlabEntity,
  project: Project,
  stack?: ReadonlyMap<string, LayerVerticalSlice>,
): number {
  return slabWorldTopMm(slab, project, stack) - slab.depthMm;
}
