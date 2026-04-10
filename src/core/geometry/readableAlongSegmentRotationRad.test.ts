import { describe, expect, it } from "vitest";

import { readableAlongSegmentRotationRad } from "./readableAlongSegmentRotationRad";

describe("readableAlongSegmentRotationRad", () => {
  it("оставляет углы в (-π/2, π/2] без изменений", () => {
    expect(readableAlongSegmentRotationRad(0)).toBe(0);
    expect(readableAlongSegmentRotationRad(Math.PI / 4)).toBeCloseTo(Math.PI / 4);
    expect(readableAlongSegmentRotationRad(-Math.PI / 4)).toBeCloseTo(-Math.PI / 4);
    expect(readableAlongSegmentRotationRad(Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(readableAlongSegmentRotationRad(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
  });

  it("разворачивает на π, если сегмент «смотрит» в перевёрнутую полуплоскость", () => {
    expect(readableAlongSegmentRotationRad(Math.PI)).toBeCloseTo(0);
    expect(readableAlongSegmentRotationRad((3 * Math.PI) / 4)).toBeCloseTo(-Math.PI / 4);
    expect(readableAlongSegmentRotationRad((-3 * Math.PI) / 4)).toBeCloseTo(Math.PI / 4);
  });
});
