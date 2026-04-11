import { Edges } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { MeshStandardMaterial } from "three";

import type { Editor3dPickPayload } from "@/core/domain/editor3dPickPayload";
import type { Project } from "@/core/domain/project";
import { buildCalculationSolidSpecsForProject } from "@/core/domain/wallCalculation3dSpecs";
import { resolveSurfaceTextureBinding } from "@/core/domain/surfaceTextureResolve";
import { surfaceTextureMeshKey } from "@/core/domain/surfaceTextureState";
import { getCatalogDiffuseTexture } from "@/core/textures/proceduralDiffuseTextures";
import { getTextureCatalogEntry } from "@/core/textures/textureCatalog";

import {
  HOVER_BOX_OUTLINE_3D,
  LUMBER_FRAME_VISUAL_3D,
  SELECTION_BOX_OUTLINE_3D,
  TEXTURE_TOOL_HOVER_OUTLINE_3D,
  TEXTURE_TOOL_LOCKED_OUTLINE_3D,
} from "./calculationSeamVisual3d";
import { editor3dTextureHighlightMatches } from "./editor3dTextureHighlight";
import { useSharedCalculationMeshMaterials } from "./calculationMeshMaterials3d";
import { editor3dPickUserData } from "./editor3dPick";
import { ExactBoxSelectionOutline } from "./ExactBoxSelectionOutline";
import type { MeshStandardPreset3d } from "./materials3d";
import { buildTexturedBoxMaterials, disposeOwnedMaterials } from "./surfaceTextureMaterial3d";
import { isCalculationSolidVisible } from "./view3dVisibility";

interface ProjectCalculationMeshesProps {
  readonly project: Project;
  readonly visible: boolean;
  readonly calcFocus: { readonly wallId: string; readonly reactKey: string } | null;
  readonly hoverCalcReactKey: string | null;
  readonly texturePickHover: Editor3dPickPayload | null;
  readonly texturePickLocked: Editor3dPickPayload | null;
}

function presetFromMaterial(m: MeshStandardMaterial): MeshStandardPreset3d {
  return {
    color: m.color.getHex(),
    roughness: m.roughness,
    metalness: m.metalness,
  };
}

