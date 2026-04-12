/**
 * Подрезка вертикальных стеновых элементов по нижней рабочей поверхности кровельного «пирога».
 * Плоскость: внешняя поверхность ската со смещением внутрь на сумму толщин слоёв (покрытие, обрешётка, мембрана).
 *
 * Контур подрезки вдоль стены — не одна прямая между торцами: вдоль оси стены снимается профиль
 * min(Y_кровли) в каждой точке плана (все скаты), затем упрощается (RDP). Так учитываются конёк,
 * два ската и изломы силуэта.
 */

import { Vector3 } from "three";

import { computeAllRoofPlanesZAdjustMmByPlaneIdInProject } from "@/core/domain/roofGroupHeightAdjust";
import { getProfileById } from "@/core/domain/profileOps";
import type { Project } from "@/core/domain/project";
import { DEFAULT_ROOF_PROFILE_ASSEMBLY, type RoofProfileAssembly } from "@/core/domain/roofProfileAssembly";
import type { RoofPlaneEntity } from "@/core/domain/roofPlane";
import { roofPlanePolygonMm } from "@/core/domain/roofPlane";
import type { Wall } from "@/core/domain/wall";
import { wallWorldBottomMm } from "@/core/domain/layerVerticalStack";
import { pointInPolygonMm } from "@/core/domain/wallLumberPlan2dGeometry";
import {
  buildRoofSlopeSurfaceMeshMm,
  offsetRoofMeshMm,
  roofLayerBaseMmForPlane,
  type RoofSlopeSurfaceMeshMm,
} from "@/core/geometry/roofAssemblyGeometry3d";

export type WallRoofUnderTrim = NonNullable<Wall["roofUnderTrim"]>;

const MIN_WALL_TOP_MM = 50;

function roofAssemblyTotalOffsetToLowerWorkingMm(asm: RoofProfileAssembly): number {
  let t = Math.max(0, asm.coveringThicknessMm);
  if (asm.battenUse) {
    t += Math.max(0, asm.battenHeightMm);
  }
  if (asm.membraneUse) {
    t += Math.max(0, asm.membraneThicknessMm);
  }
  return t;
}

function lowerRoofWorkingSurfaceMeshMm(
  rp: RoofPlaneEntity,
  layerBaseMm: number,
  zAdjustMm: number,
  asm: RoofProfileAssembly,
): RoofSlopeSurfaceMeshMm | null {
  const top = buildRoofSlopeSurfaceMeshMm(rp, layerBaseMm, zAdjustMm);
  if (!top) {
    return null;
  }
  const off = roofAssemblyTotalOffsetToLowerWorkingMm(asm);
  if (off < 1e-6) {
    return top;
  }
  return offsetRoofMeshMm(top, -off);
}

function planeFromMesh(mesh: RoofSlopeSurfaceMeshMm): { readonly n: Vector3; readonly d: number } | null {
  const p = mesh.positions;
  const idx = mesh.indices;
  if (idx.length < 3) {
    return null;
  }
  const i0 = idx[0]!;
  const i1 = idx[1]!;
  const i2 = idx[2]!;
  const a = new Vector3(p[i0 * 3]!, p[i0 * 3 + 1]!, p[i0 * 3 + 2]!);
  const b = new Vector3(p[i1 * 3]!, p[i1 * 3 + 1]!, p[i1 * 3 + 2]!);
  const c = new Vector3(p[i2 * 3]!, p[i2 * 3 + 1]!, p[i2 * 3 + 2]!);
  const cb = new Vector3().subVectors(c, b);
  const ab = new Vector3().subVectors(a, b);
  const n = new Vector3().crossVectors(cb, ab);
  if (n.lengthSq() < 1e-12) {
    return null;
  }
  n.normalize();
  const d = n.dot(a);
  return { n, d };
}

/**
 * Высота Y (мм, мир) нижней рабочей поверхности кровли в точке плана (px, py).
 * Координаты как у стен: X = px, Z = −py.
 */
export function roofLowerWorkingElevationYMmAtPlanPoint(
  rp: RoofPlaneEntity,
  project: Project,
  px: number,
  py: number,
): number | null {
  const profile = getProfileById(project, rp.profileId);
  const asm: RoofProfileAssembly = profile?.roofAssembly ?? DEFAULT_ROOF_PROFILE_ASSEMBLY;
  const layerBase = roofLayerBaseMmForPlane(project, rp.layerId);
  const zAdj =
    computeAllRoofPlanesZAdjustMmByPlaneIdInProject(project, (lid) => roofLayerBaseMmForPlane(project, lid)).get(rp.id) ??
    0;
  const mesh = lowerRoofWorkingSurfaceMeshMm(rp, layerBase, zAdj, asm);
  if (!mesh) {
    return null;
  }
  const pl = planeFromMesh(mesh);
  if (!pl) {
    return null;
  }
  const { n, d } = pl;
  const X = px;
  const Z = -py;
  if (Math.abs(n.y) < 1e-5) {
    return null;
  }
  return (d - n.x * X - n.z * Z) / n.y;
}

