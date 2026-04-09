import type { Opening } from "./opening";

export const DOOR_HEADER_ALIGNMENT_MM = 45;

export function openingSillLevelMm(opening: Opening): number {
  return opening.kind === "window" ? (opening.sillHeightMm ?? opening.position?.sillLevelMm ?? 900) : 0;
}

/** Единая верхняя граница проёма в оболочке (OSB) и 3D-двери. */
export function openingTopLevelMmForShell(opening: Opening): number {
  const sill = openingSillLevelMm(opening);
  const extra = opening.kind === "door" ? DOOR_HEADER_ALIGNMENT_MM : 0;
  return sill + opening.heightMm + extra;
}
