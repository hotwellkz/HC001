import { Container, Text } from "pixi.js";

import type { Project } from "@/core/domain/project";
import { MIN_WALL_MARK_SCREEN_LENGTH_PX, wallSegmentScreenLengthPx } from "@/core/domain/wallMarking";
import { readableAlongSegmentRotationRad } from "@/core/geometry/readableAlongSegmentRotationRad";
import { cssColorToPixiNumber } from "@/shared/cssColor";

import {
  collectDimensionLabelCentersWorldMmForPlan,
  collectDimensionLabelScreenPositions,
} from "./dimensions2dPixi";
import {
  buildWallLabelAlongCandidatesMm,
  buildWallLabelForbiddenAlongIntervalsMm,
  collectWallOpeningMarkerLabelObstaclesPx,
  findBestWallLabelAlongMm,
  getWallLabelStickyAlongMm,
  isClearOfOpeningLabelObstaclesPx,
  isWallLabelStickyAlongStillValid,
  isWallLabelWorldMmClearOfOpeningZones,
  mergeWallLabelForbiddenAlongIntervalsMm,
  setWallLabelStickyAlongMm,
  shrinkWallLabelFreeSegmentsForHalfWidthMm,
  wallLabelFreeAlongSegmentsMm,
  wallLabelPlacementFingerprint,
} from "./wallLabelLayout2d";
import { exteriorNormalForWallLabelMm } from "./wallLabelExteriorNormalMm";
import type { ViewportTransform } from "./viewportTransforms";
import { worldToScreen } from "./viewportTransforms";

export type WallMarkAppearance = "active" | "context";

/** Отступ подписи от края полосы стены, в экранных px (масштабируется в мм). */
const LABEL_OUTSET_PX_MIN = 8;
const LABEL_OUTSET_PX_MAX = 13;
/** Минимальное расстояние до центра подписи размера, px. */
const CLEARANCE_FROM_DIM_LABEL_PX = 18;
/** Зазор марки стены ↔ подпись проёма (экран, px). */
const CLEARANCE_WALL_MARK_TO_OPENING_LABEL_PX = 5;
/** Радиус «занятости» подписи стены для анти-наложения, px (оценка). */
function approxLabelRadiusPx(fontSize: number, labelLen: number): number {
  return Math.max(10, fontSize * (0.4 + 0.2 * Math.max(1, labelLen)));
}

function readWallMarkThemeColors(): { readonly fill: number; readonly outline: number } {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const fill = cs.getPropertyValue("--color-wall-mark-text").trim() || "#e8ecf1";
  const outline = cs.getPropertyValue("--color-wall-mark-outline").trim() || "#14171b";
  return { fill: cssColorToPixiNumber(fill), outline: cssColorToPixiNumber(outline) };
}