function CalcSolidMesh({
  project,
  s,
  mat,
  selectedPiece,
  hoverPiece,
  texturePickHover,
  texturePickLocked,
}: {
  readonly project: Project;
  readonly s: ReturnType<typeof buildCalculationSolidSpecsForProject>[number];
  readonly mat: MeshStandardMaterial;
  readonly selectedPiece: boolean;
  readonly hoverPiece: boolean;
  readonly texturePickHover: Editor3dPickPayload | null;
  readonly texturePickLocked: Editor3dPickPayload | null;
}) {
  const isLumber = s.source === "lumber";
  const edgeV = LUMBER_FRAME_VISUAL_3D.edges;
  const selV = SELECTION_BOX_OUTLINE_3D;

  const wall = useMemo(() => project.walls.find((w) => w.id === s.wallId), [project.walls, s.wallId]);
  const layerId = wall?.layerId ?? "";

  const texturedMaterials = useMemo(() => {
    if (!wall) {
      return null;
    }
    const binding = resolveSurfaceTextureBinding(
      project.surfaceTextureState,
      surfaceTextureMeshKey("calc", s.reactKey),
      layerId,
    );
    if (!binding) {
      return null;
    }
    const entry = getTextureCatalogEntry(binding.textureId);
    if (!entry) {
      return null;
    }
    const tileM = entry.defaultScaleM * (binding.scalePercent / 100);
    const baseMap = getCatalogDiffuseTexture(entry.id, entry.procedural.kind, entry.procedural.seed);
    const preset = presetFromMaterial(mat);
    return buildTexturedBoxMaterials({
      preset,
      baseMap,
      widthM: s.width,
      heightM: s.height,
      depthM: s.depth,
      tileWorldSizeM: tileM,
      doubleSided: false,
    });
  }, [layerId, mat, project.surfaceTextureState, s.depth, s.height, s.reactKey, s.width, wall]);

  useEffect(() => {
    return () => {
      if (texturedMaterials) {
        disposeOwnedMaterials(texturedMaterials);
      }
    };
  }, [texturedMaterials]);

  const pick = editor3dPickUserData({ kind: "calc", entityId: s.wallId, reactKey: s.reactKey });
  const texLocked = editor3dTextureHighlightMatches("calc", s.wallId, s.reactKey, texturePickLocked);
  const texHover =
    !texLocked && editor3dTextureHighlightMatches("calc", s.wallId, s.reactKey, texturePickHover);

  return (
    <group>
      {texturedMaterials ? (
        <mesh
          userData={pick}
          material={texturedMaterials}
          position={s.position}
          rotation={[0, s.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[s.width, s.height, s.depth]} />
          {isLumber ? (
            <Edges
              threshold={edgeV.threshold}
              color={edgeV.color}
              lineWidth={edgeV.lineWidthPx}
              transparent
              opacity={edgeV.opacity}
              depthTest
              depthWrite={false}
              renderOrder={2}
              raycast={() => null}
            />
          ) : null}
        </mesh>
      ) : (
        <mesh
          userData={pick}
          material={mat}
          position={s.position}
          rotation={[0, s.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[s.width, s.height, s.depth]} />
          {isLumber ? (
            <Edges
              threshold={edgeV.threshold}
              color={edgeV.color}
              lineWidth={edgeV.lineWidthPx}
              transparent
              opacity={edgeV.opacity}
              depthTest
              depthWrite={false}
              renderOrder={2}
              raycast={() => null}
            />
          ) : null}
        </mesh>
      )}
      {selectedPiece ? (
        <ExactBoxSelectionOutline
          width={s.width}
          height={s.height}
          depth={s.depth}
          position={s.position}
          rotationY={s.rotationY}
          color={selV.color}
          opacity={selV.opacity}
        />
      ) : null}
      {hoverPiece ? (
        <ExactBoxSelectionOutline
          width={s.width}
          height={s.height}
          depth={s.depth}
          position={s.position}
          rotationY={s.rotationY}
          color={HOVER_BOX_OUTLINE_3D.color}
          opacity={HOVER_BOX_OUTLINE_3D.opacity}
        />
      ) : null}
      {texLocked ? (
        <ExactBoxSelectionOutline
          width={s.width}
          height={s.height}
          depth={s.depth}
          position={s.position}
          rotationY={s.rotationY}
          color={TEXTURE_TOOL_LOCKED_OUTLINE_3D.color}
          opacity={TEXTURE_TOOL_LOCKED_OUTLINE_3D.opacity}
        />
      ) : null}
      {texHover ? (
        <ExactBoxSelectionOutline
          width={s.width}
          height={s.height}
          depth={s.depth}
          position={s.position}
          rotationY={s.rotationY}
          color={TEXTURE_TOOL_HOVER_OUTLINE_3D.color}
          opacity={TEXTURE_TOOL_HOVER_OUTLINE_3D.opacity}
        />
      ) : null}
    </group>
  );
}

export function ProjectCalculationMeshes({
  project,
  visible,
  calcFocus,
  hoverCalcReactKey,
  texturePickHover,
  texturePickLocked,
}: ProjectCalculationMeshesProps) {
  const materials = useSharedCalculationMeshMaterials();

  const specs = useMemo(() => {
    const all = buildCalculationSolidSpecsForProject(project);
    return all.filter((x) => isCalculationSolidVisible(x, project));
  }, [project]);

  if (!visible || specs.length === 0) {
    return null;
  }

  return (
    <group name="project-calculation-derived">
      {specs.map((s) => {
        const mat =
          s.source === "lumber"
            ? materials.lumber
            : (materials.byMaterialType.get(s.materialType) ?? materials.eps);
        const selectedPiece = calcFocus != null && s.reactKey === calcFocus.reactKey;
        const hoverPiece = hoverCalcReactKey === s.reactKey && !selectedPiece;
        return (
          <CalcSolidMesh
            key={s.reactKey}
            project={project}
            s={s}
            mat={mat}
            selectedPiece={selectedPiece}
            hoverPiece={hoverPiece}
            texturePickHover={texturePickHover}
            texturePickLocked={texturePickLocked}
          />
        );
      })}
    </group>
  );
}
