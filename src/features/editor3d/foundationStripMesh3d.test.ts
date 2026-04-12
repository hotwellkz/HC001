import { Euler, Matrix4, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import type { FoundationStripSegmentEntity } from "@/core/domain/foundationStrip";
import { createEmptyProject } from "@/core/domain/projectFactory";
import {
  buildOrthoRectangleFoundationStripRingEntity,
  foundationStripSegmentFootprintQuadMm,
} from "@/core/domain/foundationStripGeometry";

import { buildFoundationStripExtrudeGeometry, selectFoundationStripsForScene3d } from "./foundationStripMesh3d";

describe("foundationStripMesh3d", () => {
  it("selectFoundationStripsForScene3d: скрытый слой исключается", () => {
    let p = createEmptyProject();
    const layerId = p.layers[0]!.id;
    p = {
      ...p,
      layers: p.layers.map((l) => (l.id === layerId ? { ...l, isVisible: false } : l)),
      foundationStrips: [
        buildOrthoRectangleFoundationStripRingEntity({
          layerId,
          xmin: 0,
          xmax: 2000,
          ymin: 0,
          ymax: 1000,
          depthMm: 400,
          sideOutMm: 50,
          sideInMm: 250,
          createdAt: "t",
          newId: () => "fs1",
        }),
      ],
    };
    expect(selectFoundationStripsForScene3d(p)).toHaveLength(0);
  });

  it("selectFoundationStripsForScene3d: слой скрыт в панели 3D — лента не в сцене", () => {
    let p = createEmptyProject();
    const layerId = p.layers[0]!.id;
    p = {
      ...p,
      viewState: { ...p.viewState, hidden3dProjectLayerIds: [layerId] },
      foundationStrips: [
        buildOrthoRectangleFoundationStripRingEntity({
          layerId,
          xmin: 0,
          xmax: 2000,
          ymin: 0,
          ymax: 1000,
          depthMm: 400,
          sideOutMm: 50,
          sideInMm: 250,
          createdAt: "t",
          newId: () => "fs1",
        }),
      ],
    };
    expect(selectFoundationStripsForScene3d(p)).toHaveLength(0);
  });

  it("buildFoundationStripExtrudeGeometry: кольцо даёт геометрию с ненулевым объёмом", () => {
    const p = createEmptyProject();
    const layerId = p.activeLayerId;
    const ring = buildOrthoRectangleFoundationStripRingEntity({
      layerId,
      xmin: 0,
      xmax: 2000,
      ymin: 0,
      ymax: 1000,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "t",
      newId: () => "fs1",
    });
    const project = { ...p, foundationStrips: [ring] };
    const built = buildFoundationStripExtrudeGeometry(ring, project);
    expect(built).not.toBeNull();
    built!.geometry.computeBoundingBox();
    const b = built!.geometry.boundingBox!;
    expect(b.max.z - b.min.z).toBeCloseTo(0.4, 2);
    expect(b.max.x - b.min.x).toBeGreaterThan(0);
    built!.geometry.dispose();
  });

  it("после Rx(-π/2) мировая Z совпадает со стенами: Z = -planY (м)", () => {
    const p = createEmptyProject();
    const layerId = p.activeLayerId;
    const seg: FoundationStripSegmentEntity = {
      kind: "segment",
      id: "seg1",
      layerId,
      axisStart: { x: 0, y: 3500 },
      axisEnd: { x: 2000, y: 3500 },
      outwardNormalX: 0,
      outwardNormalY: 1,
      depthMm: 400,
      sideOutMm: 50,
      sideInMm: 250,
      createdAt: "t",
    };
    const quad = foundationStripSegmentFootprintQuadMm(
      seg.axisStart,
      seg.axisEnd,
      seg.outwardNormalX,
      seg.outwardNormalY,
      seg.sideOutMm,
      seg.sideInMm,
    );
    const project = { ...p, foundationStrips: [seg] };
    const built = buildFoundationStripExtrudeGeometry(seg, project);
    expect(built).not.toBeNull();
    const pos = built!.geometry.getAttribute("position");
    const rot = new Matrix4().makeRotationFromEuler(new Euler(-Math.PI / 2, 0, 0));
    const planYOuterMm = quad[0]!.y;
    const tol = 0.02;
    let matched = false;
    for (let i = 0; i < pos.count; i++) {
      const v = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(rot);
      if (Math.abs(v.x - quad[0]!.x * 0.001) < tol && Math.abs(v.z + planYOuterMm * 0.001) < tol) {
        matched = true;
        break;
      }
    }
    expect(matched).toBe(true);
    built!.geometry.dispose();
  });
});
