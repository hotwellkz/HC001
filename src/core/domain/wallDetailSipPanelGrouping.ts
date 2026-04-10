/**
 * Группировка SIP на фасаде «Вид стены»: размер + конструктивная роль (не только габариты).
 */

import type { Opening } from "./opening";
import type { WallDetailSipFacadeSlice } from "./wallDetailSipElevation";

/** Роль панели для спецификации/маркировки на чертеже. */
export type WallDetailSipPanelRole =
  | "regular"
  | "corner-left"
  | "corner-right"
  | "adjacent-window-left"
  | "adjacent-window-right"
  | "adjacent-window-top"
  | "adjacent-window-bottom"
  | "adjacent-door-left"
  | "adjacent-door-right"
  | "adjacent-door-top"
  | "adjacent-window-between"
  | "adjacent-door-between"
  | "adjacent-mixed-between";

const ALIGN_EPS_MM = 1.5;

type FlexOpening = Opening & { offsetFromStartMm: number };

function flexOpeningsForWall(openings: readonly Opening[], wallId: string): FlexOpening[] {
  return openings
    .filter(
      (o): o is FlexOpening =>
        o.wallId === wallId &&
        o.offsetFromStartMm != null &&
        (o.kind === "door" || o.kind === "window"),
    )
    .sort((a, b) => a.offsetFromStartMm - b.offsetFromStartMm);
}

function classifyColumnRole(
  startOffsetMm: number,
  endOffsetMm: number,
  wallLengthMm: number,
  openings: readonly FlexOpening[],
): WallDetailSipPanelRole {
  if (startOffsetMm <= ALIGN_EPS_MM) {
    return "corner-left";
  }
  if (endOffsetMm >= wallLengthMm - ALIGN_EPS_MM) {
    return "corner-right";
  }

  const leftOfOpening: FlexOpening[] = [];
  const rightOfOpening: FlexOpening[] = [];

  for (const o of openings) {
    const o0 = o.offsetFromStartMm;
    const o1 = o.offsetFromStartMm + o.widthMm;
    if (Math.abs(endOffsetMm - o0) < ALIGN_EPS_MM) {
      leftOfOpening.push(o);
    }
    if (Math.abs(startOffsetMm - o1) < ALIGN_EPS_MM) {
      rightOfOpening.push(o);
    }
  }

  if (leftOfOpening.length === 0 && rightOfOpening.length === 0) {
    return "regular";
  }

  if (leftOfOpening.length >= 1 && rightOfOpening.length >= 1) {
    const kL = leftOfOpening[0]!.kind;
    const kR = rightOfOpening[0]!.kind;
    if (kL === "window" && kR === "window") {
      return "adjacent-window-between";
    }
    if (kL === "door" && kR === "door") {
      return "adjacent-door-between";
    }
    return "adjacent-mixed-between";
  }

  if (leftOfOpening.length >= 1) {
    const o = leftOfOpening[0]!;
    return o.kind === "window" ? "adjacent-window-left" : "adjacent-door-left";
  }

  const o = rightOfOpening[0]!;
  return o.kind === "window" ? "adjacent-window-right" : "adjacent-door-right";
}

/** Роль одного слайса фасада (колонка / над проёмом / под окном). */
export function wallDetailSipFacadeSliceRole(
  sl: WallDetailSipFacadeSlice,
  wallLengthMm: number,
  openingsOnWall: readonly Opening[],
  wallId: string,
): WallDetailSipPanelRole {
  const flex = flexOpeningsForWall(openingsOnWall, wallId);

  if (sl.kind === "above_opening") {
    const o = flex.find((x) => x.id === sl.openingId);
    const kind = o?.kind ?? "window";
    return kind === "door" ? "adjacent-door-top" : "adjacent-window-top";
  }
  if (sl.kind === "below_opening") {
    return "adjacent-window-bottom";
  }

  const r = sl.region;
  return classifyColumnRole(r.startOffsetMm, r.endOffsetMm, wallLengthMm, flex);
}

export function wallDetailSipSliceThicknessMm(sl: WallDetailSipFacadeSlice, wallThicknessFallbackMm: number): number {
  if (sl.kind === "column") {
    return sl.region.thicknessMm;
  }
  return wallThicknessFallbackMm;
}

/** Ключ группы: ширина×высота×толщина@роль (мм, целые). */
export function wallDetailSipPanelGroupKey(
  widthMm: number,
  heightMm: number,
  thicknessMm: number,
  role: WallDetailSipPanelRole,
): string {
  const w = Math.round(widthMm);
  const h = Math.round(heightMm);
  const t = Math.round(thicknessMm);
  return `${w}x${h}x${t}@${role}`;
}

export interface WallDetailSipGroupedRow {
  readonly positionOneBased: number;
  readonly groupKey: string;
  readonly role: WallDetailSipPanelRole;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly thicknessMm: number;
  readonly qty: number;
}

export interface WallDetailSipPanelDisplayGrouping {
  /** Номер позиции П{n} для каждого слайса (порядок как в `slices`). */
  readonly slicePositionOneBased: readonly number[];
  readonly groupedRows: readonly WallDetailSipGroupedRow[];
}

/**
 * Нумерация позиций и строки таблицы: объединение только при совпадении размера и роли;
 * порядок позиций — по первому вхождению слайса на фасаде слева направо / как в `buildWallDetailSipFacadeSlices`.
 */
export function buildWallDetailSipPanelDisplayGrouping(
  slices: readonly WallDetailSipFacadeSlice[],
  wallLengthMm: number,
  wallThicknessMm: number,
  openingsOnWall: readonly Opening[],
  wallId: string,
): WallDetailSipPanelDisplayGrouping {
  const sliceMetas = slices.map((sl) => {
    const role = wallDetailSipFacadeSliceRole(sl, wallLengthMm, openingsOnWall, wallId);
    const t = wallDetailSipSliceThicknessMm(sl, wallThicknessMm);
    const w = sl.specWidthMm;
    const h = sl.specHeightMm;
    const groupKey = wallDetailSipPanelGroupKey(w, h, t, role);
    return { groupKey, role, w: Math.round(w), h: Math.round(h), t: Math.round(t) };
  });

  const keyToPosition = new Map<string, number>();
  let nextPos = 1;
  const slicePositionOneBased = sliceMetas.map(({ groupKey }) => {
    let p = keyToPosition.get(groupKey);
    if (p == null) {
      p = nextPos++;
      keyToPosition.set(groupKey, p);
    }
    return p;
  });

  const groupOrder: string[] = [];
  const groupAgg = new Map<string, { qty: number; role: WallDetailSipPanelRole; w: number; h: number; t: number; position: number }>();

  sliceMetas.forEach((m, i) => {
    const position = slicePositionOneBased[i]!;
    if (!groupAgg.has(m.groupKey)) {
      groupOrder.push(m.groupKey);
      groupAgg.set(m.groupKey, {
        qty: 0,
        role: m.role,
        w: m.w,
        h: m.h,
        t: m.t,
        position,
      });
    }
    const g = groupAgg.get(m.groupKey)!;
    g.qty += 1;
  });

  const groupedRows: WallDetailSipGroupedRow[] = groupOrder.map((gk) => {
    const g = groupAgg.get(gk)!;
    return {
      positionOneBased: g.position,
      groupKey: gk,
      role: g.role,
      widthMm: g.w,
      heightMm: g.h,
      thicknessMm: g.t,
      qty: g.qty,
    };
  });

  return { slicePositionOneBased, groupedRows };
}