function screenDist(
  a: { readonly x: number; readonly y: number },
  b: { readonly x: number; readonly y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isClearOfDimLabels(
  p: { readonly x: number; readonly y: number },
  dimCenters: readonly { readonly x: number; readonly y: number }[],
  radiusPx: number,
): boolean {
  for (const d of dimCenters) {
    if (screenDist(p, d) < CLEARANCE_FROM_DIM_LABEL_PX + radiusPx * 0.35) {
      return false;
    }
  }
  return true;
}

function isClearOfPlacedWallLabels(
  p: { readonly x: number; readonly y: number },
  placed: readonly { readonly x: number; readonly y: number; readonly r: number }[],
  radiusPx: number,
): boolean {
  for (const q of placed) {
    if (screenDist(p, { x: q.x, y: q.y }) < q.r + radiusPx + 3) {
      return false;
    }
  }
  return true;
}

export function clearWallMarkLabelContainer(container: Container): void {
  for (const c of [...container.children]) {
    c.destroy({ children: true });
  }
  container.removeChildren();
}

export type AppendWallMarkLabels2dOptions = {
  /**
   * Проект для позиций размерных подписей (активный слой).
   * Если не задан — анти-наложение с размерами не выполняется.
   */
  readonly dimensionProject?: Project;
};

/**
 * Подписи марок снаружи полосы стены: середина оси + сдвиг по внешней нормали
 * (для прямоугольника — по CCW-контуру; иначе — от центроида к стене).
 */
export function appendWallMarkLabels2d(
  container: Container,
  project: Project,
  t: ViewportTransform,
  appearance: WallMarkAppearance,
  options?: AppendWallMarkLabels2dOptions,
): void {
  const ctx = appearance === "context";
  const { fill: fillCol, outline: outlineCol } = readWallMarkThemeColors();
  const dimProject = options?.dimensionProject;
  const dimCenters = dimProject ? collectDimensionLabelScreenPositions(dimProject, t) : [];
  const openingLabelObstacles = collectWallOpeningMarkerLabelObstaclesPx(project, t, dimCenters);

  const wallsWithLabel = project.walls.filter((w) => {
    const label = w.markLabel?.trim();
    if (!label) {
      return false;
    }
    return wallSegmentScreenLengthPx(w, t.zoomPixelsPerMm) >= MIN_WALL_MARK_SCREEN_LENGTH_PX;
  });

  const dimWorldMm = dimProject ? collectDimensionLabelCentersWorldMmForPlan(dimProject) : [];

  type Candidate = {
    readonly label: string;
    readonly screen: { x: number; y: number };
    readonly ang: number;
    /** Фактический размер шрифта после подбора позиции. */
    readonly fs: number;
  };

  const candidates: Candidate[] = [];
  const placed: { x: number; y: number; r: number }[] = [];

  for (const w of wallsWithLabel) {
    const label = w.markLabel!.trim();
    const dx = w.end.x - w.start.x;
    const dy = w.end.y - w.start.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) {
      continue;
    }
    const ux = dx / len;
    const uy = dy / len;
    const { nx: n0x, ny: n0y } = exteriorNormalForWallLabelMm(w, wallsWithLabel, project.walls);

    const strokePx = Math.max(2, w.thicknessMm * t.zoomPixelsPerMm);
    const fsBase = Math.max(8, Math.min(10.5, strokePx * 0.22 + 7));
    const ang = readableAlongSegmentRotationRad(Math.atan2(-dy, dx));

    const outsetPx = Math.min(LABEL_OUTSET_PX_MAX, Math.max(LABEL_OUTSET_PX_MIN, 10 + strokePx * 0.03));
    const halfT = w.thicknessMm / 2;

    const fingerprint = wallLabelPlacementFingerprint(w, project);
    const forbiddenRaw = buildWallLabelForbiddenAlongIntervalsMm(w, project, dimWorldMm);
    const forbidden = mergeWallLabelForbiddenAlongIntervalsMm(forbiddenRaw, len);
    const freeAlong = wallLabelFreeAlongSegmentsMm(forbidden, len);

    const outsetScaleSteps = [1, 0.88, 0.76];
    const fsScaleSteps = [1, 0.9, 0.82];

    let chosen: { x: number; y: number } | null = null;
    let chosenFs = fsBase;
    let chosenR = approxLabelRadiusPx(fsBase, label.length);
    let placedFromSearch = false;
    let chosenAlongFromStart: number | null = null;

    const stickyRaw = getWallLabelStickyAlongMm(w.id, fingerprint);
    const stickyAlong =
      stickyRaw != null && isWallLabelStickyAlongStillValid(stickyRaw, freeAlong) ? stickyRaw : null;

    outer: for (const fsMult of fsScaleSteps) {
      const fsTry = Math.max(7, fsBase * fsMult);
      const rTry = approxLabelRadiusPx(fsTry, label.length);
      const halfAlongMm = Math.max(36, rTry / Math.max(0.01, t.zoomPixelsPerMm));
      const shrunk = shrinkWallLabelFreeSegmentsForHalfWidthMm(freeAlong, halfAlongMm);
      const walkSegments = shrunk.length ? shrunk : freeAlong;
      const preferredAlong = findBestWallLabelAlongMm(walkSegments, len);
      const alongCandidates = buildWallLabelAlongCandidatesMm(
        freeAlong,
        walkSegments,
        len,
        preferredAlong,
        stickyAlong,
      );

      for (const scale of outsetScaleSteps) {
        const outsetMm = (outsetPx * scale) / t.zoomPixelsPerMm;
        for (const along of alongCandidates) {
          const ax = w.start.x + ux * along + n0x * (halfT + outsetMm);
          const ay = w.start.y + uy * along + n0y * (halfT + outsetMm);
          const s = worldToScreen(ax, ay, t);
          if (
            isClearOfDimLabels(s, dimCenters, rTry) &&
            isClearOfPlacedWallLabels(s, placed, rTry) &&
            isClearOfOpeningLabelObstaclesPx(
              s,
              openingLabelObstacles,
              w.id,
              rTry,
              CLEARANCE_WALL_MARK_TO_OPENING_LABEL_PX,
            ) &&
            isWallLabelWorldMmClearOfOpeningZones(ax, ay, w, project, 12)
          ) {
            chosen = { x: s.x, y: s.y };
            chosenFs = fsTry;
            chosenR = rTry;
            chosenAlongFromStart = along;
            placedFromSearch = true;
            break outer;
          }
        }
      }
    }

    if (!chosen || !placedFromSearch) {
      continue;
    }

    if (chosenAlongFromStart != null) {
      setWallLabelStickyAlongMm(w.id, fingerprint, chosenAlongFromStart);
    }

    candidates.push({
      label,
      screen: chosen,
      ang,
      fs: chosenFs,
    });
    placed.push({ x: chosen.x, y: chosen.y, r: chosenR });
  }

  for (const c of candidates) {
    const txt = new Text({
      text: c.label,
      style: {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: c.fs,
        fill: fillCol,
        fontWeight: "500",
        stroke: { color: outlineCol, width: Math.max(1.2, c.fs * 0.09) },
      },
    });
    txt.anchor.set(0.5);
    txt.x = c.screen.x;
    txt.y = c.screen.y;
    txt.rotation = c.ang;
    txt.alpha = ctx ? 0.42 : 0.96;
    container.addChild(txt);
  }
}
