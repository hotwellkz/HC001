import { describe, expect, it } from "vitest";

import { createEmptyProject } from "@/core/domain/projectFactory";

import type { Wall } from "@/core/domain/wall";

import type { WallRenderMeshSpec } from "./wallMeshSpec";
import {
  isCalculationSolidVisible,
  isProfileMaterialGypsumBoard,
  isProjectLayerVisibleIn3d,
  isWallMeshSpecVisible,
} from "./view3dVisibility";

describe("view3dVisibility", () => {
  it("isProjectLayerVisibleIn3d: слой в hidden3dProjectLayerIds скрыт", () => {
    const base = createEmptyProject();
    const lid = base.layers[0]!.id;
    const p = {
      ...base,
      viewState: { ...base.viewState, hidden3dProjectLayerIds: [lid] },
    };
    expect(isProjectLayerVisibleIn3d(lid, p)).toBe(false);
    expect(isProjectLayerVisibleIn3d("other", p)).toBe(true);
  });

  it("стена на скрытом в 3D слое: OSB не виден даже при включённом OSB", () => {
    const base = createEmptyProject();
    const lid = base.layers[0]!.id;
    const wall: Wall = {
      id: "w1",
      layerId: lid,
      start: { x: 0, y: 0 },
      end: { x: 3000, y: 0 },
      thicknessMm: 174,
      heightMm: 2800,
    };
    const p = {
      ...base,
      walls: [wall],
      viewState: { ...base.viewState, hidden3dProjectLayerIds: [lid], show3dLayerOsb: true },
    };
    const spec: WallRenderMeshSpec = {
      reactKey: "w1",
      wallId: "w1",
      position: [0, 0, 0],
      rotationY: 0,
      width: 0.01,
      height: 2,
      depth: 1,
      materialType: "osb",
    };
    expect(isWallMeshSpecVisible(spec, p)).toBe(false);
  });

  it("isProfileMaterialGypsumBoard: только тип gypsum из профиля", () => {
    expect(isProfileMaterialGypsumBoard("gypsum")).toBe(true);
    expect(isProfileMaterialGypsumBoard("osb")).toBe(false);
    expect(isProfileMaterialGypsumBoard("steel")).toBe(false);
    expect(isProfileMaterialGypsumBoard("default")).toBe(false);
  });

  it("ГКЛ в слоях стены: видимость только от show3dLayerGypsum", () => {
    const base = createEmptyProject();
    const spec: WallRenderMeshSpec = {
      reactKey: "w1-l1",
      wallId: "w1",
      position: [0, 0, 0],
      rotationY: 0,
      width: 0.01,
      height: 2,
      depth: 1,
      materialType: "gypsum",
    };
    const on = { ...base, viewState: { ...base.viewState, show3dLayerGypsum: true } };
    const off = { ...base, viewState: { ...base.viewState, show3dLayerGypsum: false } };
    expect(isWallMeshSpecVisible(spec, on)).toBe(true);
    expect(isWallMeshSpecVisible(spec, off)).toBe(false);
  });

  it("расчётный solid с materialType gypsum управляется show3dLayerGypsum", () => {
    const base = createEmptyProject();
    const spec = {
      reactKey: "k",
      wallId: "w1",
      calculationId: "c1",
      source: "sip" as const,
      position: [0, 0, 0] as const,
      rotationY: 0,
      width: 0.1,
      height: 0.1,
      depth: 0.1,
      materialType: "gypsum" as const,
    };
    const offGy = { ...base, viewState: { ...base.viewState, show3dLayerGypsum: false, show3dLayerEps: true } };
    const offEps = { ...base, viewState: { ...base.viewState, show3dLayerGypsum: true, show3dLayerEps: false } };
    expect(isCalculationSolidVisible(spec, offGy)).toBe(false);
    expect(isCalculationSolidVisible(spec, offEps)).toBe(true);
  });
});