/** Минимальная отметка нижней кровли среди скатов, чей план содержит точку. */
export function minRoofLowerWorkingElevationYMmAtPlanPoint(project: Project, px: number, py: number): number | null {
  let best: number | null = null;
  for (const rp of project.roofPlanes) {
    const poly = roofPlanePolygonMm(rp);
    if (!pointInPolygonMm(px, py, poly)) {
      continue;
    }
    const y = roofLowerWorkingElevationYMmAtPlanPoint(rp, project, px, py);
    if (y == null || !Number.isFinite(y)) {
      continue;
    }
    if (best == null || y < best) {
      best = y;
    }
  }
  return best;
}

export interface WallRoofUnderTrimProfilePointMm {
  readonly alongMm: number;
  readonly heightMm: number;
}

/** Профиль верха стены вдоль оси: при отсутствии сохранённого topProfileMm — две точки (торцы). */
export function resolveRoofUnderTrimTopProfileMm(wall: Wall, lengthMm: number): WallRoofUnderTrimProfilePointMm[] {
  const t = wall.roofUnderTrim;
  if (!t) {
    return [
      { alongMm: 0, heightMm: wall.heightMm },
      { alongMm: lengthMm, heightMm: wall.heightMm },
    ];
  }
  if (t.topProfileMm != null && t.topProfileMm.length >= 2) {
    const sorted = [...t.topProfileMm].sort((a, b) => a.alongMm - b.alongMm);
    return sorted.map((p) => ({
      alongMm: Math.round(p.alongMm * 1000) / 1000,
      heightMm: Math.round(p.heightMm * 1000) / 1000,
    }));
  }
  return [
    { alongMm: 0, heightMm: t.heightAtStartMm },
    { alongMm: lengthMm, heightMm: t.heightAtEndMm },
  ];
}

/** Минимальный шаг вдоль стены (мм) для объединения почти совпадающих узлов полилинии меша. */
const ROOF_TRIM_MESH_ALONG_EPS_MM = 0.25;

/**
 * Полилиния верха стены для 3D-призмы подрезки: те же высоты, что во «Виде стены» / {@link wallTopHeightAboveBaseAtAlongMm}.
 * `geometryLengthMm` — длина призмы в мм (как у `WallRenderMeshSpec.depth`), чтобы z совпадали с габаритом меша.
 */
export function roofTrimMeshPolylineMm(
  wall: Wall,
  geometryLengthMm: number,
): readonly WallRoofUnderTrimProfilePointMm[] {
  const L = geometryLengthMm;
  if (!wall.roofUnderTrim || L < 1e-3) {
    return [];
  }
  const knots = resolveRoofUnderTrimTopProfileMm(wall, L);
  const alongs: number[] = [0, L];
  for (const p of knots) {
    alongs.push(Math.max(0, Math.min(L, p.alongMm)));
  }
  alongs.sort((a, b) => a - b);
  const uniq: number[] = [];
  for (const u of alongs) {
    if (uniq.length === 0 || u - uniq[uniq.length - 1]! > ROOF_TRIM_MESH_ALONG_EPS_MM) {
      uniq.push(u);
    }
  }
  if (uniq.length < 2) {
    return [
      { alongMm: 0, heightMm: wallTopHeightAboveBaseAtAlongMm(wall, 0, L) },
      { alongMm: L, heightMm: wallTopHeightAboveBaseAtAlongMm(wall, L, L) },
    ];
  }
  const dense = uniq.map((alongMm) => ({
    alongMm,
    heightMm: wallTopHeightAboveBaseAtAlongMm(wall, alongMm, L),
  }));
  return removeNearCollinearRoofTrimProfilePoints(dense);
}

