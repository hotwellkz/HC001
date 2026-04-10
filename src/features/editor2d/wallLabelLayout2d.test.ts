import { describe, expect, it } from "vitest";

import {
  alongStepsMmForWallLength,
  buildWallLabelAlongCandidatesMm,
  findBestWallLabelAlongMm,
  isClearOfOpeningLabelObstaclesPx,
  mergeWallLabelForbiddenAlongIntervalsMm,
  shrinkWallLabelFreeSegmentsForHalfWidthMm,
  wallLabelFreeAlongSegmentsMm,
} from "./wallLabelLayout2d";

describe("alongStepsMmForWallLength", () => {
  it("короткая стена — плотнее шаги", () => {
    const s = alongStepsMmForWallLength(1000);
    expect(s).toContain(0);
    expect(Math.max(...s.map(Math.abs))).toBeLessThan(200);
  });

  it("длинная стена — добавляются большие смещения", () => {
    const s = alongStepsMmForWallLength(5000);
    expect(s.some((x) => Math.abs(x) >= 280)).toBe(true);
  });
});

describe("mergeWallLabelForbiddenAlongIntervalsMm", () => {
  it("склеивает пересекающиеся интервалы", () => {
    const m = mergeWallLabelForbiddenAlongIntervalsMm(
      [
        { lo: 0, hi: 100 },
        { lo: 80, hi: 200 },
      ],
      500,
    );
    expect(m).toEqual([{ lo: 0, hi: 200 }]);
  });
});

describe("wallLabelFreeAlongSegmentsMm + findBestWallLabelAlongMm", () => {
  it("центр стены попадает в свободный сегмент", () => {
    const L = 4000;
    const forbidden = mergeWallLabelForbiddenAlongIntervalsMm(
      [
        { lo: 0, hi: 400 },
        { lo: 3600, hi: L },
      ],
      L,
    );
    const free = wallLabelFreeAlongSegmentsMm(forbidden, L);
    expect(free).toEqual([{ lo: 400, hi: 3600 }]);
    const shrunk = shrinkWallLabelFreeSegmentsForHalfWidthMm(free, 50);
    const best = findBestWallLabelAlongMm(shrunk, L);
    expect(best).toBeCloseTo(2000, 0);
  });
});

describe("buildWallLabelAlongCandidatesMm", () => {
  it("sticky идёт первым при валидном значении", () => {
    const free = [{ lo: 0, hi: 5000 }];
    const walk = [{ lo: 100, hi: 4900 }];
    const c = buildWallLabelAlongCandidatesMm(free, walk, 5000, 2500, 1200, 100);
    expect(c[0]).toBe(1200);
    expect(c.includes(2500)).toBe(true);
  });
});

describe("isClearOfOpeningLabelObstaclesPx", () => {
  it("отсекает только препятствия той же стены", () => {
    const obs = [
      { wallId: "w1", x: 100, y: 100, r: 20 },
      { wallId: "w2", x: 102, y: 100, r: 20 },
    ];
    expect(isClearOfOpeningLabelObstaclesPx({ x: 200, y: 100 }, obs, "w1", 15, 4)).toBe(true);
    expect(isClearOfOpeningLabelObstaclesPx({ x: 105, y: 100 }, obs, "w1", 15, 4)).toBe(false);
    expect(isClearOfOpeningLabelObstaclesPx({ x: 105, y: 100 }, obs, "w2", 15, 4)).toBe(false);
    expect(isClearOfOpeningLabelObstaclesPx({ x: 105, y: 100 }, obs, "w3", 15, 4)).toBe(true);
  });
});
