import { OrbitControls, Grid } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import { useAppStore } from "@/store/useAppStore";

import { ProjectCalculationMeshes } from "./ProjectCalculationMeshes";
import { ProjectWalls } from "./ProjectWalls";
import { useEditor3dThemeColors } from "./useEditor3dThemeColors";

function SceneFromProject() {
  const project = useAppStore((s) => s.currentProject);
  const showCalc = project.viewState.show3dCalculation !== false;
  return (
    <>
      <ProjectWalls project={project} />
      <ProjectCalculationMeshes project={project} visible={showCalc} />
    </>
  );
}

export function Editor3DWorkspace() {
  const showLayers = useAppStore((s) => s.currentProject.viewState.show3dProfileLayers);
  const setShow3dProfileLayers = useAppStore((s) => s.setShow3dProfileLayers);
  const showCalc = useAppStore((s) => s.currentProject.viewState.show3dCalculation);
  const setShow3dCalculation = useAppStore((s) => s.setShow3dCalculation);
  const theme3d = useEditor3dThemeColors();

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0 }}>
      <label
        style={{
          position: "absolute",
          zIndex: 1,
          top: 10,
          left: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid var(--color-border-subtle)",
          background: theme3d.overlayBg,
          color: theme3d.overlayText,
          fontSize: 13,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={showLayers}
          onChange={(e) => setShow3dProfileLayers(e.target.checked)}
        />
        Слои профиля в 3D
      </label>
      <label
        style={{
          position: "absolute",
          zIndex: 1,
          top: 48,
          left: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid var(--color-border-subtle)",
          background: theme3d.overlayBg,
          color: theme3d.overlayText,
          fontSize: 13,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={showCalc !== false}
          onChange={(e) => setShow3dCalculation(e.target.checked)}
        />
        Расчёт в 3D (SIP и доски)
      </label>
      <Canvas
        shadows
        camera={{ position: [12, 9, 12], fov: 45, near: 0.1, far: 500 }}
        style={{ width: "100%", height: "100%", minHeight: 0 }}
      >
        <color attach="background" args={[theme3d.bg]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[14, 18, 12]} intensity={1.05} castShadow />
        <Grid
          infiniteGrid
          fadeDistance={120}
          sectionSize={1}
          cellSize={0.2}
          sectionColor={theme3d.section}
          cellColor={theme3d.cell}
          position={[0, 0, 0]}
        />
        <axesHelper args={[4]} />
        <SceneFromProject />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </Canvas>
    </div>
  );
}
