import { describe, expect, it } from "vitest";

import { createDemoProject } from "@/core/domain/demoProject";
import { layerIdsForSnapGeometry } from "@/core/geometry/snap2dPrimitives";

import { computeFloorPlanRoomLoops } from "./floorPlanRoomsFromWalls";

describe("computeFloorPlanRoomLoops", () => {
  it("находит внутреннее помещение в замкнутом контуре демо-проекта", () => {
    const p = createDemoProject();
    const ids = layerIdsForSnapGeometry(p);
    const walls = p.walls.filter((w) => ids.has(w.layerId));
    const rooms = computeFloorPlanRoomLoops(p, walls);
    expect(rooms.length).toBeGreaterThanOrEqual(1);
    expect(rooms[0]!.areaMm2).toBeGreaterThan(1e7);
  });
});
