import { describe, expect, it } from "vitest";

import type { Opening } from "./opening";
import type { Wall } from "./wall";
import type { WallJoint } from "./wallJoint";
import { computeCornerJointGeometry, computeTeeAbutmentGeometry } from "./wallJointGeometry";
import {
  cornerInnerOuterCornersMm,
  resolveOpeningMovePlanAnchorsMm,
  resolveOpeningMovePrimaryNeighborRefsMm,
  thicknessOfOrthogonalAdjoiningWallAtEndpointMm,
} from "./openingMovePlanAnchors";

const LID = "layer1";

function w(
  id: string,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  thicknessMm = 200,
): Wall {
  return {
    id,
    layerId: LID,
    start: { x: sx, y: sy },
    end: { x: ex, y: ey },
    thicknessMm,
    heightMm: 3000,
  };
}

function cornerJoint(kind: "CORNER_BUTT" | "CORNER_MITER", wa: Wall, ea: "start" | "end", wb: Wall, eb: "start" | "end"): WallJoint {
  return {
    id: `j-${wa.id}-${wb.id}`,
    kind,
    wallAId: wa.id,
    wallAEnd: ea,
    wallBId: wb.id,
    wallBEnd: eb,
  };
}

describe("thicknessOfOrthogonalAdjoiningWallAtEndpointMm", () => {
  it("0 без соседа", () => {
    const wall = w("a", 0, 0, 5000, 0);
    expect(thicknessOfOrthogonalAdjoiningWallAtEndpointMm(wall, "start", [wall])).toBe(0);
  });

  it("толщина соседа в ортогональном углу у start", () => {
    const bottom = w("b", 0, 0, 6000, 0, 200);
    const left = w("l", 0, 0, 0, 4000, 220);
    const walls = [bottom, left];
    expect(thicknessOfOrthogonalAdjoiningWallAtEndpointMm(bottom, "start", walls)).toBe(220);
    expect(thicknessOfOrthogonalAdjoiningWallAtEndpointMm(bottom, "end", walls)).toBe(0);
  });

  it("толщина соседа у end нижней стены", () => {
    const bottom = w("b", 0, 0, 6000, 0, 200);
    const right = w("r", 6000, 0, 6000, 4000, 180);
    const walls = [bottom, right];
    expect(thicknessOfOrthogonalAdjoiningWallAtEndpointMm(bottom, "end", walls)).toBe(180);
  });
});