/** Убирает почти коллинеарные промежуточные точки профиля (мм), чтобы не порождать лишние полосы и вырожденные четырёхугольники в 3D. */
function removeNearCollinearRoofTrimProfilePoints(
  pts: readonly WallRoofUnderTrimProfilePointMm[],
): WallRoofUnderTrimProfilePointMm[] {
  if (pts.length <= 2) {
    return [...pts];
  }
  const out: WallRoofUnderTrimProfilePointMm[] = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = out[out.length - 1]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const dx1 = p1.alongMm - p0.alongMm;
    const dy1 = p1.heightMm - p0.heightMm;
    const dx2 = p2.alongMm - p1.alongMm;
    const dy2 = p2.heightMm - p1.heightMm;
    const cross = dx1 * dy2 - dy1 * dx2;
    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);
    if (len1 < 1e-6 || len2 < 1e-6) {
      continue;
    }
    const rel = Math.abs(cross) / (len1 * len2);
    if (rel < 0.004) {
      continue;
    }
    out.push(p1);
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** Высота верха стены над низом вдоль оси [0…L] при сохранённой подрезке (кусочно-линейный профиль). */
export function wallTopHeightAboveBaseAtAlongMm(wall: Wall, alongMm: number, wallLengthMm: number): number {
  const L = wallLengthMm;
  const u = L > 1e-9 ? Math.max(0, Math.min(L, alongMm)) : 0;
  if (!wall.roofUnderTrim) {
    return wall.heightMm;
  }
  const pts = resolveRoofUnderTrimTopProfileMm(wall, L);
  if (pts.length < 2) {
    return wall.heightMm;
  }
  const p0 = pts[0]!;
  const pN = pts[pts.length - 1]!;
  if (u <= p0.alongMm + 1e-6) {
    return p0.heightMm;
  }
  if (u >= pN.alongMm - 1e-6) {
    return pN.heightMm;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (u + 1e-6 < a.alongMm || u - 1e-6 > b.alongMm) {
      continue;
    }
    const span = b.alongMm - a.alongMm;
    const tt = span > 1e-9 ? (u - a.alongMm) / span : 0;
    return a.heightMm + (b.heightMm - a.heightMm) * tt;
  }
  return wall.heightMm;
}

/**
 * Минимальная высота верха стены над низом на отрезке [loMm, hiMm] вдоль оси (мм).
 * Нужна для прямоугольного листа шириной вдоль стены: верх листа не может быть выше кровли ни в одной точке столбца.
 */
export function minWallTopHeightAboveBaseInAlongSpanMm(
  wall: Wall,
  loMm: number,
  hiMm: number,
  wallLengthMm: number,
): number {
  if (!wall.roofUnderTrim) {
    return wall.heightMm;
  }
  const lo = Math.min(loMm, hiMm);
  const hi = Math.max(loMm, hiMm);
  const pts = resolveRoofUnderTrimTopProfileMm(wall, wallLengthMm);
  let mn = Infinity;
  for (const p of pts) {
    if (p.alongMm >= lo - 1e-6 && p.alongMm <= hi + 1e-6) {
      mn = Math.min(mn, p.heightMm);
    }
  }
  mn = Math.min(
    mn,
    wallTopHeightAboveBaseAtAlongMm(wall, lo, wallLengthMm),
    wallTopHeightAboveBaseAtAlongMm(wall, hi, wallLengthMm),
  );
  if (!Number.isFinite(mn)) {
    return wall.heightMm;
  }
  return Math.max(MIN_WALL_TOP_MM, Math.min(wall.heightMm, mn));
}

/**
 * Высота раскладки листов/SIP по фасаду — габарит стены в мм.
 * После подрезки `heightMm` задаётся как максимум по профилю; высота листа в столбце — по
 * {@link minWallTopHeightAboveBaseInAlongSpanMm} на ширине участка.
 */
export function effectiveWallLayoutHeightMm(wall: Wall): number {
  return wall.heightMm;
}

export interface WallRoofUnderTrimDraft {
  readonly roofPlaneId: string;
  readonly heightAtStartMm: number;
  readonly heightAtEndMm: number;
  readonly topProfileMm: readonly WallRoofUnderTrimProfilePointMm[];
}

/** Шаг выборки вдоль стены (мм): достаточно плотный для конька и изломов. */
const PROFILE_SAMPLE_STEP_MM = 75;

/** Допуск RDP по плоскости (along, height) — мм. */
const PROFILE_RDP_EPS_MM = 4;

function pickRoofPlaneIdAtPoint(project: Project, px: number, py: number): RoofPlaneEntity | null {
  let bestRp: RoofPlaneEntity | null = null;
  let bestY = Infinity;
  for (const rp of project.roofPlanes) {
    const poly = roofPlanePolygonMm(rp);
    if (!pointInPolygonMm(px, py, poly)) {
      continue;
    }
    const yy = roofLowerWorkingElevationYMmAtPlanPoint(rp, project, px, py);
    if (yy == null || !Number.isFinite(yy)) {
      continue;
    }
    if (yy < bestY) {
      bestY = yy;
      bestRp = rp;
    }
  }
  return bestRp;
}

function perpendicularDistanceAlongHeight(
  p: WallRoofUnderTrimProfilePointMm,
  a: WallRoofUnderTrimProfilePointMm,
  b: WallRoofUnderTrimProfilePointMm,
): number {
  const dx = b.alongMm - a.alongMm;
  const dy = b.heightMm - a.heightMm;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return Math.hypot(p.alongMm - a.alongMm, p.heightMm - a.heightMm);
  }
  const t = Math.max(0, Math.min(1, ((p.alongMm - a.alongMm) * dx + (p.heightMm - a.heightMm) * dy) / (len * len)));
  const px = a.alongMm + t * dx;
  const py = a.heightMm + t * dy;
  return Math.hypot(p.alongMm - px, p.heightMm - py);
}

