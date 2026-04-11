import { describe, expect, it } from "vitest";

import { wallCenterlinePointAtAlongMm } from "./doorSwingSymbolMm";

describe("wallCenterlinePointAtAlongMm", () => {
  it("горизонтальная стена: точка на оси без смещения по нормали", () => {
    const w = {
      start: { x: 0, y: 0 },
      end: { x: 8000, y: 0 },
    };
    const p = wallCenterlinePointAtAlongMm(w, 3000);
    expect(p!.x).toBeCloseTo(3000, 5);
    expect(p!.y).toBeCloseTo(0, 5);
  });

  it("вертикальная стена", () => {
    const w = {
      start: { x: 5000, y: 0 },
      end: { x: 5000, y: 6000 },
    };
    const p = wallCenterlinePointAtAlongMm(w, 2500);
    expect(p!.x).toBeCloseTo(5000, 5);
    expect(p!.y).toBeCloseTo(2500, 5);
  });

  it("нулевая длина — null", () => {
    const w = { start: { x: 1, y: 1 }, end: { x: 1, y: 1 } };
    expect(wallCenterlinePointAtAlongMm(w, 0)).toBeNull();
  });
});
