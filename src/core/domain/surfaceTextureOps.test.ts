import { describe, expect, it } from "vitest";

import { createEmptyProject } from "./projectFactory";
import { resolveSurfaceTextureBinding } from "./surfaceTextureResolve";
import {
  applySurfaceTextureToProject,
  meshKeyFromEditorPick,
  normalizeSurfaceTextureState,
} from "./surfaceTextureOps";
import { EMPTY_SURFACE_TEXTURE_STATE } from "./surfaceTextureState";

describe("surfaceTextureOps", () => {
  it("normalizeSurfaceTextureState: пустое и корректное", () => {
    expect(normalizeSurfaceTextureState(undefined)).toEqual(EMPTY_SURFACE_TEXTURE_STATE);
    expect(
      normalizeSurfaceTextureState({
        project: { textureId: "wood-oak-1", scalePercent: 100 },
        byLayerId: { L1: { textureId: "brick-red-1", scalePercent: 50 } },
        byMeshKey: { "wall::k": { textureId: "stone-granite-1", scalePercent: 200 } },
      }),
    ).toMatchObject({
      project: { textureId: "wood-oak-1", scalePercent: 100 },
      byLayerId: { L1: { textureId: "brick-red-1", scalePercent: 50 } },
      byMeshKey: { "wall::k": { textureId: "stone-granite-1", scalePercent: 200 } },
    });
  });

  it("иерархия: meshKey перекрывает слой и проект", () => {
    let p = createEmptyProject();
    p = applySurfaceTextureToProject(p, {
      mode: "project",
      reset: false,
      binding: { textureId: "t0", scalePercent: 100 },
      meshKey: "x",
      layerId: "L",
    });
    p = applySurfaceTextureToProject(p, {
      mode: "layer",
      reset: false,
      binding: { textureId: "t1", scalePercent: 100 },
      meshKey: "x",
      layerId: p.activeLayerId,
    });
    p = applySurfaceTextureToProject(p, {
      mode: "object",
      reset: false,
      binding: { textureId: "t2", scalePercent: 100 },
      meshKey: "wall::seg",
      layerId: p.activeLayerId,
    });
    expect(p.surfaceTextureState.project?.textureId).toBe("t0");
    expect(p.surfaceTextureState.byLayerId[p.activeLayerId]?.textureId).toBe("t1");
    expect(p.surfaceTextureState.byMeshKey["wall::seg"]?.textureId).toBe("t2");
    const st = p.surfaceTextureState;
    expect(resolveSurfaceTextureBinding(st, "wall::seg", p.activeLayerId)?.textureId).toBe("t2");
    expect(resolveSurfaceTextureBinding(st, "wall::other", p.activeLayerId)?.textureId).toBe("t1");
    expect(resolveSurfaceTextureBinding(st, "wall::other", "unknown-layer")?.textureId).toBe("t0");
  });

  it("meshKeyFromEditorPick", () => {
    expect(
      meshKeyFromEditorPick({
        kind: "wall",
        entityId: "w1",
        reactKey: "w1-shell-0",
      }),
    ).toBe("wall::w1-shell-0");
  });
});
