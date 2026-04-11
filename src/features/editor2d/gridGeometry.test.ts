import { describe, expect, it } from "vitest";

import { buildViewportTransform } from "./viewportTransforms";
import { buildScreenGridLines, GRID_MAJOR_STEP_MM, isMajorGridWorldMm } from "./gridGeometry";

describe("isMajorGridWorldMm", () => {
  it("считает кратные major шагу от origin", () => {
    expect(isMajorGridWorldMm(0, 0, GRID_MAJOR_STEP_MM)).toBe(true);
    expect(isMajorGridWorldMm(1000, 0, GRID_MAJOR_STEP_MM)).toBe(true);
    expect(isMajorGridWorldMm(500, 0, GRID_MAJOR_STEP_MM)).toBe(false);
  });

  it("учитывает смещение origin", () => {
    expect(isMajorGridWorldMm(100, 100, GRID_MAJOR_STEP_MM)).toBe(true);
    expect(isMajorGridWorldMm(150, 100, GRID_MAJOR_STEP_MM)).toBe(false);
  });
});

describe("buildScreenGridLines", () => {
  it("помечает часть линий как major (кратные 1000 мм), часть как minor", () => {
    const t = buildViewportTransform(400, 300, 0, 0, 0.5);
    const lines = buildScreenGridLines(400, 300, t, 500, { x: 0, y: 0 }, GRID_MAJOR_STEP_MM);
    expect(lines.length).toBeGreaterThan(4);
    expect(lines.every((l) => l.kind === "major" || l.kind === "minor")).toBe(true);
    const majors = lines.filter((l) => l.kind === "major");
    const minors = lines.filter((l) => l.kind === "minor");
    expect(majors.length).toBeGreaterThan(0);
    expect(minors.length).toBeGreaterThan(0);
  });
});