function rdpSimplifyProfile(
  pts: WallRoofUnderTrimProfilePointMm[],
  eps: number,
): WallRoofUnderTrimProfilePointMm[] {
  if (pts.length <= 2) {
    return pts.slice();
  }
  let maxD = 0;
  let maxIdx = 0;
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpendicularDistanceAlongHeight(pts[i]!, first, last);
    if (d > maxD) {
      maxD = d;
      maxIdx = i;
    }
  }
  if (maxD > eps) {
    const left = rdpSimplifyProfile(pts.slice(0, maxIdx + 1), eps);
    const right = rdpSimplifyProfile(pts.slice(maxIdx), eps);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function sampleWallRoofTrimProfileRaw(
  wall: Wall,
  project: Project,
  L: number,
  base: number,
  topFlat: number,
  sx: number,
  sy: number,
  ux: number,
  uy: number,
): WallRoofUnderTrimProfilePointMm[] {
  const heightAtAlong = (uu: number): number => {
    const px = sx + ux * uu;
    const py = sy + uy * uu;
    const yRoofMin = minRoofLowerWorkingElevationYMmAtPlanPoint(project, px, py);
    if (yRoofMin == null || !Number.isFinite(yRoofMin)) {
      return wall.heightMm;
    }
    if (yRoofMin >= topFlat - 1e-3) {
      return wall.heightMm;
    }
    return Math.max(MIN_WALL_TOP_MM, Math.min(wall.heightMm, yRoofMin - base));
  };

  const raw: WallRoofUnderTrimProfilePointMm[] = [];
  const step = Math.max(40, Math.min(PROFILE_SAMPLE_STEP_MM, L / 48));
  for (let u = 0; u < L - 1e-6; u += step) {
    raw.push({ alongMm: u, heightMm: heightAtAlong(u) });
  }
  raw.push({ alongMm: L, heightMm: heightAtAlong(L) });
  return raw;
}

function pickPrimaryRoofPlaneIdForTrim(
  project: Project,
  samples: WallRoofUnderTrimProfilePointMm[],
  wall: Wall,
  L: number,
  sx: number,
  sy: number,
  ux: number,
  uy: number,
): string {
  for (const p of samples) {
    if (p.heightMm < wall.heightMm - 1e-3) {
      const px = sx + ux * p.alongMm;
      const py = sy + uy * p.alongMm;
      const rp = pickRoofPlaneIdAtPoint(project, px, py);
      if (rp) {
        return rp.id;
      }
    }
  }
  const mid = L * 0.5;
  const rp = pickRoofPlaneIdAtPoint(project, sx + ux * mid, sy + uy * mid);
  if (rp) {
    return rp.id;
  }
  return project.roofPlanes[0]?.id ?? "roof";
}

/**
 * Возвращает параметры подрезки или null, если пересечения нет / подрезка не нужна.
 */
export function computeWallRoofUnderTrimDraft(wall: Wall, project: Project): WallRoofUnderTrimDraft | null {
  if (project.roofPlanes.length === 0) {
    return null;
  }
  const sx = wall.start.x;
  const sy = wall.start.y;
  const ex = wall.end.x;
  const ey = wall.end.y;
  const L = Math.hypot(ex - sx, ey - sy);
  if (L < 1e-6) {
    return null;
  }
  const base = wallWorldBottomMm(wall, project);
  const topFlat = base + wall.heightMm;
  const dx = ex - sx;
  const dy = ey - sy;
  const ux = dx / L;
  const uy = dy / L;

  const raw = sampleWallRoofTrimProfileRaw(wall, project, L, base, topFlat, sx, sy, ux, uy);
  const simplified = rdpSimplifyProfile(raw, PROFILE_RDP_EPS_MM);

  const hs = simplified[0]!.heightMm;
  const he = simplified[simplified.length - 1]!.heightMm;
  if (raw.every((p) => p.heightMm >= wall.heightMm - 1e-3)) {
    return null;
  }

  const roofPlaneId = pickPrimaryRoofPlaneIdForTrim(project, raw, wall, L, sx, sy, ux, uy);

  const topProfileMm = simplified.map((p) => ({
    alongMm: Math.round(p.alongMm * 100) / 100,
    heightMm: Math.round(p.heightMm),
  }));

  return {
    roofPlaneId,
    heightAtStartMm: Math.round(hs),
    heightAtEndMm: Math.round(he),
    topProfileMm,
  };
}

export function canShowWallTrimUnderRoofMenu(wall: Wall, project: Project): boolean {
  return computeWallRoofUnderTrimDraft(wall, project) != null;
}
