import type { Point2D } from "./types";

/** Пороги в экранных пикселях (стабильны при zoom). */
export const SNAP_VERTEX_PX = 14;
export const SNAP_EDGE_PX = 10;
export const SNAP_GRID_PX = 8;

export type SnapKind = "vertex" | "edge" | "grid" | "none";

export interface SnapSettings2d {
  readonly snapToVertex: boolean;
  readonly snapToEdge: boolean;
  readonly snapToGrid: boolean;
}

export interface SnapResult2d {
  readonly point: Point2D;
  readonly kind: SnapKind;
  /** Стена, к кромке которой привязались (edge). */
  readonly wallId?: string;
  /** Линия чертежа (edge). */
  readonly planLineId?: string;
}