describe("resolveOpeningMovePlanAnchorsMm", () => {
  it("без узлов: прежняя эвристика — внутренние от оси, наружные + толщина соседа", () => {
    const bottom = w("b", 0, 0, 6000, 0, 200);
    const left = w("l", 0, 0, 0, 4000, 200);
    const right = w("r", 6000, 0, 6000, 4000, 200);
    const top = w("t", 6000, 4000, 0, 4000, 200);
    const walls = [bottom, left, right, top];
    const a = resolveOpeningMovePlanAnchorsMm(bottom, 1000, 1200, walls, []);
    expect(a.innerLeftGapMm).toBe(1000);
    expect(a.outerLeftGapMm).toBe(1200);
    expect(a.innerRightGapMm).toBe(3800);
    expect(a.outerRightGapMm).toBe(4000);
    expect(a.thicknessBonusStartMm).toBe(200);
    expect(a.thicknessBonusEndMm).toBe(200);
    expect(a.innerLeftRefAlongMm).toBe(0);
    expect(a.outerLeftRefAlongMm).toBe(-200);
    expect(a.innerRightRefAlongMm).toBe(6000);
    expect(a.outerRightRefAlongMm).toBe(6200);
  });

  it("одна стена — внутренние и наружные зазоры совпадают", () => {
    const wall = w("solo", 0, 0, 5000, 0);
    const a = resolveOpeningMovePlanAnchorsMm(wall, 500, 900, [wall], []);
    expect(a.outerLeftGapMm).toBe(a.innerLeftGapMm);
    expect(a.outerRightGapMm).toBe(a.innerRightGapMm);
  });

  it("CORNER_BUTT: нижняя у левого узла — внутренний и наружный размеры различаются по геометрии стыка", () => {
    const bottom0 = w("b", 0, 0, 6000, 0, 200);
    const left0 = w("l", 0, 0, 0, 4000, 220);
    const gj = computeCornerJointGeometry("CORNER_BUTT", bottom0, "start", left0, "start");
    expect(gj.ok).toBe(true);
    if (!gj.ok) {
      return;
    }
    const bottom = gj.value.wallMain;
    const left = gj.value.wallSecondary;
    const walls = [bottom, left];
    const joints = [cornerJoint("CORNER_BUTT", bottom0, "start", left0, "start")];
    const a = resolveOpeningMovePlanAnchorsMm(bottom, 1000, 1200, walls, joints);
    expect(a.outerLeftGapMm - a.innerLeftGapMm).toBeCloseTo(a.thicknessBonusStartMm, 3);
    expect(a.thicknessBonusStartMm).toBeGreaterThan(1);
    expect(a.innerLeftRefAlongMm).not.toBe(0);
    expect(a.outerLeftRefAlongMm).not.toBe(a.innerLeftRefAlongMm);
  });

  it("CORNER_MITER vs CORNER_BUTT: другие опорные вдоль оси у того же проёма", () => {
    const bottom0 = w("b", 0, 0, 6000, 0, 200);
    const left0 = w("l", 0, 0, 0, 4000, 220);
    const butt = computeCornerJointGeometry("CORNER_BUTT", bottom0, "start", left0, "start");
    const miter = computeCornerJointGeometry("CORNER_MITER", bottom0, "start", left0, "start");
    expect(butt.ok && miter.ok).toBe(true);
    if (!butt.ok || !miter.ok) {
      return;
    }
    const wallsButt = [butt.value.wallMain, butt.value.wallSecondary];
    const wallsMiter = [miter.value.wallMain, miter.value.wallSecondary];
    const jButt = cornerJoint("CORNER_BUTT", bottom0, "start", left0, "start");
    const jMiter = cornerJoint("CORNER_MITER", bottom0, "start", left0, "start");
    const aButt = resolveOpeningMovePlanAnchorsMm(wallsButt[0]!, 1000, 1200, wallsButt, [jButt]);
    const aMiter = resolveOpeningMovePlanAnchorsMm(wallsMiter[0]!, 1000, 1200, wallsMiter, [jMiter]);
    const refDiff =
      Math.abs(aButt.innerLeftRefAlongMm - aMiter.innerLeftRefAlongMm) +
      Math.abs(aButt.outerLeftRefAlongMm - aMiter.outerLeftRefAlongMm);
    expect(refDiff).toBeGreaterThan(1e-3);
  });

  it("T_ABUTMENT: примыкающая стена — опоры по узлу T", () => {
    const main = w("m", 0, 0, 8000, 0, 200);
    const abutting0 = w("a", 3000, -4000, 3000, 0, 200);
    const gt = computeTeeAbutmentGeometry(abutting0, "end", main, { x: 3000, y: 0 });
    expect(gt.ok).toBe(true);
    if (!gt.ok) {
      return;
    }
    const abutting = gt.value.abutting;
    const walls = [main, abutting];
    const joint: WallJoint = {
      id: "tee1",
      kind: "T_ABUTMENT",
      wallAId: abutting.id,
      wallAEnd: "end",
      wallBId: main.id,
      teePointOnMainMm: { x: 3000, y: 0 },
    };
    const L = Math.hypot(abutting.end.x - abutting.start.x, abutting.end.y - abutting.start.y);
    const left = L - 1500 - 900;
    const a = resolveOpeningMovePlanAnchorsMm(abutting, left, 900, walls, [joint]);
    expect(a.innerRightGapMm).toBeGreaterThan(0);
    expect(a.outerRightGapMm - a.innerRightGapMm).toBeCloseTo(a.thicknessBonusEndMm, 2);
  });

  it("вертикальная стена у нижнего угла: опоры по CORNER_BUTT", () => {
    const left0 = w("l", 0, 0, 0, 5000, 200);
    const bottom0 = w("b", 0, 0, 6000, 0, 200);
    const gj = computeCornerJointGeometry("CORNER_BUTT", left0, "start", bottom0, "start");
    expect(gj.ok).toBe(true);
    if (!gj.ok) {
      return;
    }
    const left = gj.value.wallMain;
    const bottom = gj.value.wallSecondary;
    const walls = [left, bottom];
    const joints = [cornerJoint("CORNER_BUTT", left0, "start", bottom0, "start")];
    const L = Math.hypot(left.end.y - left.start.y, left.end.x - left.start.x);
    const a = resolveOpeningMovePlanAnchorsMm(left, 1200, 900, walls, joints);
    expect(a.innerLeftRefAlongMm).not.toBe(0);
    expect(a.outerLeftGapMm).toBeGreaterThan(a.innerLeftGapMm);
    expect(L).toBeGreaterThan(100);
  });

  it("cornerInnerOuterCornersMm симметрична по порядку стен", () => {
    const h = w("h", 0, 0, 5000, 0, 100);
    const v = w("v", 0, 0, 0, 4000, 120);
    const c = planCentroidForTest([h, v]);
    const ab = cornerInnerOuterCornersMm(h, v, c);
    const ba = cornerInnerOuterCornersMm(v, h, c);
    expect(ab).not.toBeNull();
    expect(ba).not.toBeNull();
    expect(ab!.inner.x).toBeCloseTo(ba!.inner.x, 6);
    expect(ab!.inner.y).toBeCloseTo(ba!.inner.y, 6);
    expect(ab!.outer.x).toBeCloseTo(ba!.outer.x, 6);
    expect(ab!.outer.y).toBeCloseTo(ba!.outer.y, 6);
  });
});

