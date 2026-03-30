import { describe, expect, it } from "vitest";

import type { Wall } from "@/core/domain/wall";

import {
  exteriorNormalForWallLabelMm,
  tryOrthogonalRectangleExteriorNormalsMm,
} from "./wallLabelExteriorNormalMm";

function wall(
  id: string,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  thicknessMm = 200,
): Wall {
  return {
    id,
    layerId: "L",
    profileId: "P",
    start: { x: sx, y: sy },
    end: { x: ex, y: ey },
    thicknessMm,
    heightMm: 2800,
    markLabel: id,
  };
}

describe("tryOrthogonalRectangleExteriorNormalsMm", () => {
  it("даёт наружные нормали для прямоугольника (CCW по периметру, Y вверх)", () => {
    const xmin = 0;
    const xmax = 5000;
    const ymin = 0;
    const ymax = 3000;
    const walls: Wall[] = [
      wall("b", xmin, ymin, xmax, ymin),
      wall("r", xmax, ymin, xmax, ymax),
      wall("t", xmax, ymax, xmin, ymax),
      wall("l", xmin, ymax, xmin, ymin),
    ];
    const m = tryOrthogonalRectangleExteriorNormalsMm(walls);
    expect(m).not.toBeNull();
    const nb = m!.get("b")!;
    const nr = m!.get("r")!;
    const nt = m!.get("t")!;
    const nl = m!.get("l")!;
    expect(nb.ny).toBeLessThan(0);
    expect(nr.nx).toBeGreaterThan(0);
    expect(nt.ny).toBeGreaterThan(0);
    expect(nl.nx).toBeLessThan(0);
  });
});

describe("exteriorNormalForWallLabelMm", () => {
  it("использует прямоугольник, если четыре стены с подписями образуют bbox", () => {
    const xmin = 0;
    const xmax = 4000;
    const ymin = 0;
    const ymax = 2000;
    const walls: Wall[] = [
      wall("b", xmin, ymin, xmax, ymin),
      wall("r", xmax, ymin, xmax, ymax),
      wall("t", xmax, ymax, xmin, ymax),
      wall("l", xmin, ymax, xmin, ymin),
    ];
    const w = walls[0]!;
    const n = exteriorNormalForWallLabelMm(w, walls, walls);
    expect(n.ny).toBeLessThan(-0.5);
  });
});
