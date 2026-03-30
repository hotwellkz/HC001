import { describe, expect, it } from "vitest";

import { createEmptyProject } from "./projectFactory";
import { newEntityId } from "./ids";
import {
  buildPreCutSummary,
  getProjectLumberPieces,
  getWallLumberPieces,
  groupLumberBySection,
  groupLumberByLength,
} from "./lumberCutList";
import type { Profile } from "./profile";
import { buildWallCalculationForWall } from "./sipWallLayout";
import type { Wall } from "./wall";

describe("lumberCutList", () => {
  it("собирает детали, марки и pre-cut summary для длинной стены", () => {
    const t = new Date().toISOString();
    const layerId = newEntityId();
    const profileId = newEntityId();
    const wallId = newEntityId();
    const profile: Profile = {
      id: profileId,
      name: "SIP test",
      category: "wall",
      markPrefix: "1C",
      compositionMode: "layered",
      layers: [
        { id: newEntityId(), orderIndex: 0, materialName: "OSB", materialType: "osb", thicknessMm: 9 },
        { id: newEntityId(), orderIndex: 1, materialName: "EPS", materialType: "eps", thicknessMm: 145 },
        { id: newEntityId(), orderIndex: 2, materialName: "OSB", materialType: "osb", thicknessMm: 9 },
      ],
      createdAt: t,
      updatedAt: t,
    };
    const wall: Wall = {
      id: wallId,
      layerId,
      profileId,
      start: { x: 0, y: 0 },
      end: { x: 9220, y: 0 },
      thicknessMm: 174,
      heightMm: 2800,
      markLabel: "1C_1",
    };
    const empty = createEmptyProject();
    const project = {
      ...empty,
      layers: [{ ...empty.layers[0]!, id: layerId }],
      activeLayerId: layerId,
      walls: [wall],
      profiles: [profile],
      wallCalculations: [buildWallCalculationForWall(wall, profile)],
    };

    const pieces = getWallLumberPieces(project, wallId);
    expect(pieces.length).toBeGreaterThan(4);
    expect(pieces.every((p) => p.pieceMark.includes("1C_1"))).toBe(true);
    expect(pieces.filter((p) => p.role === "upper_plate").length).toBe(2);

    const all = getProjectLumberPieces(project);
    expect(all.length).toBe(pieces.length);

    const bySec = groupLumberBySection(all);
    expect(bySec.size).toBeGreaterThanOrEqual(1);

    const byLen = groupLumberByLength(all);
    expect(byLen.has(4610)).toBe(true);

    const summary = buildPreCutSummary(project);
    const row4610 = summary.find((r) => r.lengthMm === 4610);
    expect(row4610?.count).toBeGreaterThanOrEqual(2);
  });
});