describe("resolveOpeningMovePrimaryNeighborRefsMm", () => {
  const ow = (id: string, wallId: string, left: number, w: number): Opening => ({
    id,
    wallId,
    kind: "window",
    offsetFromStartMm: left,
    widthMm: w,
    heightMm: 1300,
  });
  const dr = (id: string, wallId: string, left: number, w: number): Opening => ({
    id,
    wallId,
    kind: "door",
    offsetFromStartMm: left,
    widthMm: w,
    heightMm: 2100,
  });

  it("дверь между двумя окнами — опоры на правый край левого окна и левый край правого", () => {
    const wallId = "w1";
    const innerL = 50;
    const innerR = 8000;
    const openings = [ow("ok1", wallId, 500, 1200), dr("d1", wallId, 2000, 1000), ow("ok2", wallId, 3500, 1250)];
    const r = resolveOpeningMovePrimaryNeighborRefsMm(wallId, "d1", innerL, innerR, openings);
    expect(r.primaryLeftRefAlongMm).toBe(500 + 1200);
    expect(r.primaryRightRefAlongMm).toBe(3500);
  });

  it("единственный проём — внутренние углы стены", () => {
    const r = resolveOpeningMovePrimaryNeighborRefsMm("w1", "o1", 0, 6000, [
      { id: "o1", wallId: "w1", kind: "window", offsetFromStartMm: 1000, widthMm: 900, heightMm: 1200 },
    ]);
    expect(r.primaryLeftRefAlongMm).toBe(0);
    expect(r.primaryRightRefAlongMm).toBe(6000);
  });

  it("неизвестный id — fallback на переданные внутренние опоры", () => {
    const r = resolveOpeningMovePrimaryNeighborRefsMm("w1", "xx", 10, 990, []);
    expect(r.primaryLeftRefAlongMm).toBe(10);
    expect(r.primaryRightRefAlongMm).toBe(990);
  });
});

function planCentroidForTest(walls: readonly Wall[]): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const w0 of walls) {
    sx += w0.start.x + w0.end.x;
    sy += w0.start.y + w0.end.y;
    n += 2;
  }
  return { x: sx / n, y: sy / n };
}
