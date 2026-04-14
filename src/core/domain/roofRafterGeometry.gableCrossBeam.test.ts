import { describe, expect, it } from "vitest";

import { newEntityId } from "./ids";
import { addProfile as addProfileToProject } from "./profileMutations";
import type { Profile } from "./profile";
import { createEmptyProject } from "./projectFactory";
import { addRectangleRoofSystemToProject } from "./roofSystemToProject";
import { rawRoofZUpAtPlanPointMm } from "./roofGroupHeightAdjust";

function roofZAdj(plane: RoofPlaneEntity, base: number, zAdj: number, px: number, py: number): number {
  return rawRoofZUpAtPlanPointMm(plane, base, px, py) + zAdj;
}
import { computeLayerVerticalStack } from "./layerVerticalStack";
import { computeAllRoofPlanesZAdjustMmByPlaneIdInProject } from "./roofGroupHeightAdjust";
import type { RoofPlaneEntity } from "./roofPlane";
import { roofPlanePolygonMm } from "./roofPlane";
import {
  clipSegmentToPolygon2dMm,
  footOnCenterlineAtRoofPlaneElevationMm,
  ridgePlanHitFromFootUphillMm,
} from "./roofRafterGeometry";

function minimalRoofCoverProfile(id: string): Profile {
  const t = new Date().toISOString();
  return {
    id,
    name: "Кровля тест",
    category: "roof",
    compositionMode: "solid",
    defaultThicknessMm: 1,
    layers: [{ id: newEntityId(), orderIndex: 0, materialName: "—", materialType: "custom", thicknessMm: 1 }],
    roofAssembly: {
      coveringKind: "metal_tile",
      coveringMaterial: "М",
      coveringThicknessMm: 0.5,
      coveringAppearance3d: "color",
      coveringColorHex: "#778899",
      coveringTextureId: null,
      membraneUse: false,
      membraneThicknessMm: 0,
      membraneTypeName: "",
      battenUse: false,
      battenMaterial: "",
      battenWidthMm: 0,
      battenHeightMm: 0,
      battenStepMm: 300,
      battenLayoutDir: "perpendicular_to_fall",
      eaveOverhangMm: 400,
      sideOverhangMm: 200,
      soffitReserved: false,
    },
    createdAt: t,
    updatedAt: t,
  };
}

describe("roofRafterGeometry gable cross beam", () => {
  it("ступня на оси и попадание на конёк для балки вдоль Y", () => {
    let p = createEmptyProject();
    const roofP = minimalRoofCoverProfile("rg");
    p = addProfileToProject(p, roofP);
    const rect = [
      { x: 0, y: 0 },
      { x: 8000, y: 0 },
      { x: 8000, y: 6000 },
      { x: 0, y: 6000 },
    ] as const;
    p = addRectangleRoofSystemToProject(p, {
      footprintCcWMm: rect,
      roofKind: "gable",
      pitchDeg: 30,
      baseLevelMm: 0,
      profileId: roofP.id,
      eaveOverhangMm: 300,
      sideOverhangMm: 150,
      roofCoverEaveProjectionMm: 0,
      ridgeAlong: "short",
      monoDrainCardinal: "s",
    });
    const sys = p.roofSystems[0]!;
    const planes = sys.generatedPlaneIds
      .map((id) => p.roofPlanes.find((x) => x.id === id))
      .filter((x): x is NonNullable<typeof x> => x != null);
    expect(planes.length).toBe(2);
    const stack = computeLayerVerticalStack(p);
    const layerBase = (lid: string) =>
      stack.get(lid)?.computedBaseMm ?? p.layers.find((l) => l.id === lid)?.elevationMm ?? 0;
    const zAdjMap = computeAllRoofPlanesZAdjustMmByPlaneIdInProject(p, layerBase);

    const zBeam = 1500;
    const ridgeSegs = sys.ridgeSegmentsPlanMm.map((s) => ({ ax: s.ax, ay: s.ay, bx: s.bx, by: s.by }));

    /** Вдоль X: на скате z меняется по x; вертикальная балка (только Δy) на скате с uyn=0 даёт za=zb. */
    const cl = { sx: 800, sy: 2500, ex: 7200, ey: 2500 };

    for (const plane of planes) {
      const base = layerBase(plane.layerId);
      const zAdj = zAdjMap.get(plane.id) ?? 0;
      const poly = roofPlanePolygonMm(plane);
      const clipPl = clipSegmentToPolygon2dMm(cl.sx, cl.sy, cl.ex, cl.ey, poly);
      expect(clipPl, `clip slope ${plane.slopeIndex} poly ${JSON.stringify(poly)}`).not.toBeNull();
      const za = roofZAdj(plane, base, zAdj, clipPl!.sx, clipPl!.sy);
      const zb = roofZAdj(plane, base, zAdj, clipPl!.ex, clipPl!.ey);
      const foot = footOnCenterlineAtRoofPlaneElevationMm(
        plane,
        base,
        zAdj,
        clipPl!.sx,
        clipPl!.sy,
        clipPl!.ex,
        clipPl!.ey,
        zBeam,
      );
      expect(foot).not.toBeNull();
      const qHit = ridgePlanHitFromFootUphillMm(plane, foot!.x, foot!.y, ridgeSegs);
      expect(qHit, `ridge hit slope ${plane.slopeIndex}`).not.toBeNull();
      expect(Math.min(za, zb) < zBeam && Math.max(za, zb) > zBeam).toBe(true);
    }
  });
});
