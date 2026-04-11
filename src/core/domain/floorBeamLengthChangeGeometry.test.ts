import { describe, expect, it } from "vitest";

import type { FloorBeamEntity } from "./floorBeam";
import {
  floorBeamRefLengthMm,
  floorBeamWithMovedRefEndAtLength,
} from "./floorBeamLengthChangeGeometry";

const baseBeam: FloorBeamEntity = {
  id: "b1",
  layerId: "L",
  profileId: "p1",
  refStartMm: { x: 0, y: 0 },
  refEndMm: { x: 4000, y: 0 },
  linearPlacementMode: "leftEdge",
  sectionRolled: true,
  baseElevationMm: 3000,
  createdAt: "",
  updatedAt: "",
};

describe("floorBeamLengthChangeGeometry", () => {
  it("удлиняет конец ref-линии, сохраняя профиль и режим привязки", () => {
    const next = floorBeamWithMovedRefEndAtLength(baseBeam, "end", 5000);
    expect(next).not.toBeNull();
    expect(next!.refStartMm).toEqual(baseBeam.refStartMm);
    expect(next!.refEndMm).toEqual({ x: 5000, y: 0 });
    expect(next!.linearPlacementMode).toBe("leftEdge");
    expect(next!.sectionRolled).toBe(true);
    expect(next!.baseElevationMm).toBe(3000);
    expect(next!.profileId).toBe("p1");
  });

  it("укорачивает со стороны start", () => {
    const next = floorBeamWithMovedRefEndAtLength(baseBeam, "start", 1000);
    expect(next).not.toBeNull();
    expect(next!.refEndMm).toEqual(baseBeam.refEndMm);
    expect(next!.refStartMm).toEqual({ x: 3000, y: 0 });
    expect(floorBeamRefLengthMm(next!)).toBeCloseTo(1000);
  });
});
