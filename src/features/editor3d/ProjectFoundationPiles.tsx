import { useMemo } from "react";
import { DoubleSide } from "three";

import { getLayerById } from "@/core/domain/layerOps";
import type { FoundationPileEntity } from "@/core/domain/foundationPile";
import type { Project } from "@/core/domain/project";

import { editor3dPickUserData } from "./editor3dPick";
import { ExactBoxSelectionOutline } from "./ExactBoxSelectionOutline";
import { HOVER_BOX_OUTLINE_3D, SELECTION_BOX_OUTLINE_3D } from "./calculationSeamVisual3d";
import { meshStandardPresetForMaterialType } from "./materials3d";

const MM_TO_M = 0.001;

function pileMeshesForEntity(project: Project, pile: FoundationPileEntity) {
  const concrete = meshStandardPresetForMaterialType("concrete");
  if (pile.pileKind === "screw") {
    return { parts: [] as { key: string; position: readonly [number, number, number]; width: number; height: number; depth: number }[], concrete };
  }
  const layer = getLayerById(project, pile.layerId);
  const elevMm = layer?.elevationMm ?? 0;
  const topM = (elevMm + pile.levelMm) * MM_TO_M;
  const bottomM = topM - pile.heightMm * MM_TO_M;
  const capThkMm =
    pile.capSizeMm > pile.sizeMm + 0.5
      ? Math.min(80, Math.max(40, Math.min(pile.heightMm * 0.08, 80)))
      : 0;
  const bodyTopM = topM - capThkMm * MM_TO_M;
  const sizeM = pile.sizeMm * MM_TO_M;
  const capM = pile.capSizeMm * MM_TO_M;
  const cx = pile.centerX * MM_TO_M;
  const cz = -pile.centerY * MM_TO_M;
  type Part = {
    readonly key: string;
    readonly position: readonly [number, number, number];
    readonly width: number;
    readonly height: number;
    readonly depth: number;
  };

  const parts: Part[] = [];
  if (capThkMm > 0 && bodyTopM > bottomM + 1e-6) {
    const shaftH = bodyTopM - bottomM;
    const shaftCy = bottomM + shaftH / 2;
    parts.push({
      key: `${pile.id}-shaft`,
      position: [cx, shaftCy, cz],
      width: sizeM,
      height: shaftH,
      depth: sizeM,
    });
    const capH = capThkMm * MM_TO_M;
    const capCy = bodyTopM + capH / 2;
    parts.push({
      key: `${pile.id}-cap`,
      position: [cx, capCy, cz],
      width: capM,
      height: capH,
      depth: capM,
    });
  } else {
    const h = topM - bottomM;
    const cy = bottomM + h / 2;
    parts.push({
      key: pile.id,
      position: [cx, cy, cz],
      width: sizeM,
      height: h,
      depth: sizeM,
    });
  }

  return { parts, concrete };
}

interface ProjectFoundationPilesProps {
  readonly project: Project;
  readonly selectedPileEntityId: string | null;
  readonly hoverPileEntityId: string | null;
}

export function ProjectFoundationPiles({
  project,
  selectedPileEntityId,
  hoverPileEntityId,
}: ProjectFoundationPilesProps) {
  const items = useMemo(() => {
    const out: {
      readonly pile: FoundationPileEntity;
      readonly parts: ReturnType<typeof pileMeshesForEntity>["parts"];
      readonly concrete: ReturnType<typeof pileMeshesForEntity>["concrete"];
    }[] = [];
    for (const pile of project.foundationPiles) {
      const r = pileMeshesForEntity(project, pile);
      if (r.parts.length === 0) {
        continue;
      }
      out.push({ pile, parts: r.parts, concrete: r.concrete });
    }
    return out;
  }, [project]);

  return (
    <group name="project-foundation-piles">
      {items.map(({ pile, parts, concrete }) => {
        const shellSelected = selectedPileEntityId === pile.id;
        const hoverThis = hoverPileEntityId === pile.id && !shellSelected;
        return (
          <group key={pile.id}>
            {parts.map((pt) => {
              const pick = editor3dPickUserData({
                kind: "foundationPile",
                entityId: pile.id,
                reactKey: pt.key,
              });
              return (
                <mesh
                  key={pt.key}
                  userData={pick}
                  position={pt.position}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[pt.width, pt.height, pt.depth]} />
                  <meshStandardMaterial
                    color={concrete.color}
                    roughness={concrete.roughness}
                    metalness={concrete.metalness}
                    side={DoubleSide}
                  />
                </mesh>
              );
            })}
            {shellSelected
              ? parts.map((pt) => (
                  <ExactBoxSelectionOutline
                    key={`${pt.key}-sel`}
                    width={pt.width}
                    height={pt.height}
                    depth={pt.depth}
                    position={pt.position}
                    rotationY={0}
                    color={SELECTION_BOX_OUTLINE_3D.color}
                    opacity={SELECTION_BOX_OUTLINE_3D.opacity}
                  />
                ))
              : null}
            {hoverThis
              ? parts.map((pt) => (
                  <ExactBoxSelectionOutline
                    key={`${pt.key}-hov`}
                    width={pt.width}
                    height={pt.height}
                    depth={pt.depth}
                    position={pt.position}
                    rotationY={0}
                    color={HOVER_BOX_OUTLINE_3D.color}
                    opacity={HOVER_BOX_OUTLINE_3D.opacity}
                  />
                ))
              : null}
          </group>
        );
      })}
    </group>
  );
}
