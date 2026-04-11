import { useEffect, useMemo } from "react";
import { DoubleSide } from "three";

import type { Editor3dPickPayload } from "@/core/domain/editor3dPickPayload";
import type { Project } from "@/core/domain/project";
import { resolveSurfaceTextureBinding } from "@/core/domain/surfaceTextureResolve";
import { surfaceTextureMeshKey } from "@/core/domain/surfaceTextureState";
import { getCatalogDiffuseTexture } from "@/core/textures/proceduralDiffuseTextures";
import { getTextureCatalogEntry } from "@/core/textures/textureCatalog";

import {
  HOVER_BOX_OUTLINE_3D,
  SELECTION_BOX_OUTLINE_3D,
  TEXTURE_TOOL_HOVER_OUTLINE_3D,
  TEXTURE_TOOL_LOCKED_OUTLINE_3D,
} from "./calculationSeamVisual3d";
import { editor3dPickUserData } from "./editor3dPick";
import { editor3dTextureHighlightMatches } from "./editor3dTextureHighlight";
import { ExactBoxSelectionOutline } from "./ExactBoxSelectionOutline";
import { meshStandardPresetForLayerOrDefault } from "./materials3d";
import { selectWallsForScene3d } from "./selectors/walls3d";
import { buildTexturedBoxMaterials, disposeOwnedMaterials } from "./surfaceTextureMaterial3d";
import { isWallMeshSpecVisible } from "./view3dVisibility";
import type { WallRenderMeshSpec } from "./wallMeshSpec";
import { wallsToMeshSpecs } from "./wallMeshSpec";

interface ProjectWallsProps {
  readonly project: Project;
  readonly selectedWallEntityId: string | null;
  readonly calcFocus: { readonly wallId: string; readonly reactKey: string } | null;
  readonly hoverWallEntityId: string | null;
  readonly texturePickHover: Editor3dPickPayload | null;
  readonly texturePickLocked: Editor3dPickPayload | null;
}

function WallSegmentMesh3d({
  project,
  s,
  shellSelected,
  hoverThis,
  texturePickHover,
  texturePickLocked,
}: {
  readonly project: Project;
  readonly s: WallRenderMeshSpec;
  readonly shellSelected: boolean;
  readonly hoverThis: boolean;
  readonly texturePickHover: Editor3dPickPayload | null;
  readonly texturePickLocked: Editor3dPickPayload | null;
}) {
  const wall = useMemo(() => project.walls.find((w) => w.id === s.wallId), [project.walls, s.wallId]);
  const layerId = wall?.layerId ?? "";

  const texturedMaterials = useMemo(() => {
    if (!wall) {
      return null;
    }
    const binding = resolveSurfaceTextureBinding(
      project.surfaceTextureState,
      surfaceTextureMeshKey("wall", s.reactKey),
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
    const preset = meshStandardPresetForLayerOrDefault(s.materialType);
    return buildTexturedBoxMaterials({
      preset,
      baseMap,
      widthM: s.width,
      heightM: s.height,
      depthM: s.depth,
      tileWorldSizeM: tileM,
      doubleSided: true,
    });
  }, [project.surfaceTextureState, wall, layerId, s, s.depth, s.height, s.materialType, s.reactKey, s.width]);

  useEffect(() => {
    return () => {
      if (texturedMaterials) {
        disposeOwnedMaterials(texturedMaterials);
      }
    };
  }, [texturedMaterials]);

  const preset = meshStandardPresetForLayerOrDefault(s.materialType);
  const pick = editor3dPickUserData({ kind: "wall", entityId: s.wallId, reactKey: s.reactKey });
  const texLocked = editor3dTextureHighlightMatches("wall", s.wallId, s.reactKey, texturePickLocked);
  const texHover =
    !texLocked && editor3dTextureHighlightMatches("wall", s.wallId, s.reactKey, texturePickHover);

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
        </mesh>
      ) : (
        <mesh
          userData={pick}
          position={s.position}
          rotation={[0, s.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[s.width, s.height, s.depth]} />
          <meshStandardMaterial
            color={preset.color}
            roughness={preset.roughness}
            metalness={preset.metalness}
            side={DoubleSide}
          />
        </mesh>
      )}
      {shellSelected ? (
        <ExactBoxSelectionOutline
          width={s.width}
          height={s.height}
          depth={s.depth}
          position={s.position}
          rotationY={s.rotationY}
          color={SELECTION_BOX_OUTLINE_3D.color}
          opacity={SELECTION_BOX_OUTLINE_3D.opacity}
        />
      ) : null}
      {hoverThis ? (
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

export function ProjectWalls({
  project,
  selectedWallEntityId,
  calcFocus,
  hoverWallEntityId,
  texturePickHover,
  texturePickLocked,
}: ProjectWallsProps) {
  const specs = useMemo(() => {
    const walls = selectWallsForScene3d(project);
    const all = wallsToMeshSpecs(project, walls);
    return all.filter((x) => isWallMeshSpecVisible(x, project));
  }, [project]);
  return (
    <group name="project-walls">
      {specs.map((s) => {
        const shellSelected =
          selectedWallEntityId === s.wallId && (calcFocus == null || calcFocus.wallId !== s.wallId);
        const hoverThis = hoverWallEntityId === s.wallId && !shellSelected;
        return (
          <WallSegmentMesh3d
            key={s.reactKey}
            project={project}
            s={s}
            shellSelected={shellSelected}
            hoverThis={hoverThis}
            texturePickHover={texturePickHover}
            texturePickLocked={texturePickLocked}
          />
        );
      })}
    </group>
  );
}
