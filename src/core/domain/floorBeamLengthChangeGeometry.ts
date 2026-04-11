import type { Point2D } from "../geometry/types";
import type { FloorBeamEntity } from "./floorBeam";
import type { WallEndSide } from "./wallJoint";
import { MIN_WALL_SEGMENT_LENGTH_MM } from "./wallOps";

export function floorBeamRefLengthMm(beam: FloorBeamEntity): number {
  return Math.hypot(beam.refEndMm.x - beam.refStartMm.x, beam.refEndMm.y - beam.refStartMm.y);
}

export function floorBeamRefAxisUnitStartToEnd(
  beam: FloorBeamEntity,
): { readonly ux: number; readonly uy: number; readonly L: number } {
  const L = floorBeamRefLengthMm(beam);
  if (L < 1e-9) {
    return { ux: 1, uy: 0, L: 0 };
  }
  const ux = (beam.refEndMm.x - beam.refStartMm.x) / L;
  const uy = (beam.refEndMm.y - beam.refStartMm.y) / L;
  return { ux, uy, L };
}

export function fixedRefEndpointForFloorBeamLengthChange(
  beam: FloorBeamEntity,
  movingEnd: WallEndSide,
): Point2D {
  return movingEnd === "end" ? { x: beam.refStartMm.x, y: beam.refStartMm.y } : { x: beam.refEndMm.x, y: beam.refEndMm.y };
}

export function axisFromFixedTowardMovingFloorBeam(
  beam: FloorBeamEntity,
  movingEnd: WallEndSide,
): { readonly ux: number; readonly uy: number } {
  const { ux, uy, L } = floorBeamRefAxisUnitStartToEnd(beam);
  if (L < 1e-9) {
    return { ux: 1, uy: 0 };
  }
  return movingEnd === "end" ? { ux, uy } : { ux: -ux, uy: -uy };
}

/**
 * Новая длина опорной линии построения; сечение, режим привязки, roll и уровень не трогаются.
 */
export function floorBeamWithMovedRefEndAtLength(
  beam: FloorBeamEntity,
  movingEnd: WallEndSide,
  newLengthMm: number,
  minLenMm: number = MIN_WALL_SEGMENT_LENGTH_MM,
): FloorBeamEntity | null {
  const { ux, uy, L: L0 } = floorBeamRefAxisUnitStartToEnd(beam);
  if (L0 < 1e-9) {
    return null;
  }
  const L = Math.max(minLenMm, newLengthMm);
  if (movingEnd === "end") {
    return {
      ...beam,
      refEndMm: {
        x: beam.refStartMm.x + ux * L,
        y: beam.refStartMm.y + uy * L,
      },
    };
  }
  return {
    ...beam,
    refStartMm: {
      x: beam.refEndMm.x - ux * L,
      y: beam.refEndMm.y - uy * L,
    },
  };
}
