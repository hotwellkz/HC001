import { describe, expect, it } from "vitest";

import { clampAlongWallRangeMm, pointInPolygonMm } from "./wallLumberPlan2dGeometry";

describe("clampAlongWallRangeMm", () => {
  it("обрезает выход за [0, L]", () => {
    expect(clampAlongWallRangeMm(-10, 5000, 4000)).toEqual({ lo: 0, hi: 4000 });
    expect(clampAlongWallRangeMm(0, 4500, 4000)).toEqual({ lo: 0, hi: 4000 });
  });
  it("сохраняет валидный интервал", () => {
    expect(clampAlongWallRangeMm(100, 3900, 4000)).toEqual({ lo: 100, hi: 3900 });
  });
  it("возвращает null для вырожденного отрезка", () => {
    expect(clampAlongWallRangeMm(100, 100, 4000)).toBeNull();
  });
});

describe("pointInPolygonMm", () => {
  const unit = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  it("внутри квадрата", () => {
    expect(pointInPolygonMm(0.5, 0.5, unit)).toBe(true);
  });
  it("снаружи", () => {
    expect(pointInPolygonMm(1.5, 0.5, unit)).toBe(false);
  });
});
