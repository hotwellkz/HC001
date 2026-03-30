import { getProfileById } from "./profileOps";
import type { Project } from "./project";
import type { Wall } from "./wall";
import type { LumberRole } from "./wallCalculation";
import { groupLumberBySectionAndLength, sectionKeyForLumber, getProjectLumberPieces } from "./lumberCutList";

/** Сводная строка по стене для спецификации. */
export interface WallSpecificationSummary {
  readonly wallId: string;
  readonly wallMark: string;
  readonly profileName: string;
  readonly lengthMm: number;
  readonly heightMm: number;
  readonly sipPanelCount: number;
  readonly lumberPieceCount: number;
  readonly hasOpenings: boolean;
  readonly hasJoints: boolean;
}

/** Строка детали в спецификации стены. */
export interface WallSpecificationDetailRow {
  readonly pieceMark: string;
  readonly role: LumberRole;
  readonly roleLabelRu: string;
  readonly sectionKey: string;
  readonly lengthMm: number;
  readonly quantity: number;
}

/** SIP-панель по расчёту (марки только в данных / спецификации, не на основном 2D). */
export interface WallSpecificationSipRow {
  readonly pieceMark: string;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly thicknessMm: number;
  readonly sequenceIndex: number;
}

/** Сводка пиломатериала по проекту (агрегация). */
export interface ProjectLumberSummaryRow {
  readonly sectionKey: string;
  readonly lengthMm: number;
  readonly count: number;
  readonly totalLengthMm: number;
  readonly wallMarks: readonly string[];
}

const ROLE_LABEL_RU: Readonly<Partial<Record<LumberRole, string>>> = {
  upper_plate: "Верхняя обвязка",
  lower_plate: "Нижняя обвязка",
  joint_board: "Стыковочная доска",
  edge_board: "Торцевая доска",
  opening_left_stud: "Стойка проёма (левая)",
  opening_right_stud: "Стойка проёма (правая)",
  opening_header: "Перемычка проёма",
  opening_sill: "Подоконник / нижняя планка",
  tee_joint_board: "Т-узел",
  corner_joint_board: "Угловой узел",
  framing_member_generic: "Каркасная деталь",
};

export function lumberRoleLabelRu(role: LumberRole): string {
  return ROLE_LABEL_RU[role] ?? role;
}

function wallLengthMm(w: Wall): number {
  return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
}

function wallHasOpenings(project: Project, wallId: string): boolean {
  return project.openings.some((o) => o.wallId === wallId);
}

function wallHasJoints(project: Project, wallId: string): boolean {
  return project.wallJoints.some((j) => j.wallAId === wallId || j.wallBId === wallId);
}

export function buildWallSpecificationSummary(wall: Wall, project: Project): WallSpecificationSummary | null {
  const calc = project.wallCalculations.find((c) => c.wallId === wall.id);
  if (!calc) {
    return null;
  }
  const profile = wall.profileId ? getProfileById(project, wall.profileId) : undefined;
  const wallMark = wall.markLabel?.trim() || wall.id.slice(0, 8);
  return {
    wallId: wall.id,
    wallMark,
    profileName: profile?.name ?? profile?.id ?? "—",
    lengthMm: Math.round(wallLengthMm(wall)),
    heightMm: wall.heightMm,
    sipPanelCount: calc.sipRegions.length,
    lumberPieceCount: calc.lumberPieces.length,
    hasOpenings: wallHasOpenings(project, wall.id),
    hasJoints: wallHasJoints(project, wall.id),
  };
}

export function buildWallSpecificationDetails(wall: Wall, project: Project): readonly WallSpecificationDetailRow[] {
  const calc = project.wallCalculations.find((c) => c.wallId === wall.id);
  if (!calc) {
    return [];
  }
  return calc.lumberPieces.map((p) => ({
    pieceMark: p.pieceMark,
    role: p.role,
    roleLabelRu: lumberRoleLabelRu(p.role),
    sectionKey: sectionKeyForLumber(p),
    lengthMm: Math.round(p.lengthMm),
    quantity: 1,
  }));
}

export function buildWallSpecificationSipPanels(wall: Wall, project: Project): readonly WallSpecificationSipRow[] {
  const calc = project.wallCalculations.find((c) => c.wallId === wall.id);
  if (!calc) {
    return [];
  }
  return [...calc.sipRegions]
    .sort((a, b) => a.index - b.index)
    .map((r) => ({
      pieceMark: r.pieceMark,
      widthMm: Math.round(r.widthMm),
      heightMm: Math.round(r.heightMm),
      thicknessMm: Math.round(r.thicknessMm),
      sequenceIndex: r.index,
    }));
}

export function buildProjectWallSpecificationSummaries(project: Project): readonly WallSpecificationSummary[] {
  const out: WallSpecificationSummary[] = [];
  for (const w of project.walls) {
    const s = buildWallSpecificationSummary(w, project);
    if (s) {
      out.push(s);
    }
  }
  return out;
}

/** Алиас: сводка по всем стенам с расчётом. */
export const buildProjectSpecification = buildProjectWallSpecificationSummaries;

/** Алиас: полная спецификация по стенам проекта (только стены с расчётом). */
export const buildWallSpecification = buildProjectWallSpecificationSummaries;

/** Агрегат по сечению и длине + список марок стен. */
export function buildProjectLumberSummary(project: Project): readonly ProjectLumberSummaryRow[] {
  const pieces = getProjectLumberPieces(project);
  const byWallMark = new Map<string, string>();
  for (const c of project.wallCalculations) {
    const w = project.walls.find((x) => x.id === c.wallId);
    if (w) {
      byWallMark.set(w.id, w.markLabel?.trim() || w.id.slice(0, 8));
    }
  }
  const groups = groupLumberBySectionAndLength(pieces);
  const rows: ProjectLumberSummaryRow[] = [];
  for (const [, group] of groups) {
    if (group.length === 0) {
      continue;
    }
    const first = group[0]!;
    const len = Math.round(first.lengthMm);
    const marks = [...new Set(group.map((p) => byWallMark.get(p.wallId) ?? p.wallId))].sort();
    rows.push({
      sectionKey: sectionKeyForLumber(first),
      lengthMm: len,
      count: group.length,
      totalLengthMm: len * group.length,
      wallMarks: marks,
    });
  }
  return [...rows].sort((a, b) => {
    if (a.sectionKey !== b.sectionKey) {
      return a.sectionKey.localeCompare(b.sectionKey);
    }
    return b.lengthMm - a.lengthMm;
  });
}

/** Алиас: то же, что buildProjectLumberSummary. */
export const buildLumberSummary = buildProjectLumberSummary;
