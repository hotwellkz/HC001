import { describe, expect, it } from "vitest";

import { createEmptyProject, touchProjectMeta } from "./projectFactory";
import { newEntityId } from "./ids";
import { normalizeLayer } from "./layer";
import { generateFloorInsulationPieces } from "./floorInsulationGenerate";
import { resolveFloorInsulationTemplateFromProfile } from "./insulationProfile";
import type { FloorBeamEntity } from "./floorBeam";
import type { Profile } from "./profile";
import type { SlabEntity } from "./slab";

describe("generateFloorInsulationPieces", () => {
  it("fills bay between two parallel beams within slab", () => {
    const t = new Date().toISOString();
    const layerId = newEntityId();
    const layer = normalizeLayer({
      id: layerId,
      name: "Чердак",
      domain: "slab",
      orderIndex: 2,
      elevationMm: 3000,
      levelMode: "absolute",
      offsetFromBelowMm: 0,
      manualHeightMm: 400,
      isVisible: true,
      createdAt: t,
      updatedAt: t,
    });
    const beamProfileId = newEntityId();
    const insulationProfileId = newEntityId();
    const beamProfile: Profile = {
      id: beamProfileId,
      name: "Балка 200",
      category: "beam",
      compositionMode: "solid",
      defaultWidthMm: 200,
      defaultThicknessMm: 200,
      layers: [
        {
          id: newEntityId(),
          orderIndex: 0,
          materialName: "Древесина",
          materialType: "wood",
          thicknessMm: 200,
        },
      ],
      createdAt: t,
      updatedAt: t,
    };
    const insulationProfile: Profile = {
      id: insulationProfileId,
      name: "EPS тест",
      category: "insulation",
      compositionMode: "solid",
      layers: [],
      insulation: {
        materialKind: "eps",
        sheetLengthMm: 2400,
        sheetWidthMm: 1200,
        thicknessMm: 145,
        technologicalGapMm: 5,
        defaultLayoutMode: "alongBeams",
      },
      createdAt: t,
      updatedAt: t,
    };
    const beamA: FloorBeamEntity = {
      id: newEntityId(),
      layerId,
      profileId: beamProfileId,
      refStartMm: { x: 0, y: 0 },
      refEndMm: { x: 4000, y: 0 },
      linearPlacementMode: "center",
      sectionRolled: false,
      baseElevationMm: 3000,
      createdAt: t,
      updatedAt: t,
    };
    const beamB: FloorBeamEntity = {
      ...beamA,
      id: newEntityId(),
      refStartMm: { x: 0, y: 800 },
      refEndMm: { x: 4000, y: 800 },
    };
    const slab: SlabEntity = {
      id: newEntityId(),
      layerId,
      pointsMm: [
        { x: -200, y: -200 },
        { x: 4200, y: -200 },
        { x: 4200, y: 1200 },
        { x: -200, y: 1200 },
      ],
      levelMm: 0,
      depthMm: 200,
      structuralPurpose: "overlap",
      createdAt: t,
      updatedAt: t,
    };
    let p = createEmptyProject();
    p = touchProjectMeta({
      ...p,
      layers: [layer],
      activeLayerId: layerId,
      profiles: [beamProfile, insulationProfile],
      floorBeams: [beamA, beamB],
      slabs: [slab],
    });

    const template = resolveFloorInsulationTemplateFromProfile(insulationProfile, "alongBeams");
    expect(template).not.toBeNull();
    const { pieces, errorMessage } = generateFloorInsulationPieces({
      project: p,
      layerId,
      template: template!,
      profileId: insulationProfileId,
      profile: insulationProfile,
      fillRegion: { kind: "slabUnion" },
      singleCellPointMm: null,
    });
    expect(errorMessage).toBeNull();
    expect(pieces.length).toBeGreaterThan(0);
    const totalArea = pieces.reduce((s, x) => s + x.areaMm2, 0);
    expect(totalArea).toBeGreaterThan(2_000_000);
  });
});
