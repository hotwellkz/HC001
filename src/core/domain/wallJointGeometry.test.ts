import { describe, expect, it } from "vitest";

import type { Wall } from "./wall";
import { computeCornerJointGeometry, computeTeeAbutmentGeometry, orthogonalCenterlineIntersection } from "./wallJointGeometry";

function w(id: string, sx: number, sy: number, ex: number, ey: number, tMm: number): Wall {
  const t = new Date().toISOString();
  return {
    id,
    layerId: "L",
    start: { x: sx, y: sy },
    end: { x: ex, y: ey },
    thicknessMm: tMm,
    heightMm: 2500,
    createdAt: t,
    updatedAt: t,
  };
}

describe("wallJointGeometry", () => {
  it("orthogonalCenterlineIntersection для горизонтали и вертикали", () => {
    const h = w("h", 0, 0, 5000, 0, 100);
    const v = w("v", 5000, 0, 5000, 4000, 100);
    const c = orthogonalCenterlineIntersection(h, v);
    expect(c).toEqual({ x: 5000, y: 0 });
  });

  it("CORNER_MITER: смещает торцы от пересечения осей", () => {
    const main = w("a", 0, 0, 5000, 0, 100);
    const sec = w("b", 5000, 0, 5000, 4000, 100);
    const r = computeCornerJointGeometry("CORNER_MITER", main, "end", sec, "start");
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.value.wallMain.end.x).not.toBe(5000);
    expect(r.value.wallSecondary.start.y).not.toBe(0);
  });

  it("CORNER_BUTT: вертикаль main + горизонталь secondary справа — торец secondary на плоскости грани main (t/2)", () => {
    const main = w("main", 5000, 0, 5000, 4000, 100);
    const sec = w("sec", 0, 0, 5000, 0, 100);
    const r = computeCornerJointGeometry("CORNER_BUTT", main, "start", sec, "end");
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.value.wallMain.start).toEqual({ x: 5000, y: -50 });
    expect(r.value.wallSecondary.end).toEqual({ x: 4950, y: 0 });
  });

  it("CORNER_BUTT: горизонталь main + вертикаль secondary сверху — start secondary смещён на t/2 вверх", () => {
    const main = w("main", 0, 0, 5000, 0, 100);
    const sec = w("sec", 5000, 0, 5000, 4000, 100);
    const r = computeCornerJointGeometry("CORNER_BUTT", main, "end", sec, "start");
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.value.wallMain.end).toEqual({ x: 5050, y: 0 });
    expect(r.value.wallSecondary.start).toEqual({ x: 5000, y: 50 });
  });

  it("CORNER_BUTT: горизонталь main + вертикаль secondary снизу (торец внизу у угла)", () => {
    const main = w("main", 0, 0, 5000, 0, 100);
    const sec = w("sec", 5000, 4000, 5000, 0, 100);
    const r = computeCornerJointGeometry("CORNER_BUTT", main, "end", sec, "end");
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.value.wallMain.end).toEqual({ x: 5050, y: 0 });
    expect(r.value.wallSecondary.end).toEqual({ x: 5000, y: 50 });
  });

  it("CORNER_BUTT: вертикаль main + горизонталь secondary слева (start у угла)", () => {
    const main = w("main", 5000, 0, 5000, 4000, 100);
    const sec = w("sec", 5000, 0, 10000, 0, 100);
    const r = computeCornerJointGeometry("CORNER_BUTT", main, "start", sec, "start");
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.value.wallMain.start).toEqual({ x: 5000, y: -50 });
    expect(r.value.wallSecondary.start).toEqual({ x: 5050, y: 0 });
  });

  /** 4 ориентации: примыкающая доходит до плоскости боковой грани main (t_main/2 от оси), не до оси C. */
  it("CORNER_BUTT: вертикаль примыкает к горизонтальной снизу — торец на нижней боковой грани main", () => {
    const main = w("main", 0, 0, 5000, 0, 100);
    const sec = w("sec", 5000, 0, 5000, -4000, 100);
    const r = computeCornerJointGeometry("CORNER_BUTT", main, "end", sec, "start");
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.value.wallMain.end).toEqual({ x: 5050, y: 0 });
    expect(r.value.wallSecondary.start).toEqual({ x: 5000, y: -50 });
  });

  it("CORNER_BUTT: инвариант — расстояние от оси main до торца secondary по нормали = t_main/2 (все 4 кейса)", () => {
    const t = 100;
    const half = t / 2;
    const cases: { name: string; main: Wall; mainEnd: "start" | "end"; sec: Wall; secEnd: "start" | "end"; exp: { x: number; y: number } }[] = [
      {
        name: "H main, V сверху",
        main: w("m1", 0, 0, 5000, 0, t),
        mainEnd: "end",
        sec: w("s1", 5000, 0, 5000, 4000, t),
        secEnd: "start",
        exp: { x: 5000, y: half },
      },
      {
        name: "H main, V снизу",
        main: w("m2", 0, 0, 5000, 0, t),
        mainEnd: "end",
        sec: w("s2", 5000, 0, 5000, -4000, t),
        secEnd: "start",
        exp: { x: 5000, y: -half },
      },
      {
        name: "V main, H слева",
        main: w("m3", 5000, 0, 5000, 4000, t),
        mainEnd: "start",
        sec: w("s3", 0, 0, 5000, 0, t),
        secEnd: "end",
        exp: { x: 5000 - half, y: 0 },
      },
      {
        name: "V main, H справа",
        main: w("m4", 5000, 0, 5000, 4000, t),
        mainEnd: "start",
        sec: w("s4", 5000, 0, 10000, 0, t),
        secEnd: "start",
        exp: { x: 5000 + half, y: 0 },
      },
    ];
    for (const c of cases) {
      const r = computeCornerJointGeometry("CORNER_BUTT", c.main, c.mainEnd, c.sec, c.secEnd);
      expect(r.ok, c.name).toBe(true);
      if (!r.ok) {
        continue;
      }
      const ep = c.secEnd === "start" ? r.value.wallSecondary.start : r.value.wallSecondary.end;
      expect(ep, c.name).toEqual(c.exp);
      const C = { x: 5000, y: 0 };
      const d = Math.hypot(ep.x - C.x, ep.y - C.y);
      expect(d, c.name).toBeCloseTo(half, 5);
    }
  });

  it("T_ABUTMENT: изменяет торец примыкающей стены", () => {
    const main = w("m", 0, 0, 8000, 0, 100);
    const ab = w("ab", 4000, 2000, 4000, 0, 100);
    const r = computeTeeAbutmentGeometry(ab, "end", main, { x: 4000, y: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    expect(r.value.abutting.end.y).not.toBe(0);
  });
});
