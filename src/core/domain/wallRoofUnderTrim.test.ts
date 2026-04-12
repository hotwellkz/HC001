import { describe, expect, it } from "vitest";

import { createDemoProject } from "./demoProject";
import {
  canShowWallTrimUnderRoofMenu,
  computeWallRoofUnderTrimDraft,
  effectiveWallLayoutHeightMm,
  minWallTopHeightAboveBaseInAlongSpanMm,
  roofTrimMeshPolylineMm,
} from "./wallRoofUnderTrim";

describe("wallRoofUnderTrim", () => {
  it("без крыши — подрезка недоступна", () => {
    const p = createDemoProject();
    const w = p.walls[0]!;
    expect(computeWallRoofUnderTrimDraft(w, { ...p, roofPlanes: [] })).toBeNull();
    expect(canShowWallTrimUnderRoofMenu(w, { ...p, roofPlanes: [] })).toBe(false);
  });

  it("effectiveWallLayoutHeightMm — габарит стены (после подрезки = max по торцам)", () => {
    const w = {
      id: "w",
      layerId: "l",
      start: { x: 0, y: 0 },
      end: { x: 3000, y: 0 },
      thicknessMm: 200,
      heightMm: 2800,
      roofUnderTrim: { roofPlaneId: "r1", heightAtStartMm: 2800, heightAtEndMm: 2600 },
    };
    expect(effectiveWallLayoutHeightMm(w)).toBe(2800);
  });

  it("minWallTopHeightAboveBaseInAlongSpanMm — минимум по столбцу (вершина профиля внутри отрезка)", () => {
    const w = {
      id: "w",
      layerId: "l",
      start: { x: 0, y: 0 },
      end: { x: 4000, y: 0 },
      thicknessMm: 200,
      heightMm: 3000,
      roofUnderTrim: {
        roofPlaneId: "r1",
        heightAtStartMm: 2500,
        heightAtEndMm: 2500,
        topProfileMm: [
          { alongMm: 0, heightMm: 2500 },
          { alongMm: 2000, heightMm: 2000 },
          { alongMm: 4000, heightMm: 2500 },
        ],
      },
    };
    expect(minWallTopHeightAboveBaseInAlongSpanMm(w, 1000, 3000, 4000)).toBe(2000);
  });

  it("roofTrimMeshPolylineMm — узлы 0…L по габариту призмы, высоты совпадают с wallTopHeightAboveBaseAtAlongMm", () => {
    const w = {
      id: "w",
      layerId: "l",
      start: { x: 0, y: 0 },
      end: { x: 4000, y: 0 },
      thicknessMm: 174,
      heightMm: 3000,
      roofUnderTrim: {
        roofPlaneId: "r1",
        heightAtStartMm: 2500,
        heightAtEndMm: 2500,
        topProfileMm: [
          { alongMm: 0, heightMm: 2500 },
          { alongMm: 2000, heightMm: 2000 },
          { alongMm: 3990, heightMm: 2480 },
        ],
      },
    };
    const L = 4000;
    const poly = roofTrimMeshPolylineMm(w, L);
    expect(poly[0]!.alongMm).toBe(0);
    expect(poly[poly.length - 1]!.alongMm).toBe(L);
    expect(poly.some((p) => Math.abs(p.alongMm - 2000) < 0.3)).toBe(true);
  });
});
