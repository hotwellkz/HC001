import { describe, expect, it } from "vitest";

import type { Wall } from "@/core/domain/wall";

import {
  doorCursorLocalDots,
  doorOpeningCenterPointMm,
  doorSwingFromWallLocalDots,
  resolveDoorSwingWithHysteresis,
  wallTangentNormalUnits,
} from "./doorSwingPick2d";

describe("doorSwingPick2d", () => {
  const horizontal: Wall = {
    id: "w1",
    layerId: "L1",
    start: { x: 0, y: 0 },
    end: { x: 6000, y: 0 },
    thicknessMm: 200,
    heightMm: 2800,
  };

  it("wallTangentNormalUnits даёт u вдоль стены и n как в отрисовке", () => {
    const f = wallTangentNormalUnits(horizontal);
    expect(f).not.toBeNull();
    expect(f!.ux).toBeCloseTo(1, 5);
    expect(f!.uy).toBeCloseTo(0, 5);
    expect(f!.nx).toBeCloseTo(0, 5);
    expect(f!.ny).toBeCloseTo(1, 5);
  });

  it("doorOpeningCenterPointMm — середина проёма вдоль оси", () => {
    const c = doorOpeningCenterPointMm(horizontal, 2500, 1000);
    expect(c!.x).toBeCloseTo(3000, 3);
    expect(c!.y).toBeCloseTo(0, 3);
  });

  it("горизонтальная стена: квадранты курсора относительно центра проёма", () => {
    const left = 2500;
    const width = 1000;
    const dNE = doorCursorLocalDots({ x: 3100, y: 80 }, horizontal, left, width);
    expect(doorSwingFromWallLocalDots(dNE!.tDot, dNE!.nDot)).toBe("out_right");
    const dNW = doorCursorLocalDots({ x: 2900, y: 80 }, horizontal, left, width);
    expect(doorSwingFromWallLocalDots(dNW!.tDot, dNW!.nDot)).toBe("out_left");
    const dSE = doorCursorLocalDots({ x: 3100, y: -80 }, horizontal, left, width);
    expect(doorSwingFromWallLocalDots(dSE!.tDot, dSE!.nDot)).toBe("in_right");
    const dSW = doorCursorLocalDots({ x: 2900, y: -80 }, horizontal, left, width);
    expect(doorSwingFromWallLocalDots(dSW!.tDot, dSW!.nDot)).toBe("in_left");
  });

  it("вертикальная стена: оси повёрнуты, не экранные «вверх/вниз»", () => {
    const vertical: Wall = {
      id: "w2",
      layerId: "L1",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 4000 },
      thicknessMm: 200,
      heightMm: 2800,
    };
    const left = 1500;
    const width = 1000;
    const mid = doorOpeningCenterPointMm(vertical, left, width);
    expect(mid!.x).toBeCloseTo(0, 3);
    expect(mid!.y).toBeCloseTo(2000, 3);
    const d = doorCursorLocalDots({ x: -100, y: 2100 }, vertical, left, width);
    expect(doorSwingFromWallLocalDots(d!.tDot, d!.nDot)).toBe("out_right");
    const d2 = doorCursorLocalDots({ x: 100, y: 1900 }, vertical, left, width);
    expect(doorSwingFromWallLocalDots(d2!.tDot, d2!.nDot)).toBe("in_left");
  });

  it("гистерезис удерживает квадрант при малых проекциях", () => {
    expect(resolveDoorSwingWithHysteresis(2, 80, "out_left", 55)).toBe("out_left");
    expect(resolveDoorSwingWithHysteresis(80, 2, "in_right", 55)).toBe("in_right");
  });
});
