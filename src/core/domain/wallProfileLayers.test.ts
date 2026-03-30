import { describe, expect, it } from "vitest";

import { createDemoProject } from "./demoProject";
import { coreLayerNormalOffsetsMm, resolveWallProfileLayerStripsMm } from "./wallProfileLayers";

describe("resolveWallProfileLayerStripsMm", () => {
  it("суммирует толщины к толщине стены (SIP демо)", () => {
    const p = createDemoProject();
    const profile = p.profiles[0]!;
    const w = p.walls[0]!;
    const strips = resolveWallProfileLayerStripsMm(w.thicknessMm, profile);
    expect(strips).not.toBeNull();
    expect(strips!.length).toBe(3);
    const sum = strips!.reduce((a, s) => a + s.thicknessMm, 0);
    expect(sum).toBeCloseTo(w.thicknessMm, 4);
  });

  it("возвращает null для solid-профиля", () => {
    const p = createDemoProject();
    const solid = { ...p.profiles[0]!, compositionMode: "solid" as const };
    const strips = resolveWallProfileLayerStripsMm(174, solid);
    expect(strips).toBeNull();
  });
});

describe("coreLayerNormalOffsetsMm", () => {
  it("даёт полосу ядра (EPS) между OSB в SIP-демо", () => {
    const p = createDemoProject();
    const profile = p.profiles[0]!;
    const w = p.walls[0]!;
    const strips = resolveWallProfileLayerStripsMm(w.thicknessMm, profile);
    expect(strips).not.toBeNull();
    const core = coreLayerNormalOffsetsMm(w.thicknessMm, profile);
    expect(core).not.toBeNull();
    const t0 = strips![0]!.thicknessMm;
    const t1 = strips![1]!.thicknessMm;
    expect(core!.offStartMm).toBeCloseTo(-w.thicknessMm / 2 + t0, 4);
    expect(core!.offEndMm - core!.offStartMm).toBeCloseTo(t1, 4);
  });
});
