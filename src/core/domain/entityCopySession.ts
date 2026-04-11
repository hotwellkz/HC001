import type { Point2D } from "../geometry/types";
import type { SnapKind } from "../geometry/snap2d";

/** Тип сущности для универсального копирования по двум точкам и параметрам. */
export type EntityCopyTarget =
  | { readonly kind: "wall"; readonly id: string }
  | { readonly kind: "foundationPile"; readonly id: string }
  | { readonly kind: "floorBeam"; readonly id: string }
  | { readonly kind: "planLine"; readonly id: string }
  | { readonly kind: "foundationStrip"; readonly id: string }
  | { readonly kind: "slab"; readonly id: string }
  | { readonly kind: "opening"; readonly id: string };

/** Стратегия размещения копий по отрезку между первой и второй точкой (мировые мм). */
export type EntityCopyStrategyId = "increment" | "distribution" | "distributionMinusOne";

/**
 * Режим копирования: точка привязки на объекте → вторая точка (конец отрезка) → модалка «Параметры».
 */

/** Маркер опорной точки для отрисовки в режиме копирования (см. entityCopySnapSystem). */
export interface EntityCopySessionSnapMarker {
  readonly world: Point2D;
  readonly visual: "key" | "vertex" | "edgeMid" | "center" | "intersection" | "grid";
  readonly active: boolean;
}

export interface EntityCopySession {
  readonly target: EntityCopyTarget;
  readonly phase: "pickAnchor" | "pickTarget";
  readonly worldAnchorStart: Point2D | null;
  /** Для проёма: проекция точки привязки на ось стены (мм от start стены, без усечения). */
  readonly openingAnchorAlongWallMm: number | null;
  readonly previewTargetWorldMm: Point2D | null;
  /** Согласованная с привязкой позиция курсора (крестик / ЛКМ), мировые мм. */
  readonly resolvedCursorWorldMm: Point2D | null;
  readonly snapMarkers: readonly EntityCopySessionSnapMarker[];
  readonly activeSnapVisual: EntityCopySessionSnapMarker["visual"] | "none";
  readonly lastSnapKind: SnapKind | null;
  /** Как у переноса стены: Shift фиксирует направление второй точки. */
  readonly shiftDirectionLockUnit: Point2D | null;
  readonly angleSnapLockedDeg: number | null;
  readonly shiftLockReferenceMm: Point2D | null;
}

/** Данные для модалки после выбора второй точки (сессия копирования снимается, остаётся только модалка). */
export interface EntityCopyParamsModalState {
  readonly target: EntityCopyTarget;
  readonly worldAnchorStart: Point2D;
  readonly worldTargetEnd: Point2D;
  readonly openingAnchorAlongWallMm: number | null;
}
