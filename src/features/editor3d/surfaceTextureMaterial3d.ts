import { DoubleSide, FrontSide, MeshStandardMaterial, type CanvasTexture, type Material } from "three";

import type { MeshStandardPreset3d } from "./materials3d";

/** Порядок граней совпадает с `BoxGeometry` в three.js (группы 0–5). */
export function boxFaceTileRepeats(
  widthM: number,
  heightM: number,
  depthM: number,
  tileWorldSizeM: number,
): readonly (readonly [number, number])[] {
  const t = Math.max(1e-4, tileWorldSizeM);
  return [
    [depthM / t, heightM / t],
    [depthM / t, heightM / t],
    [widthM / t, depthM / t],
    [widthM / t, depthM / t],
    [widthM / t, heightM / t],
    [widthM / t, heightM / t],
  ];
}

export function buildTexturedBoxMaterials(args: {
  readonly preset: MeshStandardPreset3d;
  readonly baseMap: CanvasTexture;
  readonly widthM: number;
  readonly heightM: number;
  readonly depthM: number;
  readonly tileWorldSizeM: number;
  readonly doubleSided?: boolean;
}): MeshStandardMaterial[] {
  const reps = boxFaceTileRepeats(args.widthM, args.heightM, args.depthM, args.tileWorldSizeM);
  const side = args.doubleSided ? DoubleSide : FrontSide;
  return reps.map(([ru, rv]) => {
    const map = args.baseMap.clone();
    map.repeat.set(Math.max(0.02, ru), Math.max(0.02, rv));
    map.needsUpdate = true;
    return new MeshStandardMaterial({
      map,
      color: 0xffffff,
      roughness: args.preset.roughness,
      metalness: args.preset.metalness,
      side,
    });
  });
}

export function buildSingleTileMaterial(args: {
  readonly preset: MeshStandardPreset3d;
  readonly baseMap: CanvasTexture;
  readonly repeatU: number;
  readonly repeatV: number;
  readonly doubleSided?: boolean;
}): MeshStandardMaterial {
  const map = args.baseMap.clone();
  map.repeat.set(Math.max(0.02, args.repeatU), Math.max(0.02, args.repeatV));
  map.needsUpdate = true;
  return new MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: args.preset.roughness,
    metalness: args.preset.metalness,
    side: args.doubleSided ? DoubleSide : FrontSide,
  });
}

export function disposeOwnedMaterials(mats: readonly Material[] | Material | undefined): void {
  if (mats == null) {
    return;
  }
  const list = Array.isArray(mats) ? mats : [mats];
  for (const m of list) {
    if (m instanceof MeshStandardMaterial) {
      if (m.map && m.map !== null) {
        m.map.dispose();
      }
      m.dispose();
    }
  }
}
