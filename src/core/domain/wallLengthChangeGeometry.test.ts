import { describe, expect, it } from "vitest";

import type { Wall } from "./wall";
import {
  axisFromFixedTowardMoving,
  fixedEndpointForLengthChange,
  lengthFromSnappedPointForWallLengthEdit,
  wallAxisUnitStartToEnd,
  wallWithMovedEndAtLength,
} from "./wallLengthChangeGeometry";
import { MIN_WALL_SEGMENT_LENGTH_MM } from "./wallOps";

function w(): Wall {
  return {
    id: "w1",
    layerId: "L",
    start: { x: 0, y: 0 },
    end: { x: 3000, y: 0 },
    thicknessMm: 200,
    heightMm: 2800,
    baseElevationMm: 0,
  };
}

describe("wallLengthChangeGeometry", () => {
  it("wallAxisUnitStartToEnd", () => {
    const { ux, uy, L } = wallAxisUnitStartToEnd(w());
    expect(L).toBe(3000);
    expect(ux).toBe(1);
    expect(uy).toBe(0);
  });

  it("удлиняет с конца, начало неподвижно", () => {
    const n = wallWithMovedEndAtLength(w(), "end", 3200)!;
    expect(n.start).toEqual({ x: 0, y: 0 });
    expect(n.end.x).toBeCloseTo(3200);
    expect(n.end.y).toBeCloseTo(0);
  });

  it("удлиняет с начала, конец неподвижно", () => {
    const n = wallWithMovedEndAtLength(w(), "start", 3200)!;
    expect(n.end).toEqual({ x: 3000, y: 0 });
    expect(n.start.x).toBeCloseTo(-200);
    expect(n.start.y).toBeCloseTo(0);
  });

  it("не даёт длину меньше минимума", () => {
    const n = wallWithMovedEndAtLength(w(), "end", 0.1)!;
    const L = Math.hypot(n.end.x - n.start.x, n.end.y - n.start.y);
    expect(L).toBeGreaterThanOrEqual(MIN_WALL_SEGMENT_LENGTH_MM - 1e-6);
  });

  it("lengthFromSnappedPointForWallLengthEdit проецирует на ось", () => {
    const fixed = { x: 0, y: 0 };
    const L = lengthFromSnappedPointForWallLengthEdit(fixed, 1, 0, { x: 5000, y: 900 }, MIN_WALL_SEGMENT_LENGTH_MM);
    expect(L).toBe(5000);
  });

  it("fixedEndpoint и ось согласованы с movingEnd", () => {
    const wall = w();
    expect(fixedEndpointForLengthChange(wall, "end")).toEqual(wall.start);
    const { ux, uy } = axisFromFixedTowardMoving(wall, "end");
    expect(ux).toBe(1);
    expect(uy).toBe(0);
    const f2 = fixedEndpointForLengthChange(wall, "start");
    expect(f2).toEqual(wall.end);
    const a2 = axisFromFixedTowardMoving(wall, "start");
    expect(a2.ux).toBe(-1);
    expect(a2.uy).toBeCloseTo(0, 10);
  });
});
