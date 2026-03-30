import type { Wall } from "@/core/domain/wall";

const EPS_MM = 2;

function isHorizontal(w: Wall): boolean {
  return Math.abs(w.end.y - w.start.y) < EPS_MM;
}

function isVertical(w: Wall): boolean {
  return Math.abs(w.end.x - w.start.x) < EPS_MM;
}

type RectSide = "bottom" | "right" | "top" | "left";

/** Единичный вектор вдоль грани прямоугольника при обходе CCW (Y вверх). */
function ccwForwardOnSide(side: RectSide): { readonly ux: number; readonly uy: number } {
  switch (side) {
    case "bottom":
      return { ux: 1, uy: 0 };
    case "right":
      return { ux: 0, uy: 1 };
    case "top":
      return { ux: -1, uy: 0 };
    case "left":
      return { ux: 0, uy: -1 };
    default:
      return { ux: 1, uy: 0 };
  }
}

/** Внешняя нормаль: «вправо» от направления обхода CCW по контуру. */
export function exteriorNormalFromCCWForward(ux: number, uy: number): { readonly nx: number; readonly ny: number } {
  const len = Math.hypot(ux, uy);
  if (len < 1e-9) {
    return { nx: 0, ny: 1 };
  }
  const fx = ux / len;
  const fy = uy / len;
  return { nx: fy, ny: -fx };
}

function spanX(w: Wall): { readonly lo: number; readonly hi: number } {
  return { lo: Math.min(w.start.x, w.end.x), hi: Math.max(w.start.x, w.end.x) };
}

function spanY(w: Wall): { readonly lo: number; readonly hi: number } {
  return { lo: Math.min(w.start.y, w.end.y), hi: Math.max(w.start.y, w.end.y) };
}

/**
 * Для ровно четырёх ортогональных стен, образующих прямоугольник по bbox,
 * возвращает внешнюю нормаль к каждой стене (монтаж — снаружи контура).
 */
export function tryOrthogonalRectangleExteriorNormalsMm(
  walls: readonly Wall[],
): ReadonlyMap<string, { readonly nx: number; readonly ny: number }> | null {
  if (walls.length !== 4) {
    return null;
  }
  for (const w of walls) {
    if (!isHorizontal(w) && !isVertical(w)) {
      return null;
    }
  }

  const xs = new Set<number>();
  const ys = new Set<number>();
  for (const w of walls) {
    xs.add(Math.round(w.start.x));
    xs.add(Math.round(w.end.x));
    ys.add(Math.round(w.start.y));
    ys.add(Math.round(w.end.y));
  }
  if (xs.size !== 2 || ys.size !== 2) {
    return null;
  }
  const xa = [...xs].sort((a, b) => a - b);
  const ya = [...ys].sort((a, b) => a - b);
  const xmin = xa[0]!;
  const xmax = xa[1]!;
  const ymin = ya[0]!;
  const ymax = ya[1]!;

  const out = new Map<string, { nx: number; ny: number }>();
  const usedSides = new Set<RectSide>();

  for (const w of walls) {
    let side: RectSide | null = null;
    if (isHorizontal(w)) {
      const y = (w.start.y + w.end.y) / 2;
      const sx = spanX(w);
      if (Math.abs(y - ymin) < EPS_MM * 2 && Math.abs(sx.lo - xmin) < EPS_MM * 2 && Math.abs(sx.hi - xmax) < EPS_MM * 2) {
        side = "bottom";
      } else if (Math.abs(y - ymax) < EPS_MM * 2 && Math.abs(sx.lo - xmin) < EPS_MM * 2 && Math.abs(sx.hi - xmax) < EPS_MM * 2) {
        side = "top";
      }
    } else {
      const x = (w.start.x + w.end.x) / 2;
      const sy = spanY(w);
      if (Math.abs(x - xmin) < EPS_MM * 2 && Math.abs(sy.lo - ymin) < EPS_MM * 2 && Math.abs(sy.hi - ymax) < EPS_MM * 2) {
        side = "left";
      } else if (Math.abs(x - xmax) < EPS_MM * 2 && Math.abs(sy.lo - ymin) < EPS_MM * 2 && Math.abs(sy.hi - ymax) < EPS_MM * 2) {
        side = "right";
      }
    }
    if (!side || usedSides.has(side)) {
      return null;
    }
    usedSides.add(side);
    const f = ccwForwardOnSide(side);
    out.set(w.id, exteriorNormalFromCCWForward(f.ux, f.uy));
  }

  if (usedSides.size !== 4) {
    return null;
  }
  return out;
}

function centroidOfWallMidpoints(walls: readonly Wall[]): { readonly x: number; readonly y: number } {
  if (walls.length === 0) {
    return { x: 0, y: 0 };
  }
  let sx = 0;
  let sy = 0;
  for (const w of walls) {
    sx += (w.start.x + w.end.x) / 2;
    sy += (w.start.y + w.end.y) / 2;
  }
  return { x: sx / walls.length, y: sy / walls.length };
}

/**
 * Выбор нормали перпендикулярно оси стены, наиболее совпадающей с вектором (mid − center):
 * «наружу» относительно центра массы контура (для выпуклых форм — снаружи здания).
 */
export function outwardNormalTowardWallFromCenterMm(
  wall: Wall,
  center: { readonly x: number; readonly y: number },
): { readonly nx: number; readonly ny: number } {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return { nx: 0, ny: 1 };
  }
  const ux = dx / len;
  const uy = dy / len;
  const n1 = { nx: -uy, ny: ux };
  const n2 = { nx: uy, ny: -ux };
  const mx = (wall.start.x + wall.end.x) / 2;
  const my = (wall.start.y + wall.end.y) / 2;
  const vx = mx - center.x;
  const vy = my - center.y;
  const d1 = n1.nx * vx + n1.ny * vy;
  const d2 = n2.nx * vx + n2.ny * vy;
  return d1 >= d2 ? n1 : n2;
}

/**
 * Внешняя единичная нормаль для подписи стены: прямоугольник из 4 стен → строго по CCW;
 * иначе — по центроиду подписываемых стен.
 */
export function exteriorNormalForWallLabelMm(
  wall: Wall,
  wallsWithLabel: readonly Wall[],
  allWallsFallback: readonly Wall[],
): { readonly nx: number; readonly ny: number } {
  const rect = tryOrthogonalRectangleExteriorNormalsMm(wallsWithLabel);
  if (rect?.has(wall.id)) {
    return rect.get(wall.id)!;
  }
  const center = centroidOfWallMidpoints(wallsWithLabel.length > 0 ? wallsWithLabel : allWallsFallback);
  return outwardNormalTowardWallFromCenterMm(wall, center);
}
