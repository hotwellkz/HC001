import type { Point2D } from "../geometry/types";

/** Участок ленточного фундамента на плане (ось совпадает с линией привязки к стене). */
export interface FoundationStripSegmentEntity {
  readonly kind: "segment";
  readonly id: string;
  readonly layerId: string;
  readonly axisStart: Point2D;
  readonly axisEnd: Point2D;
  /** Единичная нормаль «наружу»; снаружи — sideOutMm, внутрь — sideInMm. */
  readonly outwardNormalX: number;
  readonly outwardNormalY: number;
  readonly depthMm: number;
  readonly sideOutMm: number;
  readonly sideInMm: number;
  readonly createdAt: string;
  /** Один контур прямоугольника — четыре стороны с одним id группы. */
  readonly placementGroupId?: string;
}

/**
 * Замкнутая ортогональная лента по осевому прямоугольнику (два клика — противоположные углы).
 * Геометрия — одно кольцо: внешний прямоугольник минус внутренний, без четырёх перекрывающихся полос.
 */
export interface FoundationStripOrthoRingEntity {
  readonly kind: "ortho_ring";
  readonly id: string;
  readonly layerId: string;
  /** Границы осевого прямоугольника (мм), совпадают с выбранными двумя углами после min/max. */
  readonly axisXminMm: number;
  readonly axisXmaxMm: number;
  readonly axisYminMm: number;
  readonly axisYmaxMm: number;
  readonly depthMm: number;
  readonly sideOutMm: number;
  readonly sideInMm: number;
  readonly createdAt: string;
}

/**
 * Произвольный замкнутый контур ленты в плане после boolean union нескольких участков.
 * Внешний контур CCW, отверстия CW (как у ortho_ring) — для 2D cut и 3D ExtrudeGeometry.
 */
export interface FoundationStripFootprintPolyEntity {
  readonly kind: "footprint_poly";
  readonly id: string;
  readonly layerId: string;
  readonly depthMm: number;
  readonly sideOutMm: number;
  readonly sideInMm: number;
  readonly createdAt: string;
  readonly outerRingMm: readonly Point2D[];
  readonly holeRingsMm: readonly (readonly Point2D[])[];
}

export type FoundationStripEntity =
  | FoundationStripSegmentEntity
  | FoundationStripOrthoRingEntity
  | FoundationStripFootprintPolyEntity;
