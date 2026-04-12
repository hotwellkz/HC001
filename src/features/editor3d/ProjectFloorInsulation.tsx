import { useEffect, useMemo } from "react";
import { DoubleSide } from "three";

import { getLayerById } from "@/core/domain/layerOps";
import type { Project } from "@/core/domain/project";
import { isFloorInsulationPieceStale } from "@/core/domain/floorInsulationSpecification";

import { editor3dPickUserData } from "./editor3dPick";
import { buildFloorInsulationExtrudeGeometry } from "./floorInsulationMesh3d";
import { meshStandardPresetForMaterialType } from "./materials3d";
import { isProjectLayerVisibleIn3d } from "./view3dVisibility";

function presetForInsulationMaterialLabel(label: string) {
  const u = label.toUpperCase();
  if (u.includes("XPS")) {
    return meshStandardPresetForMaterialType("xps");
  }
  if (u.includes("МИН") || u.includes("MINERAL") || u.includes("ШЕРСТ") || u.includes("WOOL")) {
    return meshStandardPresetForMaterialType("insulation");
  }
  return meshStandardPresetForMaterialType("eps");
}

interface ProjectFloorInsulationProps {
  readonly project: Project;
  readonly selectedPieceId: string | null;
  readonly hoverPieceId: string | null;
}

function FloorInsulationMesh3d({
  piece,
  project,
  selected,
  hover,
}: {
  readonly piece: import("@/core/domain/floorInsulation").FloorInsulationPiece;
  readonly project: Project;
  readonly selected: boolean;
  readonly hover: boolean;
}) {
  const built = useMemo(() => buildFloorInsulationExtrudeGeometry(piece), [piece]);

  useEffect(() => {
    return () => {
      built?.geometry.dispose();
    };
  }, [built]);

  if (!built) {
    return null;
  }

  const stale = isFloorInsulationPieceStale(piece, project);
  const pick = editor3dPickUserData({
    kind: "floorInsulation",
    entityId: piece.id,
    reactKey: piece.id,
  });

  const matPreset = presetForInsulationMaterialLabel(piece.specSnapshot.materialLabel);
  const tint = stale ? 0.92 : selected ? 1.06 : hover ? 1.03 : 1;
  const color = matPreset.color;
  const r = Math.min(255, ((color >> 16) & 0xff) * tint);
  const g = Math.min(255, ((color >> 8) & 0xff) * tint);
  const b = Math.min(255, (color & 0xff) * tint);
  const tinted = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

  return (
    <mesh
      userData={pick}
      geometry={built.geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, built.bottomM, 0]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={tinted}
        roughness={matPreset.roughness}
        metalness={matPreset.metalness}
        side={DoubleSide}
        transparent={stale}
        opacity={stale ? 0.82 : 1}
      />
    </mesh>
  );
}

export function ProjectFloorInsulation({ project, selectedPieceId, hoverPieceId }: ProjectFloorInsulationProps) {
  const vs = project.viewState;
  const visible = vs.show3dFloorInsulation !== false && vs.show3dOverlap !== false;
  const items = useMemo(() => {
    const out: import("@/core/domain/floorInsulation").FloorInsulationPiece[] = [];
    for (const p of project.floorInsulationPieces) {
      const layer = getLayerById(project, p.layerId);
      if (layer?.isVisible === false) {
        continue;
      }
      if (!isProjectLayerVisibleIn3d(p.layerId, project)) {
        continue;
      }
      out.push(p);
    }
    return out;
  }, [project]);

  if (!visible) {
    return null;
  }

  return (
    <group name="project-floor-insulation-eps">
      {items.map((p) => (
        <FloorInsulationMesh3d
          key={p.id}
          piece={p}
          project={project}
          selected={selectedPieceId === p.id}
          hover={hoverPieceId === p.id && selectedPieceId !== p.id}
        />
      ))}
    </group>
  );
}
