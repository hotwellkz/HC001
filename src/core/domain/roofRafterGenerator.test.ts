import { describe, expect, it } from "vitest";

import { newEntityId } from "./ids";
import { addProfile as addProfileToProject } from "./profileMutations";
import type { Profile } from "./profile";
import { createEmptyProject } from "./projectFactory";
import { addRectangleRoofSystemToProject } from "./roofSystemToProject";
import { addFloorBeamsToProject, createFloorBeamEntity } from "./floorBeamOps";
import {
  computeAllRoofPlanesZAdjustMmByPlaneIdInProject,
  rawRoofZUpAtPlanPointMm,
} from "./roofGroupHeightAdjust";
import { computeLayerVerticalStack } from "./layerVerticalStack";
import { generateRoofRaftersForProject } from "./roofRafterGenerator";
import { roofRaftersForScene3d, roofRaftersToMeshSpecs } from "@/features/editor3d/roofRafterMeshSpec";

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
      coveringMaterial: "Металл",
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

function beam45x145(id: string): Profile {
  const t = new Date().toISOString();
  return {
    id,
    name: "45×145",
    category: "board",
    compositionMode: "solid",
    defaultWidthMm: 145,
    layers: [{ id: newEntityId(), orderIndex: 0, materialName: "Доска", materialType: "wood", thicknessMm: 45 }],
    createdAt: t,
    updatedAt: t,
  };
}

