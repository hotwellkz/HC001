import { useEffect, useMemo } from "react";
import { DoubleSide, EdgesGeometry } from "three";
import type { BufferGeometry } from "three";

import { roofTrimMeshPolylineMm } from "@/core/domain/wallRoofUnderTrim";

import {
  buildWallSlopedPrismGeometry,
  buildWallSlopedProfilePrismGeometry,
  MM_TO_M,
} from "@/features/editor3d/wallSlopedPrismGeometry";

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

/** Контур выбора по рёбрам призмы подрезки (не AABB «ящика» по hMax). */
function SlopedWallEdgeOutline({
  geometry,
  position,
  rotationY,
  color,
  opacity,
}: {
  readonly geometry: BufferGeometry;
  readonly position: readonly [number, number, number];
  readonly rotationY: number;
  readonly color: number;
  readonly opacity: number;
}) {
  /** Только заметные изломы: не подсвечивать диагонали разбиения почти плоских граней. */
  const edges = useMemo(() => new EdgesGeometry(geometry, 62), [geometry]);
  useEffect(() => () => edges.dispose(), [edges]);
  return (
    <lineSegments
      position={position}
      rotation={[0, rotationY, 0]}
      geometry={edges}
      raycast={() => null}
      frustumCulled={false}
      renderOrder={32}
    >
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthTest
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </lineSegments>
  );
}

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

  const slopedGeo = useMemo(() => {
    if (s.slopedTopProfileMm && s.slopedTopProfileMm.length >= 2 && wall) {
      const Lmm = s.depth / MM_TO_M;
      if (Lmm < 1e-6) {
        return null;
      }
      const poly = roofTrimMeshPolylineMm(wall, Lmm);
      if (poly.length < 2) {
        return null;
      }
      const depthM = s.depth;
      const zM = poly.map((p) => (p.alongMm / Lmm) * depthM - depthM * 0.5);
      const hM = poly.map((p) => p.heightMm * MM_TO_M);
      return buildWallSlopedProfilePrismGeometry(s.width, depthM, zM, hM);
    }
    if (!s.slopedTopHeightsMm) {
      return null;
    }
    const { h0, h1 } = s.slopedTopHeightsMm;
    return buildWallSlopedPrismGeometry(s.width, s.depth, h0 * MM_TO_M, h1 * MM_TO_M);
  }, [s, wall]);

  useEffect(() => {
    return () => {
      slopedGeo?.dispose();
    };
  }, [slopedGeo]);

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

  const outlinePos = s.selectionPosition ?? s.position;
  const useSlopedOutline = slopedGeo != null;

  return (
    <group>
      {texturedMaterials && !slopedGeo ? (
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
          geometry={slopedGeo ?? undefined}
        >
          {!slopedGeo ? (
            <>
              <boxGeometry args={[s.width, s.height, s.depth]} />
              <meshStandardMaterial
                color={preset.color}
                roughness={preset.roughness}
                metalness={preset.metalness}
                side={DoubleSide}
              />
            </>
          ) : (
            <meshStandardMaterial
              color={preset.color}
              roughness={preset.roughness}
              metalness={preset.metalness}
              /** Замкнутая призма по толщине листа; DoubleSide — обе большие грани видны с любого ракурса (FrontSide отсекал «тыл» при несовпадении нормали/камеры). */
              side={DoubleSide}
              depthWrite
              depthTest
            />
          )}
        </mesh>
      )}
      {shellSelected ? (
        useSlopedOutline && slopedGeo ? (
          <SlopedWallEdgeOutline
            geometry={slopedGeo}
            position={s.position}
            rotationY={s.rotationY}
            color={SELECTION_BOX_OUTLINE_3D.color}
            opacity={SELECTION_BOX_OUTLINE_3D.opacity}
          />
        ) : (
          <ExactBoxSelectionOutline
            width={s.width}
            height={s.height}
            depth={s.depth}
            position={outlinePos}
            rotationY={s.rotationY}
            color={SELECTION_BOX_OUTLINE_3D.color}
            opacity={SELECTION_BOX_OUTLINE_3D.opacity}
          />
        )
      ) : null}
      {hoverThis ? (
        useSlopedOutline && slopedGeo ? (
          <SlopedWallEdgeOutline
            geometry={slopedGeo}
            position={s.position}
            rotationY={s.rotationY}
            color={HOVER_BOX_OUTLINE_3D.color}
            opacity={HOVER_BOX_OUTLINE_3D.opacity}
          />
        ) : (
          <ExactBoxSelectionOutline
            width={s.width}
            height={s.height}
            depth={s.depth}
            position={outlinePos}
            rotationY={s.rotationY}
            color={HOVER_BOX_OUTLINE_3D.color}
            opacity={HOVER_BOX_OUTLINE_3D.opacity}
          />
        )
      ) : null}
      {texLocked ? (
        useSlopedOutline && slopedGeo ? (
          <SlopedWallEdgeOutline
            geometry={slopedGeo}
            position={s.position}
            rotationY={s.rotationY}
            color={TEXTURE_TOOL_LOCKED_OUTLINE_3D.color}
            opacity={TEXTURE_TOOL_LOCKED_OUTLINE_3D.opacity}
          />
        ) : (
          <ExactBoxSelectionOutline
            width={s.width}
            height={s.height}
            depth={s.depth}
            position={outlinePos}
            rotationY={s.rotationY}
            color={TEXTURE_TOOL_LOCKED_OUTLINE_3D.color}
            opacity={TEXTURE_TOOL_LOCKED_OUTLINE_3D.opacity}
          />
        )
      ) : null}
      {texHover ? (
        useSlopedOutline && slopedGeo ? (
          <SlopedWallEdgeOutline
            geometry={slopedGeo}
            position={s.position}
            rotationY={s.rotationY}
            color={TEXTURE_TOOL_HOVER_OUTLINE_3D.color}
            opacity={TEXTURE_TOOL_HOVER_OUTLINE_3D.opacity}
          />
        ) : (
          <ExactBoxSelectionOutline
            width={s.width}
            height={s.height}
            depth={s.depth}
            position={outlinePos}
            rotationY={s.rotationY}
            color={TEXTURE_TOOL_HOVER_OUTLINE_3D.color}
            opacity={TEXTURE_TOOL_HOVER_OUTLINE_3D.opacity}
          />
        )
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
