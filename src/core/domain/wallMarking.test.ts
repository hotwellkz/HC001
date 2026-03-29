import { describe, expect, it } from "vitest";

import { createDemoProject } from "./demoProject";
import { createEmptyProject } from "./projectFactory";
import { addWallsToProject, createWallEntity } from "./wallOps";
import { allocateNextWallMarks, effectiveMarkPrefixForProfile, maxMarkSequenceForPrefix } from "./wallMarking";
import type { Profile } from "./profile";

function wallProf(id: string, prefix: string): Profile {
  const t = new Date().toISOString();
  return {
    id,
    name: "W",
    category: "wall",
    markPrefix: prefix,
    compositionMode: "layered",
    layers: [{ id: "l1", orderIndex: 0, materialName: "A", materialType: "osb", thicknessMm: 100 }],
    createdAt: t,
    updatedAt: t,
  };
}

describe("wallMarking", () => {
  it("effectiveMarkPrefixForProfile использует markPrefix", () => {
    const p = wallProf("p", "1S");
    expect(effectiveMarkPrefixForProfile(p)).toBe("1S");
  });

  it("maxMarkSequenceForPrefix учитывает только совпадающий префикс", () => {
    let proj = createEmptyProject();
    proj = addWallsToProject(proj, [
      createWallEntity({
        layerId: proj.activeLayerId,
        profileId: "p",
        start: { x: 0, y: 0 },
        end: { x: 1000, y: 0 },
        thicknessMm: 100,
        heightMm: 2500,
        baseElevationMm: 0,
        markPrefix: "1S",
        markSequenceNumber: 3,
        markLabel: "1S_3",
      })!,
    ]);
    expect(maxMarkSequenceForPrefix(proj, "1S")).toBe(3);
    expect(maxMarkSequenceForPrefix(proj, "2S")).toBe(0);
  });

  it("allocateNextWallMarks даёт следующие номера без дыр при удалении", () => {
    const demo = createDemoProject();
    const prof = demo.profiles[0]!;
    expect(maxMarkSequenceForPrefix(demo, effectiveMarkPrefixForProfile(prof))).toBe(4);
    const next = allocateNextWallMarks(demo, prof, 2);
    expect(next).toHaveLength(2);
    expect(next[0]!.markLabel).toBe("1S_5");
    expect(next[1]!.markLabel).toBe("1S_6");
  });
});
