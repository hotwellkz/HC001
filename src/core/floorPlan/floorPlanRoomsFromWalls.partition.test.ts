import { describe, expect, it } from "vitest";

import { createEmptyProject } from "@/core/domain/projectFactory";
import type { Project } from "@/core/domain/project";
import type { Wall } from "@/core/domain/wall";

import {
  computeFloorPlanRoomLoops,
  diagnoseFloorPlanRoomDetection,
  ROOM_WALL_FOOTPRINT_AXIS_EXTEND_MM,
} from "./floorPlanRoomsFromWalls";

/** Прямоугольный контур + вертикаль в центре + горизонтальная ГКЛ в правой половине → три помещения. */
function projectThreeRoomsWithGklPartition(): Project {
  const p = createEmptyProject();
  const layerId = p.activeLayerId;
  const wall = (
    id: string,
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    thicknessMm: number,
  ): Wall => ({
    id,
    layerId,
    start: { x: sx, y: sy },
    end: { x: ex, y: ey },
    thicknessMm,
    heightMm: 2800,
    baseElevationMm: 0,
  });

  return {
    ...p,
    walls: [
      wall("o1", 0, 0, 10_000, 0, 174),
      wall("o2", 10_000, 0, 10_000, 6000, 174),
      wall("o3", 10_000, 6000, 0, 6000, 174),
      wall("o4", 0, 6000, 0, 0, 174),
      wall("v_mid", 5000, 0, 5000, 6000, 100),
      wall("h_gkl", 5000, 3000, 10_000, 3000, 100),
    ],
  };
}

describe("computeFloorPlanRoomLoops / перегородки", () => {
  it("разделяет правую колонку горизонтальной ГКЛ: три отдельных помещения", () => {
    const p = projectThreeRoomsWithGklPartition();
    const walls = p.walls;
    const rooms = computeFloorPlanRoomLoops(p, walls);
    expect(rooms.length).toBe(3);
    const areas = rooms.map((r) => r.areaMm2 / 1e6).sort((a, b) => b - a);
    expect(areas[0]!).toBeGreaterThan(15);
    expect(areas[1]!).toBeGreaterThan(10);
    expect(areas[2]!).toBeGreaterThan(10);
  });

  it("диагностика: совпадает с числом принятых комнат", () => {
    const p = projectThreeRoomsWithGklPartition();
    const d = diagnoseFloorPlanRoomDetection(p);
    expect(d.acceptedRoomCount).toBe(3);
    expect(d.axisExtendMm).toBe(ROOM_WALL_FOOTPRINT_AXIS_EXTEND_MM);
    expect(d.wallsEmptyAfterOpenings.length).toBe(0);
  });
});
