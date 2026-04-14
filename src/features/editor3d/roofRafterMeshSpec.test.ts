import { describe, expect, it } from "vitest";

import { newEntityId } from "@/core/domain/ids";
import { createEmptyProject } from "@/core/domain/projectFactory";
import type { RoofRafterEntity } from "@/core/domain/roofRafter";

import { roofRaftersForScene3d } from "./roofRafterMeshSpec";

describe("roofRaftersForScene3d", () => {
  it("не скрывает стропила при isVisible=false у слоя (2D), если слой не выключен в панели 3D", () => {
    const t = new Date().toISOString();
    let p = createEmptyProject();
    const layerId = p.activeLayerId;
    const rafter: RoofRafterEntity = {
      id: newEntityId(),
      type: "roofRafter",
      layerId,
      roofSystemId: "sys",
      profileId: "pr",
      supportingFloorBeamId: "b",
      pairedRoofRafterId: null,
      roofPlaneId: "pl",
      footPlanMm: { x: 0, y: 0 },
      ridgePlanMm: { x: 1, y: 1 },
      footElevationMm: 0,
      ridgeElevationMm: 1000,
      sectionRolled: true,
      createdAt: t,
      updatedAt: t,
    };
    p = {
      ...p,
      roofRafters: [rafter],
      layers: p.layers.map((l) => (l.id === layerId ? { ...l, isVisible: false } : l)),
    };
    const list = roofRaftersForScene3d(p);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(rafter.id);
  });
});
