import { describe, expect, it } from "vitest";

import {
  computeFloorBeamSplitIntervalsAtPointMm,
  computeFloorBeamSplitIntervalsCenterMm,
  computeFloorBeamSplitIntervalsMaxLengthMm,
} from "./floorBeamSplit";

describe("computeFloorBeamSplitIntervalsMaxLengthMm", () => {
  it("не делит, если длина не больше максимума", () => {
    const r = computeFloorBeamSplitIntervalsMaxLengthMm(5800, 6000, 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.noop).toBe(true);
      expect(r.intervals).toEqual([{ t0: 0, t1: 5800 }]);
    }
  });

  it("15000 / 6000 / overlap 0 — три сегмента как у раскладки заготовок", () => {
    const r = computeFloorBeamSplitIntervalsMaxLengthMm(15000, 6000, 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.noop).toBe(false);
      expect(r.intervals.length).toBe(3);
      expect(r.intervals[0]).toEqual({ t0: 0, t1: 6000 });
      expect(r.intervals[1]).toEqual({ t0: 6000, t1: 12000 });
      expect(r.intervals[2]).toEqual({ t0: 12000, t1: 15000 });
    }
  });

  it("15000 / 6000 / overlap 200 — стыки с нахлёстом, покрытие полной длины", () => {
    const r = computeFloorBeamSplitIntervalsMaxLengthMm(15000, 6000, 200);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.intervals.length).toBe(3);
      const last = r.intervals[r.intervals.length - 1]!;
      expect(last.t1).toBe(15000);
      for (const iv of r.intervals) {
        expect(iv.t1 - iv.t0).toBeLessThanOrEqual(6000 + 1e-6);
      }
    }
  });

  it("отклоняет overlap >= maxStock", () => {
    const r = computeFloorBeamSplitIntervalsMaxLengthMm(10000, 6000, 6000);
    expect(r.ok).toBe(false);
  });

  it("12050 / 6000 — перераспределяет хвост (без «огрызка»)", () => {
    const r = computeFloorBeamSplitIntervalsMaxLengthMm(12050, 6000, 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.intervals.map((x) => Math.round(x.t1 - x.t0))).toEqual([6000, 5950, 100]);
    }
  });
});

describe("computeFloorBeamSplitIntervalsCenterMm", () => {
  it("без наложения — два равных сегмента", () => {
    const r = computeFloorBeamSplitIntervalsCenterMm(10000, 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.intervals).toEqual([
        { t0: 0, t1: 5000 },
        { t0: 5000, t1: 10000 },
      ]);
    }
  });

  it("с наложением — симметричный нахлёст в центре", () => {
    const r = computeFloorBeamSplitIntervalsCenterMm(10000, 200);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.intervals).toEqual([
        { t0: 0, t1: 5100 },
        { t0: 4900, t1: 10000 },
      ]);
    }
  });
});

describe("computeFloorBeamSplitIntervalsAtPointMm", () => {
  it("деление вдоль точки с наложением", () => {
    const r = computeFloorBeamSplitIntervalsAtPointMm(10000, 4000, 200);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.intervals).toEqual([
        { t0: 0, t1: 4100 },
        { t0: 3900, t1: 10000 },
      ]);
    }
  });
});
