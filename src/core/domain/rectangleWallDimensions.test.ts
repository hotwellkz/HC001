import { describe, expect, it } from "vitest";

import { createEmptyProject } from "./projectFactory";
import type { Wall } from "./wall";
import {
  appendRectangleOverallDimensions,
  outerAxisAlignedBoundingBoxOfWallsMm,
} from "./rectangleWallDimensions";

function wall(
  id: string,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  t: number,
  placementGroupId?: string,
): Wall {
  const now = new Date().toISOString();
  return {
    id,
    layerId: "L1",
    start: { x: sx, y: sy },
    end: { x: ex, y: ey },
    thicknessMm: t,
    heightMm: 2500,
    placementGroupId,
    createdAt: now,
    updatedAt: now,
  };
}

describe("rectangleWallDimensions", () => {
  it("outerAxisAlignedBoundingBoxOfWallsMm: габарит по полосам, не по осям", () => {
    const t = 174;
    const minX = 0;
    const minY = 0;
    const maxX = 5000;
    const maxY = 3000;
    const h = t / 2;
    const walls: Wall[] = [
      wall("b", minX - h, minY, maxX + h, minY, t, "g"),
      wall("r", maxX, minY - h, maxX, maxY + h, t, "g"),
      wall("t", maxX + h, maxY, minX - h, maxY, t, "g"),
      wall("l", minX, maxY + h, minX, minY - h, t, "g"),
    ];
    const box = outerAxisAlignedBoundingBoxOfWallsMm(walls);
    expect(box).not.toBeNull();
    if (!box) {
      return;
    }
    expect(box.minX).toBeCloseTo(minX - t / 2, 3);
    expect(box.maxX).toBeCloseTo(maxX + t / 2, 3);
    expect(box.minY).toBeCloseTo(minY - t / 2, 3);
    expect(box.maxY).toBeCloseTo(maxY + t / 2, 3);
    expect(box.maxX - box.minX).toBeCloseTo(maxX - minX + t, 3);
    expect(box.maxY - box.minY).toBeCloseTo(maxY - minY + t, 3);
  });

  it("appendRectangleOverallDimensions добавляет 2 размера с wallIds и placementGroupId", () => {
    const t = 100;
    const walls = [
      wall("b", -50, 0, 5050, 0, t, "grp"),
      wall("r", 5000, -50, 5000, 3050, t, "grp"),
      wall("t", 5050, 3000, -50, 3000, t, "grp"),
      wall("l", 0, 3050, 0, -50, t, "grp"),
    ];
    const base = createEmptyProject();
    const lid = base.activeLayerId;
    const wallsOnLayer = walls.map((w) => ({ ...w, layerId: lid }));
    const p1 = { ...base, walls: wallsOnLayer };
    const next = appendRectangleOverallDimensions(p1, wallsOnLayer, "grp");
    expect(next.dimensions.length).toBe(2);
    const hDim = next.dimensions.find((d) => d.kind === "rectangle_outer_horizontal");
    const vDim = next.dimensions.find((d) => d.kind === "rectangle_outer_vertical");
    expect(hDim?.placementGroupId).toBe("grp");
    expect(vDim?.placementGroupId).toBe("grp");
    expect(hDim?.wallIds?.length).toBe(4);
    expect(hDim?.textValueMm).toBe(Math.round(5100));
    expect(vDim?.textValueMm).toBe(Math.round(3100));
  });
});
