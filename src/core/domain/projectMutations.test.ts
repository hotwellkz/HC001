import { describe, expect, it } from "vitest";

import { createDemoProject } from "./demoProject";
import type { Dimension } from "./dimension";
import { deleteEntitiesFromProject } from "./projectMutations";

describe("projectMutations", () => {
  it("удаляет стену и каскадно проёмы на ней", () => {
    const p = createDemoProject();
    const wallId = p.walls[0]?.id;
    if (!wallId) {
      throw new Error("demo");
    }
    const onWall = p.openings.filter((o) => o.wallId === wallId);
    expect(onWall.length).toBeGreaterThan(0);

    const next = deleteEntitiesFromProject(p, new Set([wallId]));
    expect(next.walls).toHaveLength(p.walls.length - 1);
    expect(next.openings.every((o) => o.wallId !== wallId)).toBe(true);
  });

  it("удаляет только выбранный opening", () => {
    const p = createDemoProject();
    const oId = p.openings[0]?.id;
    if (!oId) {
      throw new Error("demo");
    }
    const next = deleteEntitiesFromProject(p, new Set([oId]));
    expect(next.openings).toHaveLength(p.openings.length - 1);
    expect(next.openings.every((o) => o.id !== oId)).toBe(true);
  });

  it("удаляет размеры, привязанные к удаляемым стенам", () => {
    const p = createDemoProject();
    const wallId = p.walls[0]?.id;
    if (!wallId) {
      throw new Error("demo");
    }
    const dim: Dimension = {
      id: "d1",
      a: { x: 0, y: 0 },
      b: { x: 100, y: 0 },
      wallIds: [wallId],
    };
    const withDim = { ...p, dimensions: [...p.dimensions, dim] };
    const next = deleteEntitiesFromProject(withDim, new Set([wallId]));
    expect(next.dimensions.every((d) => d.id !== "d1")).toBe(true);
  });
});
