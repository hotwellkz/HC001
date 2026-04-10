import { describe, expect, it } from "vitest";

import type { Opening } from "@/core/domain/opening";
import type { Project } from "@/core/domain/project";
import { createEmptyProject } from "@/core/domain/projectFactory";
import { addWallToProject, createWallEntity } from "@/core/domain/wallOps";
import { addProfile as addProfileToProject } from "@/core/domain/profileMutations";
import type { Profile } from "@/core/domain/profile";

import { resolveObjectEditorForSelection } from "./objectEditorActions";

function testWallProfile(id: string): Profile {
  const t = new Date().toISOString();
  return {
    id,
    name: "T",
    category: "wall",
    markPrefix: "T",
    compositionMode: "layered",
    layers: [{ id: "l1", orderIndex: 0, materialName: "A", materialType: "osb", thicknessMm: 50 }],
    createdAt: t,
    updatedAt: t,
  };
}

function projectWithOneWall(): Project {
  let p = createEmptyProject();
  p = addProfileToProject(p, testWallProfile("prof1"));
  const wall = createWallEntity({
    layerId: p.activeLayerId,
    profileId: "prof1",
    start: { x: 0, y: 0 },
    end: { x: 4000, y: 0 },
    thicknessMm: 50,
    heightMm: 2800,
    baseElevationMm: 0,
  });
  if (!wall) {
    throw new Error("wall");
  }
  return addWallToProject(p, wall);
}

describe("resolveObjectEditorForSelection", () => {
  it("пустое выделение → подсказка", () => {
    const p = createEmptyProject();
    expect(resolveObjectEditorForSelection([], p)).toEqual({
      kind: "hint",
      message: "Сначала выберите объект.",
    });
  });

  it("несколько объектов → подсказка", () => {
    const p = createEmptyProject();
    expect(resolveObjectEditorForSelection(["a", "b"], p).kind).toBe("hint");
  });

  it("стена → wall", () => {
    const p = projectWithOneWall();
    const wid = p.walls[0]!.id;
    expect(resolveObjectEditorForSelection([wid], p)).toEqual({ kind: "wall", wallId: wid });
  });

  it("размещённое окно → window", () => {
    const p0 = projectWithOneWall();
    const wid = p0.walls[0]!.id;
    const opening: Opening = {
      id: "opw",
      wallId: wid,
      kind: "window",
      offsetFromStartMm: 100,
      widthMm: 900,
      heightMm: 1200,
    };
    const p = { ...p0, openings: [opening] };
    expect(resolveObjectEditorForSelection(["opw"], p)).toEqual({ kind: "window", openingId: "opw" });
  });

  it("размещённая дверь → door", () => {
    const p0 = projectWithOneWall();
    const wid = p0.walls[0]!.id;
    const opening: Opening = {
      id: "opd",
      wallId: wid,
      kind: "door",
      offsetFromStartMm: 100,
      widthMm: 900,
      heightMm: 2100,
    };
    const p = { ...p0, openings: [opening] };
    expect(resolveObjectEditorForSelection(["opd"], p)).toEqual({ kind: "door", openingId: "opd" });
  });

  it("kind other → подсказка", () => {
    const p0 = projectWithOneWall();
    const wid = p0.walls[0]!.id;
    const opening: Opening = {
      id: "opo",
      wallId: wid,
      kind: "other",
      offsetFromStartMm: 100,
      widthMm: 600,
      heightMm: 600,
    };
    const p = { ...p0, openings: [opening] };
    expect(resolveObjectEditorForSelection(["opo"], p).kind).toBe("hint");
  });

  it("черновик проёма без стены → подсказка", () => {
    const p0 = projectWithOneWall();
    const opening: Opening = {
      id: "draft",
      wallId: null,
      kind: "window",
      offsetFromStartMm: null,
      widthMm: 900,
      heightMm: 1200,
    };
    const p = { ...p0, openings: [opening] };
    expect(resolveObjectEditorForSelection(["draft"], p).kind).toBe("hint");
  });
});
