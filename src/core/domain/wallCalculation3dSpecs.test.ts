import { describe, expect, it } from "vitest";

import { createDemoProject } from "./demoProject";
import { buildWallCalculationForWall } from "./sipWallLayout";
import { buildCalculationSolidSpecsForProject, buildCalculationSolidSpecsForWall } from "./wallCalculation3dSpecs";

describe("wallCalculation3dSpecs", () => {
  it("строит SIP и пиломатериал для стены с расчётом", () => {
    const p = createDemoProject();
    const wall = p.walls[0]!;
    const profile = p.profiles[0]!;
    const calc = buildWallCalculationForWall(wall, profile);
    const proj = { ...p, wallCalculations: [calc] };
    const specs = buildCalculationSolidSpecsForWall(wall, proj, calc);
    expect(specs.length).toBeGreaterThan(0);
    expect(specs.some((s) => s.source === "sip")).toBe(true);
    expect(specs.some((s) => s.source === "lumber")).toBe(true);
  });

  it("buildCalculationSolidSpecsForProject агрегирует по всем стенам с расчётом", () => {
    const p = createDemoProject();
    const wall = p.walls[0]!;
    const profile = p.profiles[0]!;
    const calc = buildWallCalculationForWall(wall, profile);
    const proj = { ...p, wallCalculations: [calc] };
    const all = buildCalculationSolidSpecsForProject(proj);
    expect(all.length).toBeGreaterThan(0);
  });

  it("даёт sip_seam между соседними панелями при стыке на joint_board", () => {
    const p = createDemoProject();
    const wall = p.walls[0]!;
    const profile = p.profiles[0]!;
    const calc = buildWallCalculationForWall(wall, profile);
    const proj = { ...p, wallCalculations: [calc] };
    const all = buildCalculationSolidSpecsForProject(proj);
    const seams = all.filter((s) => s.source === "sip_seam");
    if (calc.sipRegions.length >= 2) {
      expect(seams.length).toBeGreaterThan(0);
    }
  });
});
