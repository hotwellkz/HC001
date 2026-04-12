import type { FloorInsulationLayoutMode, FloorInsulationTemplateParams } from "./floorInsulation";
import type { InsulationMaterialKind, Profile } from "./profile";

const KIND_LABELS: Record<InsulationMaterialKind, string> = {
  eps: "EPS",
  xps: "XPS",
  mineralWool: "Минвата",
  other: "Другое",
};

export function insulationMaterialDisplayLabel(kind: InsulationMaterialKind, customLabel?: string): string {
  if (kind === "other") {
    const t = String(customLabel ?? "").trim();
    return t.length > 0 ? t : KIND_LABELS.other;
  }
  return KIND_LABELS[kind];
}

/**
 * Собирает параметры раскладки для генератора из профиля утеплителя.
 * @param layoutOverride — режим из инструмента; иначе берётся из профиля.
 */
export function resolveFloorInsulationTemplateFromProfile(
  profile: Profile,
  layoutOverride?: FloorInsulationLayoutMode,
): FloorInsulationTemplateParams | null {
  if (profile.category !== "insulation" || !profile.insulation) {
    return null;
  }
  const u = profile.insulation;
  const materialLabel = insulationMaterialDisplayLabel(u.materialKind, u.customMaterialLabel);
  return {
    materialLabel,
    sheetLengthMm: u.sheetLengthMm,
    sheetWidthMm: u.sheetWidthMm,
    thicknessMm: u.thicknessMm,
    mountGapMm: u.technologicalGapMm,
    layoutMode: layoutOverride ?? u.defaultLayoutMode,
  };
}
