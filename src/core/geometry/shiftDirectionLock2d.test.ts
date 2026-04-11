import { describe, expect, it } from "vitest";

import { createEmptyProject } from "../domain/projectFactory";
import { buildViewportTransform } from "./viewportTransform";
import {
  computeLengthChangePreviewAlongAxis,
  projectPointOntoRayForward,
  unitDirectionOrNull,
} from "./shiftDirectionLock2d";

describe("shiftDirectionLock2d", () => {
  it("projectPointOntoRayForward clamps backward to origin", () => {
    const o = { x: 0, y: 0 };
    const u = { x: 1, y: 0 };
    const p = projectPointOntoRayForward(o, u, { x: -50, y: 10 });
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it("projectPointOntoRayForward projects forward", () => {
    const o = { x: 100, y: 200 };
    const u = { x: 0, y: 1 };
    const p = projectPointOntoRayForward(o, u, { x: 130, y: 500 });
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(500, 5);
  });

  it("unitDirectionOrNull returns null for degenerate segment", () => {
    expect(unitDirectionOrNull({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeNull();
  });
});

describe("computeLengthChangePreviewAlongAxis", () => {
  it("без shift-lock даёт превью на оси X по сырому/снапу", () => {
    const project = createEmptyProject();
    const t = buildViewportTransform(800, 600, 0, 0, 0.5);
    const r = computeLengthChangePreviewAlongAxis({
      fixedEndMm: { x: 0, y: 0 },
      axisUx: 1,
      axisUy: 0,
      rawWorldMm: { x: 3000, y: 400 },
      viewport: t,
      project,
      snapSettings: { snapToVertex: true, snapToEdge: true, snapToGrid: true },
      gridStepMm: 100,
      shiftDirectionLockUnit: null,
      minLenMm: 50,
    });
    expect(r.shiftLockReferenceMm).toBeNull();
    expect(r.previewMovingMm.y).toBeCloseTo(0, 4);
    expect(r.previewMovingMm.x).toBeGreaterThanOrEqual(50);
  });
});
