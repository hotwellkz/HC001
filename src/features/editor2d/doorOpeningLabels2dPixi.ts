import { Container, Text } from "pixi.js";

import { openingCenterOnWallMm } from "@/core/domain/openingPlacement";
import type { Project } from "@/core/domain/project";
import { cssHexToPixiNumber } from "@/shared/cssColor";

import { collectDimensionLabelScreenPositions } from "./dimensions2dPixi";
import { exteriorNormalForWallLabelMm } from "./wallLabelExteriorNormalMm";
import type { WallMarkAppearance, AppendWallMarkLabels2dOptions } from "./wallMarks2dPixi";
import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

function colors() {
  const cs = getComputedStyle(document.documentElement);
  return {
    fill: cssHexToPixiNumber(cs.getPropertyValue("--color-wall-mark-text").trim() || "#e8ecf1"),
    outline: cssHexToPixiNumber(cs.getPropertyValue("--color-wall-mark-outline").trim() || "#14171b"),
  };
}

function doorOrderMap(project: Project): ReadonlyMap<string, number> {
  const doors = project.openings
    .filter((o): o is typeof o & { wallId: string; offsetFromStartMm: number } => o.kind === "door" && o.wallId != null && o.offsetFromStartMm != null)
    .sort((a, b) => (a.wallId === b.wallId ? a.offsetFromStartMm - b.offsetFromStartMm : a.wallId.localeCompare(b.wallId)));
  const out = new Map<string, number>();
  for (let i = 0; i < doors.length; i++) out.set(doors[i]!.id, i + 1);
  return out;
}

export function appendDoorOpeningLabels2d(
  container: Container,
  project: Project,
  t: ViewportTransform,
  appearance: WallMarkAppearance,
  options?: AppendWallMarkLabels2dOptions,
): void {
  const ctx = appearance === "context";
  const c = colors();
  const dimCenters = options?.dimensionProject ? collectDimensionLabelScreenPositions(options.dimensionProject, t) : [];
  const nums = doorOrderMap(project);
  for (const o of project.openings) {
    if (o.kind !== "door" || o.wallId == null || o.offsetFromStartMm == null) continue;
    const wall = project.walls.find((w) => w.id === o.wallId);
    if (!wall) continue;
    const center = openingCenterOnWallMm(wall, o);
    const { nx, ny } = exteriorNormalForWallLabelMm(wall, project.walls, project.walls);
    const fs = Math.max(7.2, Math.min(9.2, Math.max(2, wall.thicknessMm * t.zoomPixelsPerMm) * 0.2 + 6.5));
    const oMm = wall.thicknessMm / 2 + 14 / Math.max(0.01, t.zoomPixelsPerMm);
    const p = worldToScreen(center.x + nx * oMm, center.y + ny * oMm, t);
    if (dimCenters.some((d) => Math.hypot(d.x - p.x, d.y - p.y) < 18 + fs)) continue;
    const label = new Text({
      text: `Д_${nums.get(o.id) ?? 0}\n${Math.round(o.widthMm)}/${Math.round(o.heightMm)}`,
      style: {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: fs,
        lineHeight: fs + 2,
        align: "center",
        fill: c.fill,
        fontWeight: "600",
        stroke: { color: c.outline, width: Math.max(1, fs * 0.1) },
      },
    });
    label.anchor.set(0.5);
    label.x = p.x;
    label.y = p.y;
    label.alpha = ctx ? 0.4 : 0.94;
    container.addChild(label);
  }
}

