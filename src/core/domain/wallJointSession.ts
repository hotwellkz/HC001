import type { WallJointKind, WallEndSide } from "./wallJoint";

export type WallJointToolPhase = "pickFirst" | "pickSecond";

export interface WallJointSession {
  readonly kind: WallJointKind;
  readonly phase: WallJointToolPhase;
  /** После первого клика */
  readonly first?: { readonly wallId: string; readonly end: WallEndSide };
}

export function wallJointHintRu(kind: WallJointKind, phase: WallJointToolPhase): string {
  if (kind === "T_ABUTMENT") {
    if (phase === "pickFirst") {
      return "Выберите торец примыкающей стены";
    }
    return "Выберите основную стену (клик по сегменту, не торец)";
  }
  if (phase === "pickFirst") {
    return "Выберите торец первой стены (главной для стыка внахлёст)";
  }
  return "Выберите торец второй стены";
}
