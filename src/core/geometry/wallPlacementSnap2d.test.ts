import { describe, expect, it } from "vitest";

import { createEmptyProject } from "../domain/projectFactory";
import type { Wall } from "../domain/wall";
import { buildViewportTransform } from "./viewportTransform";
import { resolveWallPlacementToolSnap } from "./wallPlacementSnap2d";

const snapAll = { snapToVertex: true, snapToEdge: true, snapToGrid: true };

function wallOnActiveLayer(p: ReturnType<typeof createEmptyProject>): Wall {
  return {
    id: "w1",
    layerId: p.activeLayerId,
    start: { x: 0, y: 0 },
    end: { x: 2000, y: 0 },
    thicknessMm: 100,
    heightMm: 2500,
    baseElevationMm: 0,
  };
}

describe("resolveWallPlacementToolSnap", () => {
  it("center: привязка к оси стены по экранному порогу", () => {
    const p = createEmptyProject();
    const t = buildViewportTransform(800, 600, 0, 0, 1);
    const w = wallOnActiveLayer(p);
    const proj = { ...p, walls: [w] };
    const raw = { x: 500, y: 11 };
    const r = resolveWallPlacementToolSnap({
      rawWorldMm: raw,
      viewport: t,
      project: proj,
      snapSettings: snapAll,
      gridStepMm: 100,
      linearPlacementMode: "center",
    });
    expect(r.kind).toBe("edge");
    expect(r.point.x).toBeCloseTo(500);
    expect(r.point.y).toBeCloseTo(0);
  });

  it("leftEdge: привязка к левой грани (смещение по нормали)", () => {
    const p = createEmptyProject();
    const t = buildViewportTransform(800, 600, 0, 0, 1);
    const w = wallOnActiveLayer(p);
    const proj = { ...p, walls: [w] };
    const raw = { x: 600, y: -44 };
    const r = resolveWallPlacementToolSnap({
      rawWorldMm: raw,
      viewport: t,
      project: proj,
      snapSettings: snapAll,
      gridStepMm: 100,
      linearPlacementMode: "leftEdge",
    });
    expect(r.kind).toBe("edge");
    expect(r.point.x).toBeCloseTo(600);
    expect(r.point.y).toBeCloseTo(-50);
  });

  it("rightEdge: привязка к правой грани", () => {
    const p = createEmptyProject();
    const t = buildViewportTransform(800, 600, 0, 0, 1);
    const w = wallOnActiveLayer(p);
    const proj = { ...p, walls: [w] };
    const raw = { x: 400, y: 57 };
    const r = resolveWallPlacementToolSnap({
      rawWorldMm: raw,
      viewport: t,
      project: proj,
      snapSettings: snapAll,
      gridStepMm: 100,
      linearPlacementMode: "rightEdge",
    });
    expect(r.kind).toBe("edge");
    expect(r.point.x).toBeCloseTo(400);
    expect(r.point.y).toBeCloseTo(50);
  });

  it("center: торец оси (вершина) приоритетнее линии", () => {
    const p = createEmptyProject();
    const t = buildViewportTransform(800, 600, 0, 0, 1);
    const w = wallOnActiveLayer(p);
    const proj = { ...p, walls: [w] };
    const raw = { x: 2005, y: 4 };
    const r = resolveWallPlacementToolSnap({
      rawWorldMm: raw,
      viewport: t,
      project: proj,
      snapSettings: snapAll,
      gridStepMm: 100,
      linearPlacementMode: "center",
    });
    expect(r.kind).toBe("vertex");
    expect(r.point.x).toBeCloseTo(2000);
    expect(r.point.y).toBeCloseTo(0);
  });

  it("уважает отключение snapToEdge", () => {
    const p = createEmptyProject();
    const t = buildViewportTransform(800, 600, 0, 0, 1);
    const w = wallOnActiveLayer(p);
    const proj = { ...p, walls: [w] };
    const raw = { x: 500, y: 11 };
    const r = resolveWallPlacementToolSnap({
      rawWorldMm: raw,
      viewport: t,
      project: proj,
      snapSettings: { snapToVertex: false, snapToEdge: false, snapToGrid: false },
      gridStepMm: 100,
      linearPlacementMode: "center",
    });
    expect(r.kind).toBe("none");
    expect(r.point).toEqual(raw);
  });
});
