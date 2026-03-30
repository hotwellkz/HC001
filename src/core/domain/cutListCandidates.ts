import type { Project } from "./project";
import type { LumberRole } from "./wallCalculation";
import { getProjectLumberPieces } from "./lumberCutList";

/** Готовность к будущему модулю раскроя: одна строка = одна деталь из расчёта. */
export interface CutListCandidate {
  readonly pieceId: string;
  readonly pieceMark: string;
  readonly wallId: string;
  readonly wallMark: string;
  readonly calculationId: string;
  readonly role: LumberRole;
  readonly sectionThicknessMm: number;
  readonly sectionDepthMm: number;
  readonly lengthMm: number;
  readonly quantity: 1;
  readonly materialGroup: "wood" | "insulation" | "other";
  readonly source: "calculated";
}

function materialGroupFromRole(role: LumberRole): "wood" | "insulation" | "other" {
  if (role === "framing_member_generic") {
    return "other";
  }
  return "wood";
}

/** Все детали пиломатериала из расчётов (без SIP-панелей как «листов» — они в sipRegions). */
export function buildCutListCandidates(project: Project): readonly CutListCandidate[] {
  const pieces = getProjectLumberPieces(project);
  return pieces.map((p) => ({
    pieceId: p.id,
    pieceMark: p.pieceMark,
    wallId: p.wallId,
    wallMark: p.wallMark,
    calculationId: p.calculationId,
    role: p.role,
    sectionThicknessMm: p.sectionThicknessMm,
    sectionDepthMm: p.sectionDepthMm,
    lengthMm: p.lengthMm,
    quantity: 1 as const,
    materialGroup: materialGroupFromRole(p.role),
    source: "calculated" as const,
  }));
}
