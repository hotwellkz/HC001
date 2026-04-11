import { describe, expect, it } from "vitest";

import { computeEntityCopyAnchorWorldTargets } from "./entityCopyStrategies";

describe("computeEntityCopyAnchorWorldTargets", () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 3000, y: 0 };

  it("distributionMinusOne: N=2 даёт 1/3 и 2/3", () => {
    const pts = computeEntityCopyAnchorWorldTargets("distributionMinusOne", p0, p1, 2);
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual({ x: 1000, y: 0 });
    expect(pts[1]).toEqual({ x: 2000, y: 0 });
  });

  it("distributionMinusOne: N=1 — середина отрезка", () => {
    const pts = computeEntityCopyAnchorWorldTargets("distributionMinusOne", p0, p1, 1);
    expect(pts).toEqual([{ x: 1500, y: 0 }]);
  });

  it("пустой результат при нулевой длине отрезка", () => {
    expect(computeEntityCopyAnchorWorldTargets("distributionMinusOne", p0, p0, 3)).toEqual([]);
  });
});