describe("generateRoofRaftersForProject", () => {
  it("генерирует стропила и меш-спеки для типовой двускатной крыши и перекрытия", () => {
    let p = createEmptyProject();
    const roofP = minimalRoofCoverProfile("roof-prof");
    const beamP = beam45x145("beam-prof");
    const rafterP = beam45x145("rafter-prof");
    p = addProfileToProject(p, roofP);
    p = addProfileToProject(p, beamP);
    p = addProfileToProject(p, rafterP);

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
    const layerId = p.activeLayerId;

    // Балка поперёк дома (внутри контура крыши). Верх балки должен быть ниже отметки конька
    // (для половины 6 м и 30° подъём конька ≈ 3000·tan30° ≈ 1732 мм от нуля).
    const beam = createFloorBeamEntity({
      layerId,
      profileId: beamP.id,
      refStartMm: { x: 1000, y: 1500 },
      refEndMm: { x: 7000, y: 1500 },
      linearPlacementMode: "center",
      sectionRolled: true,
      baseElevationMm: 1500 - 145,
    });
    expect(beam).not.toBeNull();
    p = addFloorBeamsToProject(p, [beam!]);

    const now = new Date().toISOString();
    const res = generateRoofRaftersForProject(
      p,
      {
        roofSystemId: sys.id,
        rafterProfileId: rafterP.id,
        ridgeBeamEnabled: false,
        pairBothSlopes: true,
        beamStep: "everyBoard",
        enablePosts: false,
        enablePurlin: false,
        enableStruts: false,
      },
      now,
    );

    expect(res.warnings.join("; ")).not.toMatch(/слишком высоко/);
    expect(res.entities.length).toBeGreaterThan(0);

    p = {
      ...p,
      roofRafters: [...p.roofRafters, ...res.entities],
    };

    const for3d = roofRaftersForScene3d(p);
    expect(for3d.length).toBe(res.entities.length);
    const specs = roofRaftersToMeshSpecs(p, for3d);
    expect(specs.length).toBeGreaterThan(0);
    expect(specs.every((s) => s.depth > 1e-6)).toBe(true);
  });

  it("на линии конька оба ската дают совпадающую отметку Z (иначе ложные отказы по высоте)", () => {
    let p = createEmptyProject();
    const roofP = minimalRoofCoverProfile("roof-prof2");
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
    expect(planes).toHaveLength(2);
    const stack = computeLayerVerticalStack(p);
    const layerBase = (lid: string) =>
      stack.get(lid)?.computedBaseMm ?? p.layers.find((l) => l.id === lid)?.elevationMm ?? 0;
    const zAdjMap = computeAllRoofPlanesZAdjustMmByPlaneIdInProject(p, layerBase);
    const q = { x: 4000, y: 3000 };
    const z0 =
      rawRoofZUpAtPlanPointMm(planes[0]!, layerBase(planes[0]!.layerId), q.x, q.y) + (zAdjMap.get(planes[0]!.id) ?? 0);
    const z1 =
      rawRoofZUpAtPlanPointMm(planes[1]!, layerBase(planes[1]!.layerId), q.x, q.y) + (zAdjMap.get(planes[1]!.id) ?? 0);
    expect(Math.abs(z0 - z1)).toBeLessThan(0.5);
  });

  it("находит два ската по roofSystemId, если generatedPlaneIds устарел после правок", () => {
    let p = createEmptyProject();
    const roofP = minimalRoofCoverProfile("roof-prof-stale");
    const beamP = beam45x145("beam-prof-stale");
    const rafterP = beam45x145("rafter-prof-stale");
    p = addProfileToProject(p, roofP);
    p = addProfileToProject(p, beamP);
    p = addProfileToProject(p, rafterP);

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
    const sys0 = p.roofSystems[0]!;
    const realIds = sys0.generatedPlaneIds;
    expect(realIds.length).toBe(2);
    const staleSys = {
      ...sys0,
      generatedPlaneIds: ["ghost-plane-a", "ghost-plane-b"] as readonly string[],
    };
    p = { ...p, roofSystems: [staleSys] };

    const beam = createFloorBeamEntity({
      layerId: p.activeLayerId,
      profileId: beamP.id,
      refStartMm: { x: 1000, y: 1500 },
      refEndMm: { x: 7000, y: 1500 },
      linearPlacementMode: "center",
      sectionRolled: true,
      baseElevationMm: 1500 - 145,
    });
    expect(beam).not.toBeNull();
    p = addFloorBeamsToProject(p, [beam!]);

    const now = new Date().toISOString();
    const res = generateRoofRaftersForProject(
      p,
      {
        roofSystemId: staleSys.id,
        rafterProfileId: rafterP.id,
        ridgeBeamEnabled: false,
        pairBothSlopes: true,
        beamStep: "everyBoard",
        enablePosts: false,
        enablePurlin: false,
        enableStruts: false,
      },
      now,
    );

    expect(res.warnings.some((w) => w.includes("устарела"))).toBe(true);
    expect(res.entities.length).toBeGreaterThan(0);
    expect(new Set(res.entities.map((r) => r.roofPlaneId)).size).toBe(2);
  });

  it("балка вдоль X (перпендикулярно падению на скате) строит пару стропил — регрессия «не удалось построить»", () => {
    let p = createEmptyProject();
    const roofP = minimalRoofCoverProfile("roof-prof-cross");
    const beamP = beam45x145("beam-prof-cross");
    const rafterP = beam45x145("rafter-prof-cross");
    p = addProfileToProject(p, roofP);
    p = addProfileToProject(p, beamP);
    p = addProfileToProject(p, rafterP);

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
    const beam = createFloorBeamEntity({
      layerId: p.activeLayerId,
      profileId: beamP.id,
      refStartMm: { x: 800, y: 2500 },
      refEndMm: { x: 7200, y: 2500 },
      linearPlacementMode: "center",
      sectionRolled: true,
      baseElevationMm: 1500 - 145,
    });
    expect(beam).not.toBeNull();
    p = addFloorBeamsToProject(p, [beam!]);

    const res = generateRoofRaftersForProject(
      p,
      {
        roofSystemId: sys.id,
        rafterProfileId: rafterP.id,
        ridgeBeamEnabled: false,
        pairBothSlopes: true,
        beamStep: "everyBoard",
        enablePosts: false,
        enablePurlin: false,
        enableStruts: false,
      },
      new Date().toISOString(),
    );

    expect(res.warnings.join(" ")).not.toMatch(/не удалось построить/);
    expect(res.entities.length).toBe(2);
  });
});
